# ShadowSpeakerSDE — install and local deploy via Make
#
# Typical flow:
#   make check-tools   # verify Python / Node / npm / curl
#   make install       # check tools, then install backend + frontend deps
#   make deploy        # start API + UI (runs install, frees ports, then starts)
#   make stop          # stop deploy processes and free API/UI ports
#
# Optional:
#   make run           # start without reinstalling (still frees ports first)
#   make check-ports   # fail if API_PORT / WEB_PORT are already listening
#   make test          # backend + frontend tests
#   make API_PORT=18321 WEB_PORT=18322 deploy
#
# Default ports are intentionally uncommon to avoid clashes with typical
# local services (8000, 5173, etc.).

.PHONY: help check-tools check-ports install install-backend install-frontend \
	run deploy stop test lint typecheck status clean

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BACKEND := $(ROOT)/backend
FRONTEND := $(ROOT)/frontend
VENV := $(BACKEND)/.venv
PYTHON ?= python3
API_PORT ?= 17325
WEB_PORT ?= 17326
PID_DIR := $(ROOT)/.run
API_PID := $(PID_DIR)/api.pid
WEB_PID := $(PID_DIR)/web.pid
API_LOG := $(PID_DIR)/api.log
WEB_LOG := $(PID_DIR)/web.log

export API_PORT
export WEB_PORT
export VITE_API_PROXY := http://127.0.0.1:$(API_PORT)

help:
	@echo "ShadowSpeakerSDE Make targets"
	@echo ""
	@echo "  make check-tools   Verify required toolchain before installing"
	@echo "  make check-ports   Fail if API_PORT / WEB_PORT are already in use"
	@echo "  make install       Tool check + install backend and frontend deps"
	@echo "  make deploy        Install (if needed), free ports, and start API + UI"
	@echo "  make run           Free ports, then start API + UI without reinstalling"
	@echo "  make stop          Stop API + UI and free their ports (pid files + fuser)"
	@echo "  make status        Show whether API/UI process files exist"
	@echo "  make test          Run backend and frontend tests"
	@echo "  make lint          Run backend ruff + frontend oxlint"
	@echo "  make typecheck     Run backend mypy + frontend tsc"
	@echo "  make clean         Remove venv, node_modules, and .run logs/pids"
	@echo ""
	@echo "Default ports: API_PORT=$(API_PORT) WEB_PORT=$(WEB_PORT)"
	@echo "Override example: make deploy API_PORT=18321 WEB_PORT=18322"

check-tools:
	@chmod +x "$(ROOT)/scripts/check-tools.sh"
	@API_PORT="$(API_PORT)" WEB_PORT="$(WEB_PORT)" "$(ROOT)/scripts/check-tools.sh"

check-ports:
	@chmod +x "$(ROOT)/scripts/check-ports.sh"
	@API_PORT="$(API_PORT)" WEB_PORT="$(WEB_PORT)" "$(ROOT)/scripts/check-ports.sh"

install: check-tools install-backend install-frontend
	@echo ""
	@echo "Install complete. Start the app with: make deploy"
	@echo "  API  -> http://127.0.0.1:$(API_PORT)"
	@echo "  UI   -> http://127.0.0.1:$(WEB_PORT)"

install-backend:
	@echo "→ Installing backend into $(VENV)"
	@cd "$(BACKEND)" && $(PYTHON) -m venv .venv
	@cd "$(BACKEND)" && .venv/bin/pip install --upgrade pip
	@cd "$(BACKEND)" && .venv/bin/pip install -e ".[dev]"
	@echo "✓ Backend dependencies installed"

install-frontend:
	@echo "→ Installing frontend npm packages"
	@cd "$(FRONTEND)" && npm install
	@echo "✓ Frontend dependencies installed"

deploy: install run

# Always free the configured ports before bind checks so redeploy works even when
# earlier runs left orphan listeners and lost .run/*.pid files.
run: _ensure-venv _ensure-node-modules stop check-ports
	@mkdir -p "$(PID_DIR)"
	@echo "→ Starting API on http://127.0.0.1:$(API_PORT)"
	@cd "$(BACKEND)" && nohup .venv/bin/uvicorn shadowspeaker.main:app --host 127.0.0.1 --port "$(API_PORT)" \
		> "$(API_LOG)" 2>&1 & echo $$! > "$(API_PID)"
	@echo "→ Waiting for API health…"
	@ok=0; \
	for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
		if curl -sf "http://127.0.0.1:$(API_PORT)/health" >/dev/null; then ok=1; break; fi; \
		sleep 0.5; \
	done; \
	if [ "$$ok" != "1" ]; then \
		echo "API failed to become healthy. Last log lines:"; \
		tail -n 40 "$(API_LOG)" || true; \
		$(MAKE) stop >/dev/null 2>&1 || true; \
		exit 1; \
	fi
	@echo "✓ API healthy"
	@echo "→ Starting frontend on http://127.0.0.1:$(WEB_PORT) (proxy → $(VITE_API_PROXY))"
	@cd "$(FRONTEND)" && nohup npm run dev -- --host 127.0.0.1 --port "$(WEB_PORT)" \
		> "$(WEB_LOG)" 2>&1 & echo $$! > "$(WEB_PID)"
	@sleep 1
	@echo ""
	@echo "ShadowSpeakerSDE is up:"
	@echo "  UI:  http://127.0.0.1:$(WEB_PORT)"
	@echo "  API: http://127.0.0.1:$(API_PORT)"
	@echo "  Docs: http://127.0.0.1:$(API_PORT)/docs"
	@echo "Logs: $(API_LOG)  $(WEB_LOG)"
	@echo "Stop with: make stop"

stop:
	@if [ -f "$(API_PID)" ]; then \
		pid=$$(cat "$(API_PID)"); \
		if kill -0 $$pid 2>/dev/null; then kill $$pid 2>/dev/null || true; echo "Stopped API ($$pid)"; fi; \
		rm -f "$(API_PID)"; \
	fi
	@if [ -f "$(WEB_PID)" ]; then \
		pid=$$(cat "$(WEB_PID)"); \
		if kill -0 $$pid 2>/dev/null; then \
			kill $$pid 2>/dev/null || true; \
			pkill -P $$pid 2>/dev/null || true; \
			echo "Stopped frontend ($$pid)"; \
		fi; \
		rm -f "$(WEB_PID)"; \
	fi
	@if command -v fuser >/dev/null 2>&1; then \
		if fuser "$(API_PORT)/tcp" >/dev/null 2>&1; then \
			fuser -k "$(API_PORT)/tcp" >/dev/null 2>&1 || true; \
			echo "Freed API port $(API_PORT)"; \
		fi; \
		if fuser "$(WEB_PORT)/tcp" >/dev/null 2>&1; then \
			fuser -k "$(WEB_PORT)/tcp" >/dev/null 2>&1 || true; \
			echo "Freed UI port $(WEB_PORT)"; \
		fi; \
	else \
		echo "fuser not found; skipped port cleanup for $(API_PORT)/$(WEB_PORT)."; \
	fi
	@sleep 0.4

status:
	@if [ -f "$(API_PID)" ] && kill -0 $$(cat "$(API_PID)") 2>/dev/null; then \
		echo "API: running (pid $$(cat "$(API_PID)")) → http://127.0.0.1:$(API_PORT)"; \
	else \
		echo "API: not running"; \
	fi
	@if [ -f "$(WEB_PID)" ] && kill -0 $$(cat "$(WEB_PID)") 2>/dev/null; then \
		echo "UI:  running (pid $$(cat "$(WEB_PID)")) → http://127.0.0.1:$(WEB_PORT)"; \
	else \
		echo "UI:  not running"; \
	fi

test: _ensure-venv _ensure-node-modules
	@cd "$(BACKEND)" && .venv/bin/pytest -q
	@cd "$(FRONTEND)" && npm test

lint: _ensure-venv _ensure-node-modules
	@cd "$(BACKEND)" && .venv/bin/ruff check src tests
	@cd "$(FRONTEND)" && npm run lint

typecheck: _ensure-venv _ensure-node-modules
	@cd "$(BACKEND)" && .venv/bin/mypy src
	@cd "$(FRONTEND)" && npm run typecheck

clean: stop
	@rm -rf "$(VENV)" "$(FRONTEND)/node_modules" "$(PID_DIR)"
	@echo "Removed venv, node_modules, and .run/"

_ensure-venv:
	@if [ ! -x "$(VENV)/bin/python" ]; then \
		echo "Backend venv missing. Run: make install"; \
		exit 1; \
	fi

_ensure-node-modules:
	@if [ ! -d "$(FRONTEND)/node_modules" ]; then \
		echo "frontend/node_modules missing. Run: make install"; \
		exit 1; \
	fi
