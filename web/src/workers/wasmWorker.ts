import type {
  DotProductRequest,
  DotProductResult,
  DotProductSuccessResponse,
  VectorStatsRequest,
  VectorStatsResult,
  VectorStatsSuccessResponse,
  WasmErrorResponse,
  WasmOperation,
  WasmRequest,
} from '../lib/wasmProtocol'

interface GoRuntime {
  importObject: WebAssembly.Imports
  run(instance: WebAssembly.Instance): Promise<void> | void
}

interface GoWorkerScope {
  Go: new () => GoRuntime
  vectorStats?: (numbersJson: string) => string
  dotProduct?: (vectorsJson: string) => string
  postMessage(message: unknown): void
}

const workerScope = self as unknown as GoWorkerScope
let wasmReadyPromise: Promise<void> | null = null

async function loadGoRuntime(): Promise<void> {
  if (typeof workerScope.Go === 'function') {
    return
  }

  const response = await fetch('/wasm_exec.js')
  if (!response.ok) {
    throw new Error(`Unable to fetch wasm_exec.js (status ${response.status})`)
  }

  const source = await response.text()
  ;(0, eval)(source)

  if (typeof workerScope.Go !== 'function') {
    throw new Error('Go runtime did not register global Go constructor')
  }
}

async function waitForGlobalFunctions(timeoutMs: number): Promise<void> {
  const started = Date.now()
  while (
    typeof workerScope.vectorStats !== 'function' ||
    typeof workerScope.dotProduct !== 'function'
  ) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Timed out waiting for Go exported functions')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

async function ensureWasmReady(): Promise<void> {
  if (wasmReadyPromise) {
    return wasmReadyPromise
  }

  wasmReadyPromise = (async () => {
    await loadGoRuntime()

    const go = new workerScope.Go()
    const response = await fetch('/engine.wasm')
    if (!response.ok) {
      throw new Error(`Unable to fetch engine.wasm (status ${response.status})`)
    }

    const bytes = await response.arrayBuffer()
    const module = await WebAssembly.instantiate(bytes, go.importObject)
    void go.run(module.instance)
    await waitForGlobalFunctions(2000)
  })()

  return wasmReadyPromise
}

function makeErrorResponse(
  id: number,
  error: unknown,
  op?: WasmOperation,
): WasmErrorResponse {
  const message = error instanceof Error ? error.message : String(error)
  return {
    id,
    op,
    ok: false,
    error: message,
  }
}

function parseGoResponse<T>(rawResult: string): T {
  const parsed = JSON.parse(rawResult) as unknown
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'error' in parsed &&
    typeof parsed.error === 'string'
  ) {
    throw new Error(parsed.error)
  }
  return parsed as T
}

function invokeVectorStats(numbers: number[]): VectorStatsResult {
  if (typeof workerScope.vectorStats !== 'function') {
    throw new Error('Go vectorStats function is unavailable')
  }

  const rawResult = workerScope.vectorStats(JSON.stringify({ numbers }))
  return parseGoResponse<VectorStatsResult>(rawResult)
}

function invokeDotProduct(a: number[], b: number[]): DotProductResult {
  if (typeof workerScope.dotProduct !== 'function') {
    throw new Error('Go dotProduct function is unavailable')
  }

  const rawResult = workerScope.dotProduct(JSON.stringify({ a, b }))
  return parseGoResponse<DotProductResult>(rawResult)
}

self.onmessage = async (
  event: MessageEvent<WasmRequest | { id: number; op: string; payload: unknown }>,
) => {
  const request = event.data
  const requestId = typeof request.id === 'number' ? request.id : -1

  try {
    await ensureWasmReady()
    switch (request.op) {
      case 'vectorStats': {
        const typedRequest = request as VectorStatsRequest
        const data = invokeVectorStats(typedRequest.payload.numbers)
        const response: VectorStatsSuccessResponse = {
          id: requestId,
          op: 'vectorStats',
          ok: true,
          data,
        }
        self.postMessage(response)
        break
      }
      case 'dotProduct': {
        const typedRequest = request as DotProductRequest
        const data = invokeDotProduct(
          typedRequest.payload.a,
          typedRequest.payload.b,
        )
        const response: DotProductSuccessResponse = {
          id: requestId,
          op: 'dotProduct',
          ok: true,
          data,
        }
        self.postMessage(response)
        break
      }
      default: {
        self.postMessage(
          makeErrorResponse(requestId, new Error('Unsupported operation'), undefined),
        )
      }
    }
  } catch (error) {
    self.postMessage(makeErrorResponse(requestId, error, undefined))
  }
}
