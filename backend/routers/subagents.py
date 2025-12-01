"""Subagent API router."""

from typing import TYPE_CHECKING, Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from services.log_parser import get_project_hash
from services.subagent_parser import parse_subagent_log

if TYPE_CHECKING:
    from services.log_parser import ContentBlock
    from services.subagent_parser import SubagentMessage

router = APIRouter(prefix="/api", tags=["subagents"])


def _content_block_to_dict(block: "ContentBlock") -> dict[str, Any]:
    """Convert ContentBlock dataclass to dict."""
    return {
        "type": block.type,
        "text": block.text,
        "thinking": block.thinking,
        "tool_use_id": block.tool_use_id,
        "tool_name": block.tool_name,
        "tool_input": block.tool_input,
    }


def _message_to_dict(msg: "SubagentMessage") -> dict[str, Any]:
    """Convert SubagentMessage dataclass to dict."""
    return {
        "uuid": msg.uuid,
        "parent_uuid": msg.parent_uuid,
        "role": msg.role,
        "content": msg.content,
        "content_blocks": [_content_block_to_dict(b) for b in msg.content_blocks],
        "model": msg.model,
        "timestamp": msg.timestamp,
        "has_tool_use": msg.has_tool_use,
        "has_thinking": msg.has_thinking,
    }


@router.get("/subagents/{agent_id}/messages")
def get_subagent_messages(
    agent_id: str,
    project_path: Annotated[str, Query(description="Project path")],
) -> dict:
    """Get messages from a subagent.

    Args:
        agent_id: Subagent ID (e.g., "8d19d637")
        project_path: Project path (required)

    Returns:
        Subagent messages with metadata

    Raises:
        HTTPException: If project not found or subagent not found

    """
    # Get project hash from project path
    project_hash = get_project_hash(project_path)
    if not project_hash:
        raise HTTPException(
            status_code=404,
            detail=f"Project not found: {project_path}",
        )

    try:
        result = parse_subagent_log(project_hash, agent_id)
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Subagent not found: {agent_id}",
            )
        # Convert dataclass to dict for JSON serialization
        return {
            "agent_id": result.agent_id,
            "session_id": result.session_id,
            "slug": result.slug,
            "model": result.model,
            "messages": [_message_to_dict(m) for m in result.messages],
            "stats": result.stats,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse subagent messages: {e!s}",
        ) from e
