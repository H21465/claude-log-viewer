
.DEFAULT_GOAL := help

.PHONY: setup
setup: ## Install all dependencies
	@echo "Setting up dependencies..."
	@if [ ! -d frontend/node_modules ]; then \
		echo "Installing npm packages..."; \
		cd frontend && npm install; \
	fi
	@echo "Setup complete."

.PHONY: start
start: setup ## Start the app (auto-installs dependencies if needed)
	@echo "Starting Claude Log Viewer..."
	@cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 & echo $$! > ../.backend.pid
	@cd frontend && npm run dev & echo $$! > ../.frontend.pid
	@echo ""
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	@echo "Stop with: make stop"

.PHONY: stop
stop: ## Stop the app
	@if [ -f .backend.pid ]; then \
		kill $$(cat .backend.pid) 2>/dev/null || true; \
		rm -f .backend.pid; \
	fi
	@if [ -f .frontend.pid ]; then \
		kill $$(cat .frontend.pid) 2>/dev/null || true; \
		rm -f .frontend.pid; \
	fi
	@pkill -f "uvicorn main:app" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
	@echo "Stopped."

.PHONY: status
status: ## Show running status
	@echo "Claude Log Viewer Status"
	@echo "========================"
	@backend_running=$$(pgrep -f "uvicorn main:app" 2>/dev/null); \
	if [ -n "$$backend_running" ]; then \
		echo "Backend:  Running (PID: $$backend_running) - http://localhost:8000"; \
	else \
		echo "Backend:  Stopped"; \
	fi
	@frontend_running=$$(pgrep -f "vite" 2>/dev/null); \
	if [ -n "$$frontend_running" ]; then \
		echo "Frontend: Running (PID: $$frontend_running) - http://localhost:5173"; \
	else \
		echo "Frontend: Stopped"; \
	fi

.PHONY: cli
cli: setup ## Start the Rich-based terminal dashboard
	@cd backend && uv run python cli.py

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "target list:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
