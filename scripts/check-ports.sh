#!/usr/bin/env bash
# Fail if the configured API/UI ports are already listening.
set -euo pipefail

RED=$'\033[31m'
GREEN=$'\033[32m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

API_PORT="${API_PORT:-17325}"
WEB_PORT="${WEB_PORT:-17326}"
failures=0

ok() {
  printf '%s✓%s %s\n' "$GREEN" "$RESET" "$1"
}

fail() {
  printf '%s✗%s %s\n' "$RED" "$RESET" "$1"
  failures=$((failures + 1))
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -H -ltn 2>/dev/null | awk '{print $4}' | grep -E "[:.]${port}$" >/dev/null 2>&1
    return $?
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  # Last resort: attempt a bind on loopback.
  python3 - "$port" <<'PY'
import socket
import sys
port = int(sys.argv[1])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind(("127.0.0.1", port))
except OSError:
    sys.exit(0)  # in use
else:
    sys.exit(1)  # free
finally:
    sock.close()
PY
}

printf '\n%sPort availability (required before deploy)%s\n' "$BOLD" "$RESET"
printf 'Checking API_PORT=%s and WEB_PORT=%s\n' "$API_PORT" "$WEB_PORT"

if [[ "$API_PORT" == "$WEB_PORT" ]]; then
  fail "API_PORT and WEB_PORT must be different (both are $API_PORT)."
fi

if port_in_use "$API_PORT"; then
  fail "API port $API_PORT is already in use. Choose another: make deploy API_PORT=<free-port>"
else
  ok "API port $API_PORT is free"
fi

if port_in_use "$WEB_PORT"; then
  fail "UI port $WEB_PORT is already in use. Choose another: make deploy WEB_PORT=<free-port>"
else
  ok "UI port $WEB_PORT is free"
fi

if [[ "$failures" -gt 0 ]]; then
  printf '\n%s%d port check(s) failed.%s Pick free ports and retry, for example:\n' \
    "$RED" "$failures" "$RESET"
  printf '  make deploy API_PORT=18321 WEB_PORT=18322\n'
  exit 1
fi

printf '%sPorts are free.%s\n' "$GREEN" "$RESET"
exit 0
