import { useMemo, useState } from 'react'
import './App.css'
import { parseNumberList } from './lib/numberInput'
import { computeVectorStats } from './lib/wasmClient'
import type { VectorStatsResult } from './lib/wasmProtocol'

function App() {
  const [inputValue, setInputValue] = useState('1, 2, 3, 4')
  const [result, setResult] = useState<VectorStatsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const parsedPreview = useMemo(() => {
    const parsed = parseNumberList(inputValue)
    if (parsed.error) {
      return parsed.error
    }
    return `${parsed.numbers.length} value(s) ready`
  }, [inputValue])

  async function handleCompute(): Promise<void> {
    const parsed = parseNumberList(inputValue)
    if (parsed.error) {
      setResult(null)
      setError(parsed.error)
      return
    }

    try {
      setIsRunning(true)
      setError(null)
      const stats = await computeVectorStats(parsed.numbers)
      setResult(stats)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : String(caughtError)
      setResult(null)
      setError(message)
    } finally {
      setIsRunning(false)
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
          Number input (comma or whitespace separated)
        </label>
        <textarea
          id="numbers"
          className="numbers-input"
          rows={5}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="e.g. 10, 15, 42"
        />
        <div className="row">
          <span className="hint">{parsedPreview}</span>
          <button
            type="button"
            className="run-button"
            onClick={handleCompute}
            disabled={isRunning}
          >
            {isRunning ? 'Running in Go...' : 'Run in Go WASM'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Result</h2>

        {error && (
          <p role="alert" className="message error">
            {error}
          </p>
        )}

        {!error && !result && (
          <p className="message muted">Run a calculation to see results here.</p>
        )}

        {result && (
          <dl className="stats-grid">
            <div>
              <dt>Count</dt>
              <dd>{result.count}</dd>
            </div>
            <div>
              <dt>Sum</dt>
              <dd>{result.sum}</dd>
            </div>
            <div>
              <dt>Mean</dt>
              <dd>{result.mean}</dd>
            </div>
            <div>
              <dt>Stddev</dt>
              <dd>{result.stddev}</dd>
            </div>
          </dl>
        )}
      </section>

      <footer className="footnote">
        Worker API request shape:
        <code>{` { id, op: "vectorStats", payload: { numbers } } `}</code>
      </footer>
    </main>
  )
}

export default App
