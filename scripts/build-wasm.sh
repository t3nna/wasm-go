#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE_DIR="${ROOT_DIR}/engine"
WEB_PUBLIC_DIR="${ROOT_DIR}/web/public"

mkdir -p "${WEB_PUBLIC_DIR}"

GO_ROOT="$(go env GOROOT)"
WASM_EXEC_SRC=""

if [[ -f "${GO_ROOT}/lib/wasm/wasm_exec.js" ]]; then
  WASM_EXEC_SRC="${GO_ROOT}/lib/wasm/wasm_exec.js"
elif [[ -f "${GO_ROOT}/misc/wasm/wasm_exec.js" ]]; then
  WASM_EXEC_SRC="${GO_ROOT}/misc/wasm/wasm_exec.js"
else
  echo "Unable to locate wasm_exec.js under ${GO_ROOT}" >&2
  exit 1
fi

(cd "${ENGINE_DIR}" && GOOS=js GOARCH=wasm go build -o "${WEB_PUBLIC_DIR}/engine.wasm" .)
cp "${WASM_EXEC_SRC}" "${WEB_PUBLIC_DIR}/wasm_exec.js"

echo "Built ${WEB_PUBLIC_DIR}/engine.wasm"
echo "Copied ${WEB_PUBLIC_DIR}/wasm_exec.js"
