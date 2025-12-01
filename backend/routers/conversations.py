"""Conversation API router."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Conversation
from schemas import ConversationResponse

router = APIRouter(prefix="/api", tags=["conversations"])


@router.get(
    "/projects/{project_id}/conversations",
    response_model=list[ConversationResponse],
)
def list_conversations(
    project_id: int,
    sort: str = Query("updated_at", regex="^(updated_at|message_count)$"),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
) -> list[Conversation]:
    """Get all conversations for a project.

    Args:
        project_id: Project ID
        sort: Sort field (updated_at or message_count)
        start_date: Filter by start date (optional)
        end_date: Filter by end date (optional)
        db: Database session

    Returns:
        List of conversations

    """
    query = db.query(Conversation).filter(Conversation.project_id == project_id)

    # Apply date filters
    if start_date:
        query = query.filter(Conversation.started_at >= start_date)
    if end_date:
        query = query.filter(Conversation.started_at <= end_date)

    # Apply sorting
    if sort == "message_count":
        query = query.order_by(Conversation.message_count.desc())
    else:  # default: updated_at
        query = query.order_by(Conversation.updated_at.desc())

    return query.all()


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
) -> Conversation:
    """Get conversation details.

    Args:
        conversation_id: Conversation ID
        db: Database session

    Returns:
        Conversation details

    Raises:
        HTTPException: If conversation not found

    """
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation
