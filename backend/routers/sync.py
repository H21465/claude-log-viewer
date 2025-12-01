"""Sync API router."""

from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Conversation, Message, Project
from services.log_parser import list_all_projects
from services.sync_service import sync_project

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/")
def sync_all_logs(db: Session = Depends(get_db)) -> dict[str, int | str]:
    """Sync all project logs from Claude CLI to database.

    This endpoint:
    1. Scans ~/.claude/projects/ for all projects
    2. Registers new projects in database
    3. Syncs all logs for each project

    Args:
        db: Database session

    Returns:
        Sync statistics (projects_scanned, projects_added, messages_added)

    """
    # Get all projects from Claude CLI
    all_projects_data = list_all_projects()

    stats = {
        "projects_scanned": len(all_projects_data),
        "projects_added": 0,
        "messages_added": 0,
        "messages_updated": 0,
        "messages_skipped": 0,
    }

    # Process each project
    for project_path, _project_hash in all_projects_data:
        # Get or create project
        project = db.query(Project).filter(Project.path == project_path).first()

        if not project:
            # Extract project name from path
            project_name = Path(project_path).name or project_path

            # Create new project
            project = Project(
                name=project_name,
                path=project_path,
            )
            db.add(project)
            db.flush()
            stats["projects_added"] += 1

        # Sync project logs
        sync_stats = sync_project(db, project.id)
        stats["messages_added"] += sync_stats["added"]
        stats["messages_updated"] += sync_stats["updated"]
        stats["messages_skipped"] += sync_stats["skipped"]

    db.commit()

    return {
        "message": "Sync completed successfully",
        "projects_scanned": stats["projects_scanned"],
        "projects_added": stats["projects_added"],
        "messages_added": stats["messages_added"],
        "messages_updated": stats["messages_updated"],
        "messages_skipped": stats["messages_skipped"],
    }


@router.get("/status")
def get_sync_status(db: Session = Depends(get_db)) -> dict:
    """Get sync status and statistics.

    Returns current database statistics and last sync information.

    Args:
        db: Database session

    Returns:
        Sync status information

    """
    # Get counts
    project_count = db.query(Project).count()
    conversation_count = db.query(Conversation).count()
    message_count = db.query(Message).count()

    # Get last updated project (as proxy for last sync time)
    last_updated_project = (
        db.query(Project)
        .order_by(Project.updated_at.desc())
        .first()
    )

    # Get available projects in Claude CLI
    available_projects = list_all_projects()
    available_count = len(available_projects)

    last_sync_timestamp = (
        last_updated_project.updated_at if last_updated_project else None
    )
    last_sync_name = last_updated_project.name if last_updated_project else None

    return {
        "database_stats": {
            "projects": project_count,
            "conversations": conversation_count,
            "messages": message_count,
        },
        "last_sync": {
            "timestamp": last_sync_timestamp,
            "project_name": last_sync_name,
        },
        "available_projects": {
            "count": available_count,
            "unsynced": available_count - project_count,
        },
    }
