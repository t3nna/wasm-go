import { useMemo, useState } from 'react'
import './App.css'
import { parseNumberList } from './lib/numberInput'
import { computeDotProduct, computeVectorStats } from './lib/wasmClient'
import type { DotProductResult, VectorStatsResult } from './lib/wasmProtocol'

function App() {
  const [statsInputValue, setStatsInputValue] = useState('1, 2, 3, 4')
  const [statsResult, setStatsResult] = useState<VectorStatsResult | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsRunning, setStatsRunning] = useState(false)

  const [dotAInput, setDotAInput] = useState('1, 2, 3')
  const [dotBInput, setDotBInput] = useState('4, 5, 6')
  const [dotResult, setDotResult] = useState<DotProductResult | null>(null)
  const [dotError, setDotError] = useState<string | null>(null)
  const [dotRunning, setDotRunning] = useState(false)

  const statsPreview = useMemo(() => {
    const parsed = parseNumberList(statsInputValue)
    if (parsed.error) {
      return parsed.error
    }
    return `${parsed.numbers.length} value(s) ready`
  }, [statsInputValue])

  const dotPreview = useMemo(() => {
    const parsedA = parseNumberList(dotAInput)
    const parsedB = parseNumberList(dotBInput)
    if (parsedA.error) {
      return `Vector A: ${parsedA.error}`
    }
    if (parsedB.error) {
      return `Vector B: ${parsedB.error}`
    }
    if (parsedA.numbers.length !== parsedB.numbers.length) {
      return `Length mismatch (${parsedA.numbers.length} vs ${parsedB.numbers.length})`
    }
    return `${parsedA.numbers.length} pair(s) ready`
  }, [dotAInput, dotBInput])

  async function handleVectorStats(): Promise<void> {
    const parsed = parseNumberList(statsInputValue)
    if (parsed.error) {
      setStatsResult(null)
      setStatsError(parsed.error)
      return
    }

    try {
      setStatsRunning(true)
      setStatsError(null)
      const stats = await computeVectorStats(parsed.numbers)
      setStatsResult(stats)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : String(caughtError)
      setStatsResult(null)
      setStatsError(message)
    } finally {
      setStatsRunning(false)
    }
  }

  async function handleDotProduct(): Promise<void> {
    const parsedA = parseNumberList(dotAInput)
    if (parsedA.error) {
      setDotResult(null)
      setDotError(`Vector A: ${parsedA.error}`)
      return
    }

    const parsedB = parseNumberList(dotBInput)
    if (parsedB.error) {
      setDotResult(null)
      setDotError(`Vector B: ${parsedB.error}`)
      return
    }

    if (parsedA.numbers.length !== parsedB.numbers.length) {
      setDotResult(null)
      setDotError('Vectors must have the same length.')
      return
    }

    try {
      setDotRunning(true)
      setDotError(null)
      const result = await computeDotProduct(parsedA.numbers, parsedB.numbers)
      setDotResult(result)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : String(caughtError)
      setDotResult(null)
      setDotError(message)
    } finally {
      setDotRunning(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">React + Go WASM Template</p>
        <h1>Run Go calculations from React without freezing the UI</h1>
        <p className="subtitle">
          The Go engine runs inside a Web Worker via WebAssembly. Paste numbers,
          run vector stats, and inspect the result payload.
        </p>
      </header>

      <section className="panel">
        <label htmlFor="numbers" className="field-label">
          Vector Stats input (comma or whitespace separated)
        </label>
        <textarea
          id="numbers"
          className="numbers-input"
          rows={5}
          value={statsInputValue}
          onChange={(event) => setStatsInputValue(event.target.value)}
          placeholder="e.g. 10, 15, 42"
        />
        <div className="row">
          <span className="hint">{statsPreview}</span>
          <button
            type="button"
            className="run-button"
            onClick={handleVectorStats}
            disabled={statsRunning}
          >
            {statsRunning ? 'Running in Go...' : 'Run Vector Stats'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Vector Stats Result</h2>

        {statsError && (
          <p role="alert" className="message error">
            {statsError}
          </p>
        )}

        {!statsError && !statsResult && (
          <p className="message muted">Run a calculation to see results here.</p>
        )}

        {statsResult && (
          <dl className="stats-grid">
            <div>
              <dt>Count</dt>
              <dd>{statsResult.count}</dd>
            </div>
            <div>
              <dt>Sum</dt>
              <dd>{statsResult.sum}</dd>
            </div>
            <div>
              <dt>Mean</dt>
              <dd>{statsResult.mean}</dd>
            </div>
            <div>
              <dt>Stddev</dt>
              <dd>{statsResult.stddev}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="panel">
        <h2>Dot Product</h2>
        <div className="vector-grid">
          <div>
            <label htmlFor="dot-a" className="field-label">
              Vector A
            </label>
            <textarea
              id="dot-a"
              className="numbers-input"
              rows={4}
              value={dotAInput}
              onChange={(event) => setDotAInput(event.target.value)}
              placeholder="e.g. 1, 2, 3"
            />
          </div>
          <div>
            <label htmlFor="dot-b" className="field-label">
              Vector B
            </label>
            <textarea
              id="dot-b"
              className="numbers-input"
              rows={4}
              value={dotBInput}
              onChange={(event) => setDotBInput(event.target.value)}
              placeholder="e.g. 4, 5, 6"
            />
          </div>
        </div>
        <div className="row">
          <span className="hint">{dotPreview}</span>
          <button
            type="button"
            className="run-button"
            onClick={handleDotProduct}
            disabled={dotRunning}
          >
            {dotRunning ? 'Running in Go...' : 'Run Dot Product'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Dot Product Result</h2>
        {dotError && (
          <p role="alert" className="message error">
            {dotError}
          </p>
        )}
        {!dotError && !dotResult && (
          <p className="message muted">Run dot product to see results here.</p>
        )}
        {dotResult && (
          <dl className="stats-grid">
            <div>
              <dt>Value</dt>
              <dd>{dotResult.value}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{dotResult.length}</dd>
            </div>
          </dl>
        )}
      </section>

      <footer className="footnote">
        Worker API shapes:
        <code>{` { id, op: "vectorStats", payload: { numbers } } `}</code>
        <code>{` { id, op: "dotProduct", payload: { a, b } } `}</code>
      </footer>
    </main>
  )
}

export default App
