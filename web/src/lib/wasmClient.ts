import type {
  DotProductResult,
  DotProductRequest,
  DotProductSuccessResponse,
  VectorStatsResult,
  VectorStatsRequest,
  VectorStatsSuccessResponse,
  WasmOperation,
  WasmRequest,
  WasmResponse,
} from './wasmProtocol'

type PendingRequest = {
  op: WasmOperation
  resolve: (value: VectorStatsResult | DotProductResult) => void
  reject: (error: Error) => void
  timeoutHandle: ReturnType<typeof setTimeout>
}

export interface WorkerLike {
  onmessage: ((event: MessageEvent<WasmResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: WasmRequest): void
  terminate(): void
}

type WorkerFactory = () => WorkerLike

function createWorker(): WorkerLike {
  return new Worker(new URL('../workers/wasmWorker.ts', import.meta.url), {
    type: 'module',
  })
}

export class WasmClient {
  private readonly worker: WorkerLike
  private readonly pending = new Map<number, PendingRequest>()
  private nextId = 1

  constructor(workerFactory: WorkerFactory = createWorker) {
    this.worker = workerFactory()
    this.worker.onmessage = this.handleMessage
    this.worker.onerror = this.handleWorkerError
  }

  async vectorStats(
    numbers: number[],
    timeoutMs = 8000,
  ): Promise<VectorStatsResult> {
    const requestId = this.nextId++
    const request: VectorStatsRequest = {
      id: requestId,
      op: 'vectorStats',
      payload: {
        numbers,
      },
    }

    return this.sendRequest<VectorStatsSuccessResponse>(request, timeoutMs)
  }

  async dotProduct(
    a: number[],
    b: number[],
    timeoutMs = 8000,
  ): Promise<DotProductResult> {
    const requestId = this.nextId++
    const request: DotProductRequest = {
      id: requestId,
      op: 'dotProduct',
      payload: { a, b },
    }

    return this.sendRequest<DotProductSuccessResponse>(request, timeoutMs)
  }

  dispose(): void {
    for (const [requestId, pendingRequest] of this.pending) {
      clearTimeout(pendingRequest.timeoutHandle)
      pendingRequest.reject(new Error('WASM client disposed'))
      this.pending.delete(requestId)
    }
    this.worker.terminate()
  }

  private readonly handleMessage = (event: MessageEvent<WasmResponse>): void => {
    const response = event.data
    const pendingRequest = this.pending.get(response.id)
    if (!pendingRequest) {
      return
    }

    clearTimeout(pendingRequest.timeoutHandle)
    this.pending.delete(response.id)

    if (response.ok) {
      if (response.op !== pendingRequest.op) {
        pendingRequest.reject(
          new Error(
            `Mismatched response operation. Expected ${pendingRequest.op}, got ${response.op}`,
          ),
        )
        return
      }
      pendingRequest.resolve(response.data)
      return
    }

    pendingRequest.reject(new Error(response.error))
  }

  private readonly handleWorkerError = (): void => {
    for (const [requestId, pendingRequest] of this.pending) {
      clearTimeout(pendingRequest.timeoutHandle)
      pendingRequest.reject(new Error('WASM worker crashed or failed to load'))
      this.pending.delete(requestId)
    }
  }

  private sendRequest<TSuccess extends { data: unknown }>(
    request: WasmRequest,
    timeoutMs: number,
  ): Promise<TSuccess['data']> {
    return new Promise<TSuccess['data']>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pending.delete(request.id)
        reject(new Error(`WASM request timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pending.set(request.id, {
        op: request.op,
        resolve: resolve as PendingRequest['resolve'],
        reject,
        timeoutHandle,
      })

      this.worker.postMessage(request)
    })
  }
}

let defaultClient: WasmClient | null = null

export function computeVectorStats(
  numbers: number[],
  timeoutMs = 8000,
): Promise<VectorStatsResult> {
  if (!defaultClient) {
    defaultClient = new WasmClient()
  }
  return defaultClient.vectorStats(numbers, timeoutMs)
}

export function computeDotProduct(
  a: number[],
  b: number[],
  timeoutMs = 8000,
): Promise<DotProductResult> {
  if (!defaultClient) {
    defaultClient = new WasmClient()
  }
  return defaultClient.dotProduct(a, b, timeoutMs)
}
