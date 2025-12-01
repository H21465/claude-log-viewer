"""Claude CLI subagent log parser service.

Parses JSONL log files from Claude CLI subagents (agent-*.jsonl).
"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from services.log_parser import ContentBlock, parse_content_blocks


@dataclass
class SubagentMessage:
    """Parsed message from a subagent log."""

    uuid: str
    parent_uuid: str | None
    role: str  # "user" or "assistant"
    content: str | list  # Raw content
    content_blocks: list[ContentBlock] = field(default_factory=list)
    model: str | None = None
    timestamp: str = ""
    has_tool_use: bool = False
    has_thinking: bool = False


@dataclass
class SubagentDetail:
    """Details about a subagent and its conversation history."""

    agent_id: str
    session_id: str
    slug: str | None
    model: str | None  # Primary model used by this agent
    messages: list[SubagentMessage]
    stats: dict  # Statistics about the subagent


def get_subagent_log_path(project_hash: str, agent_id: str) -> Path | None:
    """Get the path to a subagent log file.

    Args:
        project_hash: Project directory name (e.g., "-Users-hayamamo-projects-...")
        agent_id: Agent ID (e.g., "ad4f3b4f")

    Returns:
        Path to the agent log file if it exists, None otherwise

    """
    claude_projects_dir = Path.home() / ".claude" / "projects"
    agent_log_path = claude_projects_dir / project_hash / f"agent-{agent_id}.jsonl"

    if agent_log_path.exists():
        return agent_log_path

    return None


def _parse_log_entry(data: dict) -> tuple[SubagentMessage | None, dict]:
    """Parse a single log entry.

    Args:
        data: Parsed JSON data from a log line

    Returns:
        Tuple of (parsed message or None, metadata dict with session/model/stats)

    """
    metadata = {
        "session_id": data.get("sessionId", ""),
        "slug": data.get("slug"),
        "model": None,
        "tool_use": False,
        "thinking": False,
        "input_tokens": 0,
        "output_tokens": 0,
    }

    # Verify this is a sidechain message
    if not data.get("isSidechain"):
        return None, metadata

    message_data = data.get("message", {})
    if not message_data:
        return None, metadata

    # Extract model
    metadata["model"] = message_data.get("model")

    role = message_data.get("role", "")
    content = message_data.get("content", "")
    content_blocks = parse_content_blocks(content)

    # Check for tool_use and thinking blocks
    has_tool_use = any(block.type == "tool_use" for block in content_blocks)
    has_thinking = any(block.type == "thinking" for block in content_blocks)

    metadata["tool_use"] = has_tool_use
    metadata["thinking"] = has_thinking

    # Extract token usage
    usage = message_data.get("usage", {})
    if usage:
        metadata["input_tokens"] = usage.get("input_tokens", 0)
        metadata["output_tokens"] = usage.get("output_tokens", 0)

    parsed = SubagentMessage(
        uuid=data.get("uuid", ""),
        parent_uuid=data.get("parentUuid"),
        role=role,
        content=content,
        content_blocks=content_blocks,
        model=metadata["model"],
        timestamp=data.get("timestamp", ""),
        has_tool_use=has_tool_use,
        has_thinking=has_thinking,
    )

    return parsed, metadata


def _read_log_file(log_path: Path) -> tuple[list, str, str | None, str | None, dict]:
    """Read and parse all entries from a log file.

    Args:
        log_path: Path to the log file

    Returns:
        Tuple of (messages, session_id, slug, primary_model, stats)

    """
    messages = []
    session_id = ""
    slug = None
    primary_model = None

    # Statistics
    total_input_tokens = 0
    total_output_tokens = 0
    tool_use_count = 0
    thinking_count = 0

    with log_path.open(encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)

                # Parse the log entry
                parsed, metadata = _parse_log_entry(data)

                # Extract session_id and slug from first message
                if not session_id:
                    session_id = metadata["session_id"]
                if not slug and metadata["slug"]:
                    slug = metadata["slug"]

                # Extract model (use the first one as primary)
                if metadata["model"] and not primary_model:
                    primary_model = metadata["model"]

                # Update statistics
                if metadata["tool_use"]:
                    tool_use_count += 1
                if metadata["thinking"]:
                    thinking_count += 1

                total_input_tokens += metadata["input_tokens"]
                total_output_tokens += metadata["output_tokens"]

                # Add message if valid
                if parsed:
                    messages.append(parsed)

            except json.JSONDecodeError:
                # Skip invalid JSON lines
                continue

    stats = {
        "total_messages": len(messages),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "tool_use_count": tool_use_count,
        "thinking_count": thinking_count,
    }

    return messages, session_id, slug, primary_model, stats


def parse_subagent_log(project_hash: str, agent_id: str) -> SubagentDetail | None:
    """Parse a subagent log file.

    Args:
        project_hash: Project directory name
        agent_id: Agent ID

    Returns:
        SubagentDetail object if the log file exists and is valid, None otherwise

    """
    log_path = get_subagent_log_path(project_hash, agent_id)
    if not log_path:
        return None

    try:
        messages, session_id, slug, primary_model, stats = _read_log_file(
            log_path,
        )
    except OSError as e:
        # File read error
        print(f"Error reading subagent log {log_path}: {e}")
        return None

    # Sort messages by timestamp
    messages.sort(key=lambda m: m.timestamp)

    return SubagentDetail(
        agent_id=agent_id,
        session_id=session_id,
        slug=slug,
        model=primary_model,
        messages=messages,
        stats=stats,
    )


def list_subagents_in_session(project_hash: str, session_id: str) -> list[dict]:
    """List all subagents for a given session.

    Args:
        project_hash: Project directory name
        session_id: Session ID to filter by

    Returns:
        List of dictionaries containing subagent metadata:
        - agent_id: Agent ID
        - slug: Agent slug (if available)
        - model: Primary model used
        - message_count: Number of messages

    """
    claude_projects_dir = Path.home() / ".claude" / "projects"
    project_dir = claude_projects_dir / project_hash

    if not project_dir.exists():
        return []

    subagents = []

    # Scan all agent-*.jsonl files
    for agent_log in project_dir.glob("agent-*.jsonl"):
        agent_id = agent_log.stem.replace("agent-", "")

        # Parse the first line to check session_id
        try:
            with agent_log.open(encoding="utf-8") as f:
                first_line = f.readline().strip()
                if not first_line:
                    continue

                data = json.loads(first_line)
                if data.get("sessionId") != session_id:
                    continue

                if not data.get("isSidechain"):
                    continue

                # This agent belongs to the session
                # Parse the full log to get details
                detail = parse_subagent_log(project_hash, agent_id)
                if detail:
                    subagents.append(
                        {
                            "agent_id": agent_id,
                            "slug": detail.slug,
                            "model": detail.model,
                            "message_count": detail.stats["total_messages"],
                        },
                    )

        except (json.JSONDecodeError, OSError):
            # Skip invalid files
            continue

    return subagents
