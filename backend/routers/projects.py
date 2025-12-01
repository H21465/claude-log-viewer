"""Project API router."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Project
from schemas import ProjectCreate, ProjectResponse
from services.log_parser import list_all_projects
from services.sync_service import sync_project

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    """Get all projects.

    Returns:
        List of all projects

    """
    return db.query(Project).order_by(Project.updated_at.desc()).all()


@router.post("/", response_model=ProjectResponse)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
) -> Project:
    """Create a new project.

    Args:
        project_data: Project creation data (name, path)
        db: Database session

    Returns:
        Created project

    Raises:
        HTTPException: If project path already exists

    """
    # Check if path already exists
    existing = db.query(Project).filter(Project.path == project_data.path).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project with path '{project_data.path}' already exists",
        )

    # Create project
    project = Project(
        name=project_data.name,
        path=project_data.path,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
) -> Project:
    """Update project name.

    Args:
        project_id: Project ID
        project_data: Project update data (name, path)
        db: Database session

    Returns:
        Updated project

    Raises:
        HTTPException: If project not found

    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update only name (path should not be changed)
    project.name = project_data.name
    db.commit()
    db.refresh(project)

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Delete project from database (logs remain intact).

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If project not found

    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}


@router.post("/scan")
def scan_projects(db: Session = Depends(get_db)) -> dict:
    """Scan Claude logs and register all projects.

    Scans ~/.claude/projects/ directory and registers all found projects.

    Args:
        db: Database session

    Returns:
        Scan statistics (added, existing) and list of projects

    """
    all_projects_data = list_all_projects()
    stats = {"added": 0, "existing": 0}
    projects_list = []

    for project_path, _project_hash in all_projects_data:
        # Check if already exists
        existing = db.query(Project).filter(Project.path == project_path).first()
        if existing:
            stats["existing"] += 1
            projects_list.append({
                "id": existing.id,
                "name": existing.name,
                "path": existing.path,
                "status": "existing",
            })
            continue

        # Extract project name from path
        project_name = Path(project_path).name or project_path

        # Create new project
        project = Project(
            name=project_name,
            path=project_path,
        )
        db.add(project)
        db.flush()
        stats["added"] += 1
        projects_list.append({
            "id": project.id,
            "name": project.name,
            "path": project.path,
            "status": "added",
        })

    db.commit()

    return {
        "message": "Scan completed successfully",
        "added": stats["added"],
        "existing": stats["existing"],
        "projects": projects_list,
    }


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
) -> Project:
    """Get project details.

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        Project details

    Raises:
        HTTPException: If project not found

    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.post("/{project_id}/sync")
def sync_project_logs(
    project_id: int,
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    """Sync project logs to database.

    Args:
        project_id: Project ID
        db: Database session

    Returns:
        Sync statistics (added, updated, skipped)

    Raises:
        HTTPException: If project not found

    """
    try:
        stats = sync_project(db, project_id)
        return {
            "message": "Sync completed successfully",
            "added": stats["added"],
            "updated": stats["updated"],
            "skipped": stats["skipped"],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
