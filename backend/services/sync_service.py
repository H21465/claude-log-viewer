"""Synchronization service for updating database from Claude logs."""

import json
from datetime import datetime

from sqlalchemy.orm import Session

from models import Conversation, Message, Project
from services.log_parser import scan_project_logs


def sync_project(db: Session, project_id: int) -> dict[str, int]:
    """Sync project logs to database.

    Args:
        db: Database session
        project_id: Project ID to sync

    Returns:
        Dictionary with sync statistics (added, updated, skipped)

    Raises:
        ValueError: If project not found

    """
    # Get project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project with id {project_id} not found")

    # Parse logs
    parsed_messages = scan_project_logs(project.path)

    stats = {"added": 0, "updated": 0, "skipped": 0}

    # Group messages by session_id
    conversations_data: dict[str, list] = {}
    for msg in parsed_messages:
        if msg.session_id not in conversations_data:
            conversations_data[msg.session_id] = []
        conversations_data[msg.session_id].append(msg)

    # Process each conversation
    for session_id, messages in conversations_data.items():
        # Get or create conversation
        conversation = (
            db.query(Conversation)
            .filter(Conversation.session_id == session_id)
            .first()
        )

        if not conversation:
            # Create new conversation
            first_message_time = (
                datetime.fromisoformat(messages[0].timestamp.replace("Z", "+00:00"))
                if messages
                else datetime.utcnow()
            )
            conversation = Conversation(
                session_id=session_id,
                project_id=project_id,
                started_at=first_message_time,
                updated_at=datetime.utcnow(),
                message_count=0,
            )
            db.add(conversation)
            db.flush()  # Get conversation.id

        # Process messages
        seen_uuids = set()
        for msg in messages:
            # Skip duplicates within this batch
            if msg.uuid in seen_uuids:
                stats["skipped"] += 1
                continue
            seen_uuids.add(msg.uuid)

            # Check if message already exists in DB
            existing = (
                db.query(Message).filter(Message.uuid == msg.uuid).first()
            )

            if existing:
                stats["skipped"] += 1
                continue

            # Parse timestamp
            try:
                timestamp = datetime.fromisoformat(
                    msg.timestamp.replace("Z", "+00:00"),
                )
            except (ValueError, AttributeError):
                timestamp = datetime.utcnow()

            # Create new message
            new_message = Message(
                uuid=msg.uuid,
                parent_uuid=msg.parent_uuid,
                conversation_id=conversation.id,
                role=msg.role,
                content=msg.content_plain or "",
                content_fts=msg.content_plain or "",
                content_raw=json.dumps(msg.content) if msg.content else None,
                has_tool_use=msg.has_tool_use,
                has_thinking=msg.has_thinking,
                model=msg.model,
                timestamp=timestamp,
            )
            db.add(new_message)
            stats["added"] += 1

        # Update conversation stats
        message_count = (
            db.query(Message)
            .filter(Message.conversation_id == conversation.id)
            .count()
        )
        conversation.message_count = message_count

        # Update updated_at to latest message timestamp
        latest_message = (
            db.query(Message)
            .filter(Message.conversation_id == conversation.id)
            .order_by(Message.timestamp.desc())
            .first()
        )
        if latest_message:
            conversation.updated_at = latest_message.timestamp

    # Commit all changes
    db.commit()

    # Update project updated_at
    project.updated_at = datetime.utcnow()
    db.commit()

    return stats
