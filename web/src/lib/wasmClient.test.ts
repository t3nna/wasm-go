import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WasmRequest, WasmResponse } from './wasmProtocol'
import { WasmClient, type WorkerLike } from './wasmClient'

class MockWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WasmResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly messages: WasmRequest[] = []
  terminated = false

  postMessage(message: WasmRequest): void {
    this.messages.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  emitResponse(response: WasmResponse): void {
    this.onmessage?.({
      data: response,
    } as MessageEvent<WasmResponse>)
  }
}

describe('WasmClient', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('matches out-of-order responses by request id', async () => {
    const worker = new MockWorker()
    const client = new WasmClient(() => worker)

    const first = client.vectorStats([1, 2, 3])
    const second = client.vectorStats([2, 2, 2])

    expect(worker.messages).toHaveLength(2)

    const firstId = worker.messages[0].id
    const secondId = worker.messages[1].id

    worker.emitResponse({
      id: secondId,
      ok: true,
      data: { sum: 6, mean: 2, stddev: 0, count: 3 },
    })
    worker.emitResponse({
      id: firstId,
      ok: true,
      data: {
        sum: 6,
        mean: 2,
        stddev: 0.816496580927726,
        count: 3,
      },
    })

    await expect(second).resolves.toEqual({
      sum: 6,
      mean: 2,
      stddev: 0,
      count: 3,
    })
    await expect(first).resolves.toEqual({
      sum: 6,
      mean: 2,
      stddev: 0.816496580927726,
      count: 3,
    })

    client.dispose()
  })

  it('propagates worker error responses', async () => {
    const worker = new MockWorker()
    const client = new WasmClient(() => worker)
    const pending = client.vectorStats([1, 2, 3])
    const requestId = worker.messages[0].id

    worker.emitResponse({
      id: requestId,
      ok: false,
      error: 'engine exploded',
    })

    await expect(pending).rejects.toThrow('engine exploded')
    client.dispose()
  })

  it('times out requests', async () => {
    vi.useFakeTimers()
    const worker = new MockWorker()
    const client = new WasmClient(() => worker)
    const pending = client
      .vectorStats([1], 50)
      .then(() => null)
      .catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(60)
    const error = await pending
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('WASM request timed out after 50ms')
    client.dispose()
  })
})
