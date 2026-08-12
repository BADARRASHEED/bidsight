#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PID=""
FRONTEND_PID=""
SHUTTING_DOWN=0
BACKEND_PYTHON=""
NEXT_ENTRYPOINT="$FRONTEND_DIR/node_modules/next/dist/bin/next"

fail() {
  printf 'BidSight could not start: %s\n' "$1" >&2
  exit 1
}

stop_process() {
  local pid="$1"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

shutdown() {
  local exit_code="${1:-0}"

  if [[ "$SHUTTING_DOWN" -eq 1 ]]; then
    return
  fi
  SHUTTING_DOWN=1

  printf '\nStopping BidSight...\n'
  stop_process "$FRONTEND_PID"
  stop_process "$BACKEND_PID"

  [[ -z "$FRONTEND_PID" ]] || wait "$FRONTEND_PID" 2>/dev/null || true
  [[ -z "$BACKEND_PID" ]] || wait "$BACKEND_PID" 2>/dev/null || true

  printf 'BidSight stopped.\n'
  exit "$exit_code"
}

trap 'shutdown 130' INT TERM

[[ -f "$BACKEND_DIR/pyproject.toml" ]] || fail "backend/pyproject.toml was not found."
[[ -f "$FRONTEND_DIR/package.json" ]] || fail "frontend/package.json was not found."

command -v node >/dev/null 2>&1 || fail "Node.js is not available. Install Node.js and run 'pnpm install' inside frontend once."

if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"
elif [[ -f "$BACKEND_DIR/.venv/Scripts/python.exe" ]]; then
  BACKEND_PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
else
  fail "backend/.venv is missing. Run 'uv sync' inside backend once."
fi

[[ -d "$FRONTEND_DIR/node_modules" ]] || fail "frontend/node_modules is missing. Run 'pnpm install' inside frontend once."
[[ -f "$NEXT_ENTRYPOINT" ]] || fail "Next.js is not installed. Run 'pnpm install' inside frontend once."

printf 'Starting BidSight...\n'
printf 'Backend:  http://localhost:8000\n'
printf 'API docs: http://localhost:8000/docs\n'
printf 'Frontend: http://localhost:3000\n'
printf 'Press Ctrl+C to stop both services.\n\n'

(
  cd "$BACKEND_DIR"
  exec "$BACKEND_PYTHON" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

(
  cd "$FRONTEND_DIR"
  exec node "$NEXT_ENTRYPOINT" dev
) &
FRONTEND_PID=$!

set +e
wait -n "$BACKEND_PID" "$FRONTEND_PID"
EXIT_CODE=$?
set -e

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  printf '\nThe backend process stopped unexpectedly.\n' >&2
elif ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  printf '\nThe frontend process stopped unexpectedly.\n' >&2
fi

shutdown "$EXIT_CODE"
