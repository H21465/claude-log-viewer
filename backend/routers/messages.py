"""Message API router."""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Conversation, Message, Project
from schemas import MessageResponse
from services.log_parser import parse_content_blocks

router = APIRouter(prefix="/api", tags=["messages"])


def _build_message_response(message: Message) -> dict:
    """Build message response with content_blocks from content_raw.

    Args:
        message: Message model instance

    Returns:
        Dictionary with message data including content_blocks

    """
    result = {
        "id": message.id,
        "uuid": message.uuid,
        "parent_uuid": message.parent_uuid,
        "conversation_id": message.conversation_id,
        "role": message.role,
        "content": message.content,
        "model": message.model,
        "timestamp": message.timestamp,
        "has_tool_use": message.has_tool_use,
        "has_thinking": message.has_thinking,
        "content_blocks": None,
    }

    # Parse content_raw to get content_blocks
    if message.content_raw:
        try:
            content = json.loads(message.content_raw)
            blocks = parse_content_blocks(content)
            result["content_blocks"] = [
                {
                    "type": b.type,
                    "text": b.text,
                    "thinking": b.thinking,
                    "tool_use_id": b.tool_use_id,
                    "tool_name": b.tool_name,
                    "tool_input": b.tool_input,
                }
                for b in blocks
            ]
        except json.JSONDecodeError:
            # If parsing fails, leave content_blocks as None
            pass

    return result


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get all messages in a conversation.

    Args:
        conversation_id: Conversation ID
        db: Database session

    Returns:
        List of messages ordered by timestamp

    """
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.timestamp.asc())
        .all()
    )
    return [_build_message_response(msg) for msg in messages]


@router.get("/messages/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """Get message details.

    Args:
        message_id: Message ID
        db: Database session

    Returns:
        Message details

    Raises:
        HTTPException: If message not found

    """
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return _build_message_response(message)


@router.get("/messages/search")
def search_messages(
    q: str = Query(..., min_length=1),
    project_id: int | None = None,
    role: str | None = Query(None, regex="^(user|assistant)$"),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    """Search messages by full-text search.

    Args:
        q: Search query
        project_id: Project ID filter (optional)
        role: Role filter (user/assistant, optional)
        start_date: Start date filter (optional)
        end_date: End date filter (optional)
        limit: Maximum number of results (1-100)
        offset: Offset for pagination
        db: Database session

    Returns:
        Search results with pagination info

    """
    # Build base query
    search_query = (
        db.query(Message, Conversation, Project)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .join(Project, Conversation.project_id == Project.id)
    )

    # Apply filters
    # Simple LIKE search (for SQLite compatibility)
    search_pattern = f"%{q}%"
    search_query = search_query.filter(Message.content_fts.like(search_pattern))

    if project_id:
        search_query = search_query.filter(Project.id == project_id)

    if role:
        search_query = search_query.filter(Message.role == role)

    if start_date:
        search_query = search_query.filter(Message.timestamp >= start_date)

    if end_date:
        search_query = search_query.filter(Message.timestamp <= end_date)

    # Get total count
    total = search_query.count()

    # Apply pagination and execute
    results = (
        search_query
        .order_by(Message.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Format results
    formatted_results = []
    for message, conversation, project in results:
        # Create match snippet (show context around match)
        content = message.content
        snippet = _create_snippet(content, q)

        formatted_results.append({
            "message": {
                "id": message.id,
                "uuid": message.uuid,
                "parent_uuid": message.parent_uuid,
                "conversation_id": message.conversation_id,
                "role": message.role,
                "content": message.content,
                "model": message.model,
                "timestamp": message.timestamp,
            },
            "conversation": {
                "id": conversation.id,
                "session_id": conversation.session_id,
                "project_id": conversation.project_id,
                "started_at": conversation.started_at,
                "updated_at": conversation.updated_at,
                "message_count": conversation.message_count,
            },
            "project": {
                "id": project.id,
                "name": project.name,
                "path": project.path,
                "created_at": project.created_at,
                "updated_at": project.updated_at,
            },
            "match_snippet": snippet,
        })

    return {
        "results": formatted_results,
        "total": total,
        "limit": limit,
        "offset": offset,
        "query": q,
    }


def _create_snippet(content: str, query: str, context_chars: int = 100) -> str:
    """Create a snippet showing context around the search match.

    Args:
        content: Full content text
        query: Search query
        context_chars: Number of characters to show before/after match

    Returns:
        Snippet with match highlighted

    """
    # Find first occurrence (case-insensitive)
    lower_content = content.lower()
    lower_query = query.lower()
    pos = lower_content.find(lower_query)

    if pos == -1:
        # No match found, return beginning
        return content[:context_chars * 2] + ("..." if len(content) > context_chars * 2 else "")

    # Calculate snippet boundaries
    start = max(0, pos - context_chars)
    end = min(len(content), pos + len(query) + context_chars)

    # Extract snippet
    snippet = content[start:end]

    # Add ellipsis if truncated
    if start > 0:
        snippet = "..." + snippet
    if end < len(content):
        snippet = snippet + "..."

    return snippet
