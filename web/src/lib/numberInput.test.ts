import { describe, expect, it } from 'vitest'
import { parseNumberList } from './numberInput'

describe('parseNumberList', () => {
  it('parses comma-separated numbers', () => {
    const result = parseNumberList('1, 2, 3.5')
    expect(result.error).toBeNull()
    expect(result.numbers).toEqual([1, 2, 3.5])
  })

  it('parses mixed whitespace and commas', () => {
    const result = parseNumberList('1  2,\n3\t4')
    expect(result.error).toBeNull()
    expect(result.numbers).toEqual([1, 2, 3, 4])
  })

  it('returns error for empty input', () => {
    const result = parseNumberList('   ')
    expect(result.error).toBe('Please enter at least one number.')
  })

  it('returns error for invalid tokens', () => {
    const result = parseNumberList('1, nope, 3')
    expect(result.error).toBe('Invalid number token: "nope"')
    expect(result.numbers).toEqual([])
  })

  it('returns error for non-finite values', () => {
    const result = parseNumberList('1, Infinity')
    expect(result.error).toBe('Number must be finite: "Infinity"')
    expect(result.numbers).toEqual([])
  })
})
