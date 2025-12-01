"""FastAPI application for Claude log viewer backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import conversations, messages, projects, search, subagents, sync

app = FastAPI(
    title="Claude Log Viewer API",
    description="API for viewing and searching Claude conversation logs",
    version="1.0.0",
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    """Initialize database on startup."""
    Base.metadata.create_all(bind=engine)


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
