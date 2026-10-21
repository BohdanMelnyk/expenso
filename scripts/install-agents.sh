#!/usr/bin/env bash
# Installs (or with --remove, removes) two per-user launchd agents that start Expenso when you log in and restart
# each part if it exits (KeepAlive):
#   com.bogy.expenso.server  backend/bin/server (built here from cmd/server), run from backend/ so .env and configs/
#                            resolve; 127.0.0.1:8080, shared with the phone by `tailscale serve`.
#   com.bogy.expenso.web     the React dev server (`npm start` in frontend/) on 127.0.0.1:3000, for this Mac only.
# Login agents, not boot daemons: after a restart they are back once someone logs in.
# Re-run this script after a git pull to rebuild the backend and restart both.
# Stop the start skill's servers (or any go run / npm start) first: they bind the same ports.
# Logs: ~/Library/Logs/expenso-server.log and ~/Library/Logs/expenso-web.log
# Usage: install-agents.sh [--dry-run | --remove]
#   --dry-run  prints both plists to stdout and nothing else.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$ROOT/backend/bin/server"
DOMAIN="gui/$(id -u)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs"
SERVER=com.bogy.expenso.server
WEB=com.bogy.expenso.web

die() { echo "ERROR: $*" >&2; exit 1; }

MODE=install
case "${1:-}" in
  "") ;;
  --dry-run) MODE=dry-run ;;
  --remove) MODE=remove ;;
  *) die "usage: $0 [--dry-run | --remove]" ;;
esac

# $1 label, $2 working directory, $3 log name, $4 extra plist keys, rest: program arguments.
print_plist() {
  local label=$1 dir=$2 log=$3 extra=$4; shift 4
  local args="" a
  for a in "$@"; do args="$args<string>$a</string>"; done
  cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array>$args</array>
  <key>WorkingDirectory</key><string>$dir</string>$extra
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOGS/$log.log</string>
  <key>StandardErrorPath</key><string>$LOGS/$log.log</string>
</dict></plist>
PLIST
}

NODE_DIR="$(dirname "$(command -v npm || echo /opt/homebrew/bin/npm)")"
# CRA reads these: no browser tab, loopback only (CORS allows http://localhost:3000), fixed port.
WEB_ENV="
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>$NODE_DIR:/usr/bin:/bin</string>
    <key>BROWSER</key><string>none</string>
    <key>HOST</key><string>127.0.0.1</string>
    <key>PORT</key><string>3000</string>
  </dict>"

server_plist() { print_plist "$SERVER" "$ROOT/backend" expenso-server "" "$BIN"; }
web_plist() { print_plist "$WEB" "$ROOT/frontend" expenso-web "$WEB_ENV" "$NODE_DIR/npm" start; }

if [ "$MODE" = dry-run ]; then server_plist; web_plist; exit 0; fi

stop() { if launchctl print "$DOMAIN/$1" > /dev/null 2>&1; then launchctl bootout "$DOMAIN/$1" || true; fi; }

if [ "$MODE" = remove ]; then
  stop "$SERVER"; stop "$WEB"
  rm -f "$AGENTS/$SERVER.plist" "$AGENTS/$WEB.plist"
  echo "removed $SERVER and $WEB (the built binary stays in $BIN; logs stay in $LOGS)"
  exit 0
fi

# Build first, so a failed build leaves running agents untouched.
command -v go > /dev/null || die "go not found on PATH"
[ -x "$NODE_DIR/npm" ] || die "npm not found (looked in $NODE_DIR)"
[ -f "$ROOT/backend/.env" ] || die "missing backend/.env"
[ -d "$ROOT/frontend/node_modules" ] || die "run npm install in frontend/ first"
( cd "$ROOT/backend" && mkdir -p bin && go build -o bin/server ./cmd/server ) || die "go build failed"

mkdir -p "$AGENTS" "$LOGS"
for label in "$SERVER" "$WEB"; do
  stop "$label"
  if [ "$label" = "$SERVER" ]; then server_plist; else web_plist; fi > "$AGENTS/$label.plist"
  chmod 644 "$AGENTS/$label.plist"
  launchctl bootstrap "$DOMAIN" "$AGENTS/$label.plist"
done
echo "installed $SERVER (127.0.0.1:8080) and $WEB (http://localhost:3000): start at login and stay up"
echo "logs: $LOGS/expenso-server.log, $LOGS/expenso-web.log"
echo "restart one with: launchctl kickstart -k $DOMAIN/$SERVER    (after a pull, re-run $0 to rebuild)"
echo "remove with: $0 --remove"
