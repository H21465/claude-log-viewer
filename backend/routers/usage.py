"""Usage API router for token usage tracking and analysis."""

import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Project
from schemas import (
    SessionBlockSchema,
)
from services.usage.aggregator import UsageAggregator
from services.usage.reader import load_usage_entries

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/usage", tags=["usage"])


def project_path_to_claude_path(project_path: str) -> str:
    """Convert a project path to its corresponding Claude projects directory path.

    Claude stores project data in ~/.claude/projects/ with the project path encoded
    as a hash (forward slashes replaced with dashes).

    Args:
        project_path: The original project path (e.g., /Users/user/projects/myapp)

    Returns:
        The Claude projects directory path for this project

    """
    claude_base = Path.home() / ".claude" / "projects"
    # Encode the path: replace / with -
    encoded_path = project_path.replace("/", "-")
    return str(claude_base / encoded_path)


@router.get("/current", response_model=list[SessionBlockSchema])
async def get_current_session_usage(
    project_id: int | None = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get current session usage statistics.

    Returns aggregated usage data for the current active session,
    organized into session blocks with token counts and cost information.

    Args:
        project_id: Optional project ID to filter usage data
        db: Database session

    Returns:
        List of session blocks with usage statistics

    Raises:
        HTTPException: If project not found or data loading fails

    """
    # Validate project if specified
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        data_path = project_path_to_claude_path(project.path)
    else:
        data_path = None

    try:
        # Load usage entries
        entries, _ = await load_usage_entries(data_path=data_path, hours_back=24)

        if not entries:
            return []

        # Group entries into session blocks (simplified)
        # Note: Simplified implementation - proper session block grouping TBD
        session_blocks = []
        if entries:
            first_entry = entries[0]
            last_entry = entries[-1]

            # Calculate aggregated stats
            total_input = sum(e.input_tokens for e in entries)
            total_output = sum(e.output_tokens for e in entries)
            total_cache_creation = sum(e.cache_creation_tokens for e in entries)
            total_cache_read = sum(e.cache_read_tokens for e in entries)
            total_cost = sum(e.cost_usd for e in entries)

            # Get unique models
            models_used = list({e.model for e in entries if e.model})

            session_blocks.append(
                {
                    "session_id": "current",
                    "started_at": first_entry.timestamp,
                    "ended_at": last_entry.timestamp,
                    "duration_minutes": (
                        last_entry.timestamp - first_entry.timestamp
                    ).total_seconds()
                    / 60,
                    "model": models_used[0] if models_used else None,
                    "input_tokens": total_input,
                    "output_tokens": total_output,
                    "cache_creation_tokens": total_cache_creation,
                    "cache_read_tokens": total_cache_read,
                    "cost_usd": total_cost,
                    "message_count": len(entries),
                },
            )

        return session_blocks

    except Exception as e:
        logger.exception("Failed to load usage data for project %s", project_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to load usage data",
        ) from e


@router.get("/daily")
async def get_daily_usage(
    project_id: int | None = Query(None, description="Filter by project ID"),
    start_date: datetime | None = Query(None, description="Start date for filtering"),
    end_date: datetime | None = Query(None, description="End date for filtering"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get daily aggregated usage statistics.

    Returns usage data aggregated by day, with optional filtering by date range.

    Args:
        project_id: Optional project ID to filter usage data
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        db: Database session

    Returns:
        List of daily usage statistics

    Raises:
        HTTPException: If project not found or aggregation fails

    """
    # Validate project if specified
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        data_path = project_path_to_claude_path(project.path)
    else:
        data_path = None

    try:
        # Load usage entries
        entries, _ = await load_usage_entries(data_path=data_path)

        if not entries:
            return []

        # Create aggregator and aggregate by day
        aggregator = UsageAggregator(data_path=data_path or "~/.claude/projects")
        daily_data = await aggregator.aggregate_daily(
            entries,
            start_date=start_date,
            end_date=end_date,
        )

        return daily_data

    except Exception as e:
        logger.exception("Failed to aggregate daily usage for project %s", project_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to aggregate daily usage",
        ) from e


@router.get("/monthly")
async def get_monthly_usage(
    project_id: int | None = Query(None, description="Filter by project ID"),
    start_date: datetime | None = Query(None, description="Start date for filtering"),
    end_date: datetime | None = Query(None, description="End date for filtering"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get monthly aggregated usage statistics.

    Returns usage data aggregated by month, with optional filtering by date range.

    Args:
        project_id: Optional project ID to filter usage data
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        db: Database session

    Returns:
        List of monthly usage statistics

    Raises:
        HTTPException: If project not found or aggregation fails

    """
    # Validate project if specified
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        data_path = project_path_to_claude_path(project.path)
    else:
        data_path = None

    try:
        # Load usage entries
        entries, _ = await load_usage_entries(data_path=data_path)

        if not entries:
            return []

        # Create aggregator and aggregate by month
        aggregator = UsageAggregator(data_path=data_path or "~/.claude/projects")
        monthly_data = await aggregator.aggregate_monthly(
            entries,
            start_date=start_date,
            end_date=end_date,
        )

        return monthly_data

    except Exception as e:
        logger.exception("Failed to aggregate monthly usage for project %s", project_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to aggregate monthly usage",
        ) from e


@router.get("/summary")
async def get_usage_summary(
    project_id: int | None = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
) -> dict:
    """Get comprehensive usage summary.

    Returns an overall summary of token usage including totals across all time periods.

    Args:
        project_id: Optional project ID to filter usage data
        db: Database session

    Returns:
        Dictionary with usage summary statistics

    Raises:
        HTTPException: If project not found or calculation fails

    """
    # Validate project if specified
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        data_path = project_path_to_claude_path(project.path)
    else:
        data_path = None

    try:
        # Load usage entries
        entries, _ = await load_usage_entries(data_path=data_path)

        if not entries:
            return {
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_cache_creation_tokens": 0,
                "total_cache_read_tokens": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "entries_count": 0,
                "date_range": None,
                "models_used": [],
            }

        # Calculate totals
        total_input = sum(e.input_tokens for e in entries)
        total_output = sum(e.output_tokens for e in entries)
        total_cache_creation = sum(e.cache_creation_tokens for e in entries)
        total_cache_read = sum(e.cache_read_tokens for e in entries)
        total_cost = sum(e.cost_usd for e in entries)

        # Get unique models
        models_used = sorted({e.model for e in entries if e.model})

        # Get date range
        first_entry = min(entries, key=lambda e: e.timestamp)
        last_entry = max(entries, key=lambda e: e.timestamp)

        return {
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_cache_creation_tokens": total_cache_creation,
            "total_cache_read_tokens": total_cache_read,
            "total_tokens": (
                total_input + total_output + total_cache_creation + total_cache_read
            ),
            "total_cost": total_cost,
            "entries_count": len(entries),
            "date_range": {
                "start": first_entry.timestamp,
                "end": last_entry.timestamp,
            },
            "models_used": models_used,
        }

    except Exception as e:
        logger.exception("Failed to calculate usage summary for project %s", project_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate usage summary",
        ) from e


@router.get("/models")
async def get_usage_by_model(
    project_id: int | None = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get usage statistics broken down by model.

    Returns token usage and cost information for each model used.

    Args:
        project_id: Optional project ID to filter usage data
        db: Database session

    Returns:
        List of model usage statistics

    Raises:
        HTTPException: If project not found or calculation fails

    """
    # Validate project if specified
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        data_path = project_path_to_claude_path(project.path)
    else:
        data_path = None

    try:
        # Load usage entries
        entries, _ = await load_usage_entries(data_path=data_path)

        if not entries:
            return []

        # Group by model
        model_stats: dict[str, dict] = {}

        for entry in entries:
            model = entry.model or "unknown"
            if model not in model_stats:
                model_stats[model] = {
                    "model": model,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cache_creation_tokens": 0,
                    "cache_read_tokens": 0,
                    "total_cost": 0.0,
                    "usage_count": 0,
                }

            model_stats[model]["input_tokens"] += entry.input_tokens
            model_stats[model]["output_tokens"] += entry.output_tokens
            model_stats[model]["cache_creation_tokens"] += entry.cache_creation_tokens
            model_stats[model]["cache_read_tokens"] += entry.cache_read_tokens
            model_stats[model]["total_cost"] += entry.cost_usd
            model_stats[model]["usage_count"] += 1

        # Convert to list and sort by total cost (descending)
        return sorted(
            model_stats.values(),
            key=lambda x: x["total_cost"],
            reverse=True,
        )

    except Exception as e:
        logger.exception("Failed to calculate model usage for project %s", project_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate model usage",
        ) from e


@router.get("/reset-time")
async def get_reset_time(
    project_id: int | None = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
) -> dict:
    """Get the estimated time until the usage limit resets.

    Claude Code uses a 5-hour rolling window for rate limits.
    This endpoint calculates when the current window will reset.

    Args:
        project_id: Optional project ID to filter usage data
        db: Database session

    Returns:
        Dictionary with reset time information

    Raises:
        HTTPException: If project not found or calculation fails

    """
    from datetime import timedelta

    # Validate project if specified
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        data_path = project_path_to_claude_path(project.path)
    else:
        data_path = None

    try:
        # Load recent usage entries (last 5 hours for window calculation)
        entries, _ = await load_usage_entries(data_path=data_path, hours_back=5)

        if not entries:
            return {
                "has_active_window": False,
                "reset_time": None,
                "minutes_until_reset": None,
                "window_start": None,
            }

        # Get the oldest entry in the current 5-hour window
        oldest_entry = min(entries, key=lambda e: e.timestamp)
        newest_entry = max(entries, key=lambda e: e.timestamp)

        # Calculate window reset time (5 hours from oldest entry)
        window_duration = timedelta(hours=5)
        reset_time = oldest_entry.timestamp + window_duration

        # Calculate minutes until reset
        now = datetime.now(oldest_entry.timestamp.tzinfo)
        time_until_reset = reset_time - now
        minutes_until_reset = max(0, time_until_reset.total_seconds() / 60)

        # Calculate total tokens in the 5-hour window
        window_tokens = sum(
            (e.input_tokens or 0)
            + (e.output_tokens or 0)
            + (e.cache_creation_tokens or 0)
            + (e.cache_read_tokens or 0)
            for e in entries
        )
        window_cost = sum(e.cost_usd or 0 for e in entries)

        return {
            "has_active_window": True,
            "reset_time": reset_time.isoformat(),
            "minutes_until_reset": int(minutes_until_reset),
            "window_start": oldest_entry.timestamp.isoformat(),
            "last_activity": newest_entry.timestamp.isoformat(),
            "window_tokens": window_tokens,
            "window_cost": round(window_cost, 4),
        }

    except Exception as e:
        logger.exception("Failed to calculate reset time for project %s", project_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate reset time",
        ) from e
