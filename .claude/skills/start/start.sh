#!/usr/bin/env bash
# Deterministically start Expenso's backend (Go) and frontend (CRA) dev servers.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_DIR="$ROOT/.claude/skills/start/logs"
mkdir -p "$LOG_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"

port_in_use() {
  lsof -i ":$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

wait_for_port() {
  local port="$1" name="$2" timeout="$3" waited=0
  while ! port_in_use "$port"; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$timeout" ]; then
      echo "Timed out waiting for $name on port $port. Check $LOG_DIR." >&2
      exit 1
    fi
  done
}

if ! nc -z localhost 5432 2>/dev/null; then
  echo "PostgreSQL is not reachable on localhost:5432. Start it before running this script." >&2
  exit 1
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "Missing backend/.env. Copy backend/.env.example and set ANTHROPIC_API_KEY." >&2
  exit 1
fi

if port_in_use 8080; then
  echo "Backend already running on port 8080, skipping."
else
  echo "Starting backend..."
  (cd "$ROOT/backend" && nohup go run cmd/server/main.go >"$BACKEND_LOG" 2>&1 &
   echo $! >"$BACKEND_PID_FILE")
  wait_for_port 8080 backend 60
  echo "Backend up at http://localhost:8080 (log: $BACKEND_LOG)"
fi

if port_in_use 3000; then
  echo "Frontend already running on port 3000, skipping."
else
  echo "Starting frontend..."
  (cd "$ROOT/frontend" && BROWSER=none nohup npm start >"$FRONTEND_LOG" 2>&1 &
   echo $! >"$FRONTEND_PID_FILE")
  wait_for_port 3000 frontend 120
  echo "Frontend up at http://localhost:3000 (log: $FRONTEND_LOG)"
fi
