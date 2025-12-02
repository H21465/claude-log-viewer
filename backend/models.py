"""SQLAlchemy models for Claude log data."""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class Project(Base):
    """Project model representing a directory containing Claude logs."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    path = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
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
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
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
    usage_entries = relationship(
        "UsageEntry",
        back_populates="message",
        cascade="all, delete-orphan",
    )


class UsageEntry(Base):
    """Usage entry model for tracking token usage per message."""

    __tablename__ = "usage_entries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    model = Column(String, nullable=True)
    input_tokens = Column(Integer, default=0, nullable=False)
    output_tokens = Column(Integer, default=0, nullable=False)
    cache_creation_tokens = Column(Integer, default=0, nullable=False)
    cache_read_tokens = Column(Integer, default=0, nullable=False)
    cost_usd = Column(Float, default=0.0, nullable=False)

    project = relationship("Project")
    message = relationship("Message", back_populates="usage_entries")


class DailyUsage(Base):
    """Daily usage aggregation model."""

    __tablename__ = "daily_usage"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    model = Column(String, nullable=True)
    input_tokens = Column(Integer, default=0, nullable=False)
    output_tokens = Column(Integer, default=0, nullable=False)
    cache_creation_tokens = Column(Integer, default=0, nullable=False)
    cache_read_tokens = Column(Integer, default=0, nullable=False)
    cost_usd = Column(Float, default=0.0, nullable=False)
    message_count = Column(Integer, default=0, nullable=False)

    project = relationship("Project")


class MonthlyUsage(Base):
    """Monthly usage aggregation model."""

    __tablename__ = "monthly_usage"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    model = Column(String, nullable=True)
    input_tokens = Column(Integer, default=0, nullable=False)
    output_tokens = Column(Integer, default=0, nullable=False)
    cache_creation_tokens = Column(Integer, default=0, nullable=False)
    cache_read_tokens = Column(Integer, default=0, nullable=False)
    cost_usd = Column(Float, default=0.0, nullable=False)
    message_count = Column(Integer, default=0, nullable=False)

    project = relationship("Project")
