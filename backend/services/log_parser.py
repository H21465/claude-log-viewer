"""Claude CLI log parser service.

Parses JSONL log files from Claude CLI and extracts conversation data.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ContentBlock:
    """Represents a single content block from Claude CLI messages."""

    type: str  # "text", "thinking", "tool_use", "tool_result"
    text: str | None = None
    thinking: str | None = None
    tool_use_id: str | None = None
    tool_name: str | None = None
    tool_input: dict | None = None
    is_error: bool = False  # tool_result error status


@dataclass
class ParsedMessage:
    """Parsed message from Claude CLI log."""

    uuid: str
    parent_uuid: str | None
    session_id: str
    project_path: str
    role: str  # "user" or "assistant"
    content: Any  # Raw content (str or list)
    content_plain: str  # Plain text extracted from content
    model: str | None  # Model name (for assistant messages)
    timestamp: str
    message_type: str  # "user", "assistant", "file-history-snapshot", etc.
    content_blocks: list[ContentBlock] = field(default_factory=list)
    has_tool_use: bool = False
    has_thinking: bool = False
    is_sidechain: bool = False  # Sub-agent message
    is_meta: bool = False  # Meta message
    tool_use_result: dict | None = None  # Task result (agentId, status, etc.)


def parse_content_blocks(content: str | list) -> list[ContentBlock]:
    """Parse content into structured ContentBlock objects.

    Args:
        content: Message content (str or list of content blocks)

    Returns:
        List of ContentBlock objects

    """
    if isinstance(content, str):
        # Simple text content
        return [ContentBlock(type="text", text=content)]

    if isinstance(content, list):
        blocks = []
        for item in content:
            if not isinstance(item, dict):
                continue

            block_type = item.get("type", "")

            if block_type == "text":
                blocks.append(
                    ContentBlock(
                        type="text",
                        text=item.get("text", ""),
                    ),
                )
            elif block_type == "thinking":
                blocks.append(
                    ContentBlock(
                        type="thinking",
                        thinking=item.get("thinking", ""),
                    ),
                )
            elif block_type == "tool_use":
                blocks.append(
                    ContentBlock(
                        type="tool_use",
                        tool_use_id=item.get("id"),
                        tool_name=item.get("name"),
                        tool_input=item.get("input"),
                    ),
                )
            elif block_type == "tool_result":
                # tool_result content can be a list or string
                result_content = item.get("content")
                if isinstance(result_content, list):
                    # Extract text from content list
                    text_parts = []
                    for c in result_content:
                        if isinstance(c, dict) and c.get("type") == "text":
                            text_parts.append(c.get("text", ""))
                        elif isinstance(c, str):
                            text_parts.append(c)
                    result_text = "\n".join(text_parts)
                else:
                    result_text = str(result_content) if result_content else ""
                blocks.append(
                    ContentBlock(
                        type="tool_result",
                        tool_use_id=item.get("tool_use_id"),
                        text=result_text,
                        is_error=item.get("is_error", False),
                    ),
                )

        return blocks

    return []


def extract_text_content(content: str | list) -> str:
    """Extract plain text from message content.

    Args:
        content: Message content (str or list of content blocks)

    Returns:
        Plain text string with text blocks joined

    """
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        # Extract text from "text" type blocks
        # (skip thinking, tool_use, tool_result, etc.)
        text_parts = [
            item["text"]
            for item in content
            if isinstance(item, dict) and item.get("type") == "text" and "text" in item
        ]
        return "\n".join(text_parts)

    return ""


def parse_jsonl_file(file_path: str) -> list[ParsedMessage]:
    """Parse a JSONL file and extract messages.

    Args:
        file_path: Path to JSONL file

    Returns:
        List of ParsedMessage objects

    """
    messages = []
    file_path_obj = Path(file_path)

    if not file_path_obj.exists():
        return messages

    # Extract project path from the log directory structure
    # ~/.claude/projects/-Users-hayamamo-projects-tmp-live/session.jsonl
    # -> /Users/hayamamo/projects/tmp/live
    project_dir_name = file_path_obj.parent.name
    project_path = _decode_project_path(project_dir_name)

    with file_path_obj.open(encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
                msg_type = data.get("type", "")

                # Skip non-message entries
                if msg_type not in ["user", "assistant"]:
                    continue

                message = data.get("message", {})
                if not message:
                    continue

                role = message.get("role", "")
                content = message.get("content", "")
                content_plain = extract_text_content(content)
                content_blocks = parse_content_blocks(content)

                # Check for tool_use and thinking blocks
                has_tool_use = any(block.type == "tool_use" for block in content_blocks)
                has_thinking = any(block.type == "thinking" for block in content_blocks)

                # Extract metadata from root level
                is_sidechain = data.get("isSidechain", False)
                is_meta = data.get("isMeta", False)
                tool_use_result = data.get("toolUseResult")

                parsed = ParsedMessage(
                    uuid=data.get("uuid", ""),
                    parent_uuid=data.get("parentUuid"),
                    session_id=data.get("sessionId", ""),
                    project_path=project_path,
                    role=role,
                    content=content,
                    content_plain=content_plain,
                    model=message.get("model"),
                    timestamp=data.get("timestamp", ""),
                    message_type=msg_type,
                    content_blocks=content_blocks,
                    has_tool_use=has_tool_use,
                    has_thinking=has_thinking,
                    is_sidechain=is_sidechain,
                    is_meta=is_meta,
                    tool_use_result=tool_use_result,
                )
                messages.append(parsed)

            except json.JSONDecodeError:
                # Skip invalid JSON lines
                continue

    return messages


def _decode_project_path(encoded_name: str) -> str:
    """Decode project path from directory name.

    Claude CLI encodes project paths as: -Users-hayamamo-projects-tmp-live
    -> /Users/hayamamo/projects/tmp/live

    Args:
        encoded_name: Encoded directory name

    Returns:
        Decoded project path

    """
    # Remove leading dash and replace dashes with slashes
    encoded_name = encoded_name.removeprefix("-")

    # Split by dash and reconstruct path
    parts = encoded_name.split("-")
    return "/" + "/".join(parts)


def get_project_hash(project_path: str) -> str | None:
    """Get the Claude CLI project hash for a given project path.

    Scans ~/.claude/projects/ to find the directory matching the project path.

    Args:
        project_path: Absolute path to the project

    Returns:
        Directory name (hash) if found, None otherwise

    """
    claude_projects_dir = Path.home() / ".claude" / "projects"

    if not claude_projects_dir.exists():
        return None

    # Normalize project path (remove trailing slash)
    project_path = project_path.rstrip("/")

    # Scan all project directories
    for project_dir in claude_projects_dir.iterdir():
        if not project_dir.is_dir():
            continue

        decoded_path = _decode_project_path(project_dir.name)
        if decoded_path == project_path:
            return project_dir.name

    return None


def scan_project_logs(project_path: str) -> list[ParsedMessage]:
    """Scan and parse all log files for a given project.

    Args:
        project_path: Absolute path to the project

    Returns:
        List of all parsed messages from the project logs

    """
    all_messages = []

    # Get project hash (directory name)
    project_hash = get_project_hash(project_path)
    if not project_hash:
        return all_messages

    # Get project log directory
    claude_projects_dir = Path.home() / ".claude" / "projects" / project_hash

    if not claude_projects_dir.exists():
        return all_messages

    # Parse all JSONL files in the directory
    for log_file in claude_projects_dir.glob("*.jsonl"):
        messages = parse_jsonl_file(str(log_file))
        all_messages.extend(messages)

    # Sort by timestamp
    all_messages.sort(key=lambda m: m.timestamp)

    return all_messages


def list_all_projects() -> list[tuple[str, str]]:
    """List all Claude CLI projects.

    Returns:
        List of (project_path, hash) tuples

    """
    claude_projects_dir = Path.home() / ".claude" / "projects"

    if not claude_projects_dir.exists():
        return []

    projects = []
    for project_dir in claude_projects_dir.iterdir():
        if not project_dir.is_dir():
            continue

        project_path = _decode_project_path(project_dir.name)
        projects.append((project_path, project_dir.name))

    return sorted(projects, key=lambda x: x[0])
