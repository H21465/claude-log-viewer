"""Pydantic schemas for API request/response validation."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""

    name: str
    path: str


class ProjectResponse(BaseModel):
    """Schema for project response."""

    id: int
    name: str
    path: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class ConversationResponse(BaseModel):
    """Schema for conversation response."""

    id: int
    session_id: str
    project_id: int
    started_at: datetime
    updated_at: datetime
    message_count: int

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class ContentBlockSchema(BaseModel):
    """Schema for content block in structured messages."""

    type: str
    text: str | None = None
    thinking: str | None = None
    tool_use_id: str | None = None
    tool_name: str | None = None
    tool_input: dict | None = None


class ToolUseResultSchema(BaseModel):
    """Schema for tool use result metadata."""

    status: str | None = None
    prompt: str | None = None
    agent_id: str | None = Field(None, alias="agentId")
    content: Any | None = None
    total_duration_ms: int | None = Field(None, alias="totalDurationMs")
    total_tokens: int | None = Field(None, alias="totalTokens")
    total_tool_use_count: int | None = Field(None, alias="totalToolUseCount")

    class Config:
        """Pydantic configuration."""

        populate_by_name = True


class MessageResponse(BaseModel):
    """Schema for message response."""

    id: int
    uuid: str
    parent_uuid: str | None
    conversation_id: int
    role: str
    content: str
    content_blocks: list[ContentBlockSchema] | None = None
    model: str | None
    timestamp: datetime
    has_tool_use: bool = False
    has_thinking: bool = False
    is_sidechain: bool = False
    is_meta: bool = False
    tool_use_result: ToolUseResultSchema | None = None

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class SearchQuery(BaseModel):
    """Schema for search query."""

    query: str
    project_id: int | None = None
    conversation_id: int | None = None


class SearchResult(BaseModel):
    """Schema for search result."""

    message: MessageResponse
    conversation: ConversationResponse
    project: ProjectResponse
    match_snippet: str

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class UsageEntryResponse(BaseModel):
    """Schema for usage entry response."""

    id: int
    project_id: int
    message_id: int | None
    timestamp: datetime
    model: str | None
    input_tokens: int
    output_tokens: int
    cache_creation_tokens: int
    cache_read_tokens: int
    cost_usd: float

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class DailyUsageResponse(BaseModel):
    """Schema for daily usage response."""

    id: int
    project_id: int
    date: date
    model: str | None
    input_tokens: int
    output_tokens: int
    cache_creation_tokens: int
    cache_read_tokens: int
    cost_usd: float
    message_count: int

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class MonthlyUsageResponse(BaseModel):
    """Schema for monthly usage response."""

    id: int
    project_id: int
    year: int
    month: int
    model: str | None
    input_tokens: int
    output_tokens: int
    cache_creation_tokens: int
    cache_read_tokens: int
    cost_usd: float
    message_count: int

    class Config:
        """Pydantic configuration."""

        from_attributes = True


class SessionBlockSchema(BaseModel):
    """Schema for session block (runtime aggregation)."""

    session_id: str
    started_at: datetime
    ended_at: datetime | None
    duration_minutes: float
    model: str | None
    input_tokens: int
    output_tokens: int
    cache_creation_tokens: int
    cache_read_tokens: int
    cost_usd: float
    message_count: int
