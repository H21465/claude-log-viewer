"""FastAPI application for Claude log viewer backend."""

import asyncio
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, SessionLocal, engine
from models import Project
from routers import conversations, messages, projects, search, subagents, sync, usage
from routers.websocket import (
    broadcast_message_update,
    broadcast_usage_update,
)
from routers.websocket import (
    router as websocket_router,
)
from services.file_watcher import file_watcher
from services.log_parser import list_all_projects
from services.sync_service import sync_project
from services.usage import UsageReader


async def _calculate_and_broadcast_usage(project_path: str) -> None:
    """Calculate and broadcast usage data for a project.

    Args:
        project_path: Path to the project

    """
    try:
        # Load usage data for recent activity (last 24 hours)
        reader = UsageReader()
        entries, _ = await reader.load_usage_entries(hours_back=24)

        if not entries:
            print("No usage entries found for recent activity")
            return

        # Calculate summary statistics
        total_input_tokens = sum(e.input_tokens for e in entries)
        total_output_tokens = sum(e.output_tokens for e in entries)
        total_cache_creation = sum(e.cache_creation_tokens for e in entries)
        total_cache_read = sum(e.cache_read_tokens for e in entries)
        total_cost = sum(e.cost_usd for e in entries)

        # Get model breakdown
        model_stats: dict[str, dict[str, Any]] = {}
        for entry in entries:
            model = entry.model or "unknown"
            if model not in model_stats:
                model_stats[model] = {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cache_creation_tokens": 0,
                    "cache_read_tokens": 0,
                    "cost_usd": 0.0,
                    "count": 0,
                }
            stats = model_stats[model]
            stats["input_tokens"] += entry.input_tokens
            stats["output_tokens"] += entry.output_tokens
            stats["cache_creation_tokens"] += entry.cache_creation_tokens
            stats["cache_read_tokens"] += entry.cache_read_tokens
            stats["cost_usd"] += entry.cost_usd
            stats["count"] += 1

        usage_summary = {
            "total_tokens": (
                total_input_tokens
                + total_output_tokens
                + total_cache_creation
                + total_cache_read
            ),
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "cache_creation_tokens": total_cache_creation,
            "cache_read_tokens": total_cache_read,
            "total_cost": total_cost,
            "entries_count": len(entries),
            "model_breakdown": model_stats,
            "last_updated": entries[-1].timestamp.isoformat() if entries else None,
        }

        tokens = usage_summary["total_tokens"]
        cost = usage_summary["total_cost"]
        print(f"Broadcasting usage update: {tokens} tokens, ${cost:.4f}")

        # Broadcast to all connected clients
        await broadcast_usage_update(project_path, usage_summary)

    except Exception as e:  # noqa: BLE001
        print(f"Error calculating usage data: {e}")
        traceback.print_exc()


def on_file_change(project_path: str, session_id: str, data: dict[str, Any]) -> None:
    """Handle file change events from the watcher.

    Args:
        project_path: Path to the project
        session_id: Session ID
        data: Change data

    """
    print(f"on_file_change called: {project_path}, {session_id}")

    # Sync to database first
    try:
        db = SessionLocal()
        try:
            # Get or create project
            project = db.query(Project).filter(Project.path == project_path).first()
            if not project:
                # Create new project
                project_name = Path(project_path).name or project_path
                project = Project(name=project_name, path=project_path)
                db.add(project)
                db.flush()

            # Sync project logs to database
            sync_stats = sync_project(db, project.id)
            db.commit()
            print(f"Synced to database: {sync_stats}")
        finally:
            db.close()
    except Exception as e:  # noqa: BLE001
        print(f"Error syncing to database: {e}")
        traceback.print_exc()

    # Schedule the broadcast in the event loop
    try:
        loop = asyncio.get_running_loop()
        # Broadcast message update
        asyncio.run_coroutine_threadsafe(
            broadcast_message_update(project_path, session_id, data),
            loop,
        )
        # Broadcast usage update
        asyncio.run_coroutine_threadsafe(
            _calculate_and_broadcast_usage(project_path),
            loop,
        )
    except RuntimeError:
        pass


def scan_all_existing_projects() -> None:
    """Scan and sync all existing projects on startup."""
    print("Scanning existing projects...")

    all_projects = list_all_projects()
    print(f"Found {len(all_projects)} projects")

    db = SessionLocal()
    try:
        for project_path, _project_hash in all_projects:
            print(f"  Syncing project: {project_path}")

            # Get or create project
            project = db.query(Project).filter(Project.path == project_path).first()
            if not project:
                project_name = Path(project_path).name or project_path
                project = Project(name=project_name, path=project_path)
                db.add(project)
                db.flush()

            # Sync project logs
            try:
                stats = sync_project(db, project.id)
                print(f"    Synced: {stats}")
            except Exception as e:  # noqa: BLE001
                print(f"    Error syncing: {e}")

        db.commit()
    finally:
        db.close()

    print("Initial scan completed")


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001, ANN201
    """Application lifespan manager."""
    # Startup
    Base.metadata.create_all(bind=engine)

    # Scan existing projects on startup
    scan_all_existing_projects()

    # Start file watcher
    loop = asyncio.get_running_loop()
    file_watcher.add_callback(on_file_change)
    file_watcher.start(loop)

    yield

    # Shutdown
    file_watcher.stop()


app = FastAPI(
    title="Claude Log Viewer API",
    description="API for viewing and searching Claude conversation logs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "message": "Claude Log Viewer API"}


# Register routers
app.include_router(projects.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(search.router)
app.include_router(subagents.router)
app.include_router(sync.router)
app.include_router(usage.router)
app.include_router(websocket_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)  # noqa: S104
