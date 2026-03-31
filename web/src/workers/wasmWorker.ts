import type {
  VectorStatsResult,
  WasmErrorResponse,
  WasmRequest,
  WasmSuccessResponse,
} from '../lib/wasmProtocol'

interface GoRuntime {
  importObject: WebAssembly.Imports
  run(instance: WebAssembly.Instance): Promise<void> | void
}

interface GoWorkerScope {
  Go: new () => GoRuntime
  vectorStats?: (numbersJson: string) => string
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

async function waitForGlobalFunction(timeoutMs: number): Promise<void> {
  const started = Date.now()
  while (typeof workerScope.vectorStats !== 'function') {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Timed out waiting for Go vectorStats export')
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
    await waitForGlobalFunction(2000)
  })()

  return wasmReadyPromise
}

function makeErrorResponse(id: number, error: unknown): WasmErrorResponse {
  const message = error instanceof Error ? error.message : String(error)
  return {
    id,
    ok: false,
    error: message,
  }
}

function invokeVectorStats(numbers: number[]): VectorStatsResult {
  if (typeof workerScope.vectorStats !== 'function') {
    throw new Error('Go vectorStats function is unavailable')
  }

  const rawResult = workerScope.vectorStats(JSON.stringify({ numbers }))
  const parsed = JSON.parse(rawResult) as
    | VectorStatsResult
    | { error: string }

  if ('error' in parsed) {
    throw new Error(parsed.error)
  }

  return parsed
}

self.onmessage = async (event: MessageEvent<WasmRequest>) => {
  const request = event.data

  try {
    await ensureWasmReady()
    const data = invokeVectorStats(request.payload.numbers)
    const response: WasmSuccessResponse = {
      id: request.id,
      ok: true,
      data,
    }
    self.postMessage(response)
  } catch (error) {
    self.postMessage(makeErrorResponse(request.id, error))
  }
}
