.PHONY: start stop help

# ヘルプ
help:
	@echo "Claude Log Viewer"
	@echo ""
	@echo "  make start  - Start the app"
	@echo "  make stop   - Stop the app"
	@echo "  make help   - Show this help"

# 起動
start:
	@echo "Starting Claude Log Viewer..."
	@cd backend && ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 & echo $$! > ../.backend.pid
	@cd frontend && npm run dev & echo $$! > ../.frontend.pid
	@echo ""
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	@echo "Stop with: make stop"

# 終了
stop:
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
