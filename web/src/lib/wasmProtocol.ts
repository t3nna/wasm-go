export type WasmOperation = 'vectorStats' | 'dotProduct'

export interface VectorStatsPayload {
  numbers: number[]
}

export interface DotProductPayload {
  a: number[]
  b: number[]
}

export interface VectorStatsResult {
  sum: number
  mean: number
  stddev: number
  count: number
}

export interface DotProductResult {
  value: number
  length: number
}

export interface VectorStatsRequest {
  id: number
  op: 'vectorStats'
  payload: VectorStatsPayload
}

export interface DotProductRequest {
  id: number
  op: 'dotProduct'
  payload: DotProductPayload
}

export type WasmRequest = VectorStatsRequest | DotProductRequest

export interface VectorStatsSuccessResponse {
  id: number
  op: 'vectorStats'
  ok: true
  data: VectorStatsResult
}

export interface DotProductSuccessResponse {
  id: number
  op: 'dotProduct'
  ok: true
  data: DotProductResult
}

export type WasmSuccessResponse =
  | VectorStatsSuccessResponse
  | DotProductSuccessResponse

export interface WasmErrorResponse {
  id: number
  op?: WasmOperation
  ok: false
  error: string
}

export type WasmResponse = WasmSuccessResponse | WasmErrorResponse
