# React + Go WASM Template

Template project that embeds a Go computation engine into a React app with
WebAssembly and a Web Worker.

## Structure

- `engine/`: Go code compiled to `engine.wasm`
- `web/`: Vite + React + TypeScript app and worker/client bridge
- `scripts/build-wasm.sh`: compiles Go WASM and copies `wasm_exec.js`

## Prerequisites

- Go `1.25+`
- Node `20+` (tested with Node `24`)
- npm

## Install

```bash
cd web
npm install
```

## Development

```bash
cd web
npm run dev:all
```

`dev:all` compiles Go to WASM and starts Vite.

## Build

```bash
cd web
npm run build
```

This runs:

1. `npm run build:wasm`
2. Type-checking and Vite production build

## Test

```bash
cd web
npm run test
```

## Bridge Contract

The worker receives:

```ts
{ id, op: 'vectorStats', payload: { numbers: number[] } }
{ id, op: 'dotProduct', payload: { a: number[]; b: number[] } }
```

The worker responds with either:

```ts
{ id, op: 'vectorStats', ok: true, data: { sum, mean, stddev, count } }
{ id, op: 'dotProduct', ok: true, data: { value, length } }
```

or:

```ts
{ id, ok: false, error: string }
```

## Troubleshooting

- `Unable to fetch wasm_exec.js`: run `npm run build:wasm` and ensure Go is
  installed.
- `Unable to fetch engine.wasm`: confirm `web/public/engine.wasm` exists and
  rerun the build script.
- `Timed out waiting for Go exported functions`: rebuild WASM and reload the app.
