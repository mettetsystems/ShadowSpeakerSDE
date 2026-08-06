#!/usr/bin/env bash
# Fail early with actionable messages when required toolchain pieces are missing.
set -euo pipefail

MIN_PYTHON_MAJOR=3
MIN_PYTHON_MINOR=12
MIN_NODE_MAJOR=20

RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

failures=0

ok() {
  printf '%s✓%s %s\n' "$GREEN" "$RESET" "$1"
}

warn() {
  printf '%s!%s %s\n' "$YELLOW" "$RESET" "$1"
}

fail() {
  printf '%s✗%s %s\n' "$RED" "$RESET" "$1"
  failures=$((failures + 1))
}

header() {
  printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"
}

version_ge() {
  # Compare dotted versions: version_ge 20.11.0 20 -> 0 (true) via return code
  local have="$1"
  local need="$2"
  printf '%s\n%s\n' "$need" "$have" | sort -V | head -n1 | grep -qx "$need"
}

header "ShadowSpeakerSDE toolchain check"

# --- make (informational; we are already running under make/bash) ---
if command -v make >/dev/null 2>&1; then
  ok "make $(make --version 2>/dev/null | head -n1 | sed 's/^[^0-9]*//')"
else
  fail "make is not installed. Install GNU Make (e.g. dnf install make / apt install make / brew install make)."
fi

# --- Python ---
PYTHON_BIN=""
for candidate in python3.12 python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [[ -z "$PYTHON_BIN" ]]; then
  fail "Python 3 was not found on PATH. Install Python ${MIN_PYTHON_MAJOR}.${MIN_PYTHON_MINOR}+ and ensure python3 is available."
else
  PY_VER="$("$PYTHON_BIN" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])')"
  PY_MAJOR="$("$PYTHON_BIN" -c 'import sys; print(sys.version_info[0])')"
  PY_MINOR="$("$PYTHON_BIN" -c 'import sys; print(sys.version_info[1])')"
  if [[ "$PY_MAJOR" -gt "$MIN_PYTHON_MAJOR" ]] || {
    [[ "$PY_MAJOR" -eq "$MIN_PYTHON_MAJOR" && "$PY_MINOR" -ge "$MIN_PYTHON_MINOR" ]]
  }; then
    ok "Python $PY_VER ($PYTHON_BIN) meets >= ${MIN_PYTHON_MAJOR}.${MIN_PYTHON_MINOR}"
  else
    fail "Python $PY_VER ($PYTHON_BIN) is too old. Need >= ${MIN_PYTHON_MAJOR}.${MIN_PYTHON_MINOR}."
  fi

  if "$PYTHON_BIN" -c 'import venv, ensurepip' >/dev/null 2>&1; then
    ok "Python venv + ensurepip modules are available"
  else
    # ensurepip is optional on some distros if virtualenv/pip is provided another way
    if "$PYTHON_BIN" -c 'import venv' >/dev/null 2>&1; then
      warn "Python venv is available but ensurepip failed; install will try pip bootstrap if needed."
    else
      fail "Python venv module is missing. Install the venv package for your OS (e.g. python3-venv)."
    fi
  fi
fi

# --- Node / npm ---
if command -v node >/dev/null 2>&1; then
  NODE_VER="$(node -v | sed 's/^v//')"
  NODE_MAJOR="${NODE_VER%%.*}"
  if [[ "$NODE_MAJOR" -ge "$MIN_NODE_MAJOR" ]]; then
    ok "Node.js v$NODE_VER meets >= ${MIN_NODE_MAJOR}"
  else
    fail "Node.js v$NODE_VER is too old. Need >= ${MIN_NODE_MAJOR}. Install from https://nodejs.org/ or your package manager."
  fi
else
  fail "node was not found on PATH. Install Node.js ${MIN_NODE_MAJOR}+ (includes npm) from https://nodejs.org/ or your package manager."
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm -v)"
else
  fail "npm was not found on PATH. Reinstall Node.js ${MIN_NODE_MAJOR}+ so npm is included."
fi

# --- curl (health checks during deploy) ---
if command -v curl >/dev/null 2>&1; then
  ok "curl $(curl --version | head -n1 | awk '{print $2}')"
else
  fail "curl was not found on PATH. Install curl so deploy can verify the API health endpoint."
fi

# --- Ports (soft check) ---
header "Port availability (advisory)"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :$port )" 2>/dev/null | tail -n +2 | grep -q .
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

if port_in_use "$API_PORT"; then
  warn "Port $API_PORT appears to be in use. API deploy may fail — set API_PORT to a free port (e.g. make deploy API_PORT=8001)."
else
  ok "API port $API_PORT looks free"
fi

if port_in_use "$WEB_PORT"; then
  warn "Port $WEB_PORT appears to be in use. Frontend deploy may fail — set WEB_PORT to a free port (e.g. make deploy WEB_PORT=5174)."
else
  ok "Frontend port $WEB_PORT looks free"
fi

header "Result"
if [[ "$failures" -gt 0 ]]; then
  printf '%s%d required check(s) failed.%s Fix the items marked ✗ above, then re-run: make check-tools\n' \
    "$RED" "$failures" "$RESET"
  exit 1
fi

printf '%sAll required tools look good.%s You can run: make install && make deploy\n' "$GREEN" "$RESET"
exit 0
