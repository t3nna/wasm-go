export interface ParseNumberListResult {
  numbers: number[]
  error: string | null
}

export function parseNumberList(rawInput: string): ParseNumberListResult {
  const trimmed = rawInput.trim()
  if (trimmed.length === 0) {
    return { numbers: [], error: 'Please enter at least one number.' }
  }

  const tokens = trimmed
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)

  if (tokens.length === 0) {
    return { numbers: [], error: 'Please enter at least one number.' }
  }

  const parsed: number[] = []
  for (const token of tokens) {
    const value = Number(token)
    if (Number.isNaN(value)) {
      return {
        numbers: [],
        error: `Invalid number token: "${token}"`,
      }
    }
    if (!Number.isFinite(value)) {
      return {
        numbers: [],
        error: `Number must be finite: "${token}"`,
      }
    }
    parsed.push(value)
  }

  return { numbers: parsed, error: null }
}
