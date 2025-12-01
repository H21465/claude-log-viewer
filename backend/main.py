"""FastAPI application for Claude log viewer backend."""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, SessionLocal, engine
from models import Project
from routers import conversations, messages, projects, search, subagents, sync
from routers.websocket import router as websocket_router, broadcast_message_update
from services.file_watcher import file_watcher
from services.sync_service import sync_project


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
    except Exception as e:
        print(f"Error syncing to database: {e}")
        import traceback
        traceback.print_exc()

    # Schedule the broadcast in the event loop
    try:
        loop = asyncio.get_running_loop()
        asyncio.run_coroutine_threadsafe(
            broadcast_message_update(project_path, session_id, data),
            loop,
        )
    except RuntimeError:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    Base.metadata.create_all(bind=engine)

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
app.include_router(websocket_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
