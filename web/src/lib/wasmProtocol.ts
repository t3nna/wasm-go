export type WasmOperation = 'vectorStats'

export interface VectorStatsPayload {
  numbers: number[]
}

export interface VectorStatsResult {
  sum: number
  mean: number
  stddev: number
  count: number
}

export interface WasmRequest {
  id: number
  op: WasmOperation
  payload: VectorStatsPayload
}

export interface WasmSuccessResponse {
  id: number
  ok: true
  data: VectorStatsResult
}

export interface WasmErrorResponse {
  id: number
  ok: false
  error: string
}

export type WasmResponse = WasmSuccessResponse | WasmErrorResponse
