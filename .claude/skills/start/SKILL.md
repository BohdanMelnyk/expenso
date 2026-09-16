---
name: start
description: Use when the user asks to start, run, launch, or spin up the Expenso backend and/or frontend dev servers locally.
---

# start

## Overview

Starts Expenso's Go backend (port 8080) and React frontend (port 3000) with a single deterministic script, instead of ad-hoc `go run` / `npm start` calls. Idempotent: already-running servers on those ports are detected and left alone.

## When to Use

- "start the app", "run backend and frontend", "spin up the servers", "launch expenso locally"

## Usage

```bash
.claude/skills/start/start.sh
```

Run from anywhere in the repo; the script resolves the project root itself.

What it does, in order:
1. Verifies PostgreSQL is reachable on `localhost:5432` — fails fast with a clear message if not.
2. Verifies `backend/.env` exists — fails fast if the first-time setup step was skipped.
3. If port 8080 is free, starts `go run cmd/server/main.go` in `backend/`, backgrounded via `nohup`, and waits (up to 60s) for the port to come up.
4. If port 3000 is free, starts `npm start` in `frontend/` (with `BROWSER=none` so it never tries to open a browser tab), backgrounded via `nohup`, and waits (up to 120s) for the port to come up.
5. If a port is already occupied, that server is assumed already running and is skipped — safe to re-run.

Logs and PID files land in `.claude/skills/start/logs/` (`backend.log`, `frontend.log`, `backend.pid`, `frontend.pid`) — check the log file if a wait times out.

## Common Mistakes

- Running `go run` / `npm start` manually in two terminals instead of this script — works, but isn't deterministic and won't detect already-running servers.
- Forgetting `backend/.env` — the script checks for it explicitly rather than letting the Go process fail with a less obvious error.
