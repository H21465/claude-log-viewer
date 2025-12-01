"""SQLAlchemy models for Claude log data."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Project(Base):
    """Project model representing a directory containing Claude logs."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    path = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    conversations = relationship(
        "Conversation",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class Conversation(Base):
    """Conversation model representing a session in Claude logs."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    started_at = Column(DateTime, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    message_count = Column(Integer, default=0, nullable=False)

    project = relationship("Project", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class Message(Base):
    """Message model representing individual messages in conversations."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, nullable=False, index=True)
    parent_uuid = Column(String, nullable=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    content_fts = Column(Text, nullable=False)
    content_raw = Column(Text, nullable=True)
    model = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    has_tool_use = Column(Boolean, default=False)
    has_thinking = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="messages")
