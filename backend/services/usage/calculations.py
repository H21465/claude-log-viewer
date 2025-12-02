"""Burn rate and cost calculations for Claude usage monitoring.

This module provides burn rate calculations and usage projections
for active session blocks.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Protocol

from .models import BurnRate, SessionBlock, TokenCounts, UsageProjection

logger = logging.getLogger(__name__)


class BlockLike(Protocol):
    """Protocol for objects that behave like session blocks."""

    is_active: bool
    duration_minutes: float
    token_counts: TokenCounts
    cost_usd: float
    end_time: datetime


class BurnRateCalculator:
    """Calculates burn rates and usage projections for session blocks."""

    def calculate_burn_rate(self, block: BlockLike) -> BurnRate | None:
        """Calculate current consumption rate for active blocks.

        Args:
            block: Session block to calculate burn rate for

        Returns:
            BurnRate object with tokens/minute and cost/hour, or None if invalid

        """
        if not block.is_active or block.duration_minutes < 1:
            return None

        total_tokens = (
            block.token_counts.input_tokens
            + block.token_counts.output_tokens
            + block.token_counts.cache_creation_tokens
            + block.token_counts.cache_read_tokens
        )
        if total_tokens == 0:
            return None

        tokens_per_minute = total_tokens / block.duration_minutes
        cost_per_hour = (
            (block.cost_usd / block.duration_minutes) * 60
            if block.duration_minutes > 0
            else 0
        )

        return BurnRate(
            tokens_per_minute=tokens_per_minute,
            cost_per_hour=cost_per_hour,
        )

    def project_block_usage(self, block: BlockLike) -> UsageProjection | None:
        """Project total usage if current rate continues.

        Args:
            block: Active session block to project usage for

        Returns:
            UsageProjection with projected totals and remaining time, or None if invalid

        """
        burn_rate = self.calculate_burn_rate(block)
        if not burn_rate:
            return None

        now = datetime.now(UTC)
        remaining_seconds = (block.end_time - now).total_seconds()
        if remaining_seconds <= 0:
            return None

        remaining_minutes = remaining_seconds / 60
        remaining_hours = remaining_minutes / 60

        current_tokens = (
            block.token_counts.input_tokens
            + block.token_counts.output_tokens
            + block.token_counts.cache_creation_tokens
            + block.token_counts.cache_read_tokens
        )
        current_cost = block.cost_usd

        projected_additional_tokens = burn_rate.tokens_per_minute * remaining_minutes
        projected_total_tokens = current_tokens + projected_additional_tokens

        projected_additional_cost = burn_rate.cost_per_hour * remaining_hours
        projected_total_cost = current_cost + projected_additional_cost

        return UsageProjection(
            projected_total_tokens=int(projected_total_tokens),
            projected_total_cost=projected_total_cost,
            remaining_minutes=int(remaining_minutes),
        )


async def calculate_hourly_burn_rate(
    blocks: list[SessionBlock],
    current_time: datetime | None = None,
) -> float:
    """Calculate burn rate based on all sessions in the last hour.

    Args:
        blocks: List of session blocks
        current_time: Reference time (defaults to now)

    Returns:
        Tokens per minute for the last hour

    """
    if not blocks:
        return 0.0

    if current_time is None:
        current_time = datetime.now(UTC)

    one_hour_ago = current_time - timedelta(hours=1)
    total_tokens = _calculate_total_tokens_in_hour(blocks, one_hour_ago, current_time)

    return total_tokens / 60.0 if total_tokens > 0 else 0.0


def _calculate_total_tokens_in_hour(
    blocks: list[SessionBlock],
    one_hour_ago: datetime,
    current_time: datetime,
) -> float:
    """Calculate total tokens for all blocks in the last hour."""
    total_tokens = 0.0
    for block in blocks:
        total_tokens += _process_block_for_burn_rate(block, one_hour_ago, current_time)
    return total_tokens


def _process_block_for_burn_rate(
    block: SessionBlock,
    one_hour_ago: datetime,
    current_time: datetime,
) -> float:
    """Process a single block for burn rate calculation."""
    if block.is_gap:
        return 0

    start_time = block.start_time
    if not start_time:
        return 0

    # Ensure UTC timezone
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=UTC)

    session_actual_end = _determine_session_end_time(block, current_time)
    if session_actual_end < one_hour_ago:
        return 0

    return _calculate_tokens_in_hour(
        block,
        start_time,
        session_actual_end,
        one_hour_ago,
        current_time,
    )


def _determine_session_end_time(
    block: SessionBlock,
    current_time: datetime,
) -> datetime:
    """Determine session end time based on block status."""
    if block.is_active:
        return current_time

    if block.actual_end_time:
        actual_end = block.actual_end_time
        # Ensure UTC timezone
        if actual_end.tzinfo is None:
            actual_end = actual_end.replace(tzinfo=UTC)
        return actual_end

    return current_time


def _calculate_tokens_in_hour(
    block: SessionBlock,
    start_time: datetime,
    session_actual_end: datetime,
    one_hour_ago: datetime,
    current_time: datetime,
) -> float:
    """Calculate tokens used within the last hour for this session."""
    session_start_in_hour = max(start_time, one_hour_ago)
    session_end_in_hour = min(session_actual_end, current_time)

    if session_end_in_hour <= session_start_in_hour:
        return 0

    total_session_duration = (session_actual_end - start_time).total_seconds() / 60
    hour_duration = (session_end_in_hour - session_start_in_hour).total_seconds() / 60

    if total_session_duration > 0:
        session_tokens = block.total_tokens
        return session_tokens * (hour_duration / total_session_duration)
    return 0


async def process_burn_rates(
    blocks: list[SessionBlock],
    calculator: BurnRateCalculator | None = None,
) -> None:
    """Process burn rate data for active blocks.

    Updates blocks in-place with burn rate snapshots and projections.

    Args:
        blocks: List of session blocks to process
        calculator: Optional BurnRateCalculator instance (creates one if not provided)

    """
    if calculator is None:
        calculator = BurnRateCalculator()

    for block in blocks:
        if block.is_active:
            burn_rate = calculator.calculate_burn_rate(block)
            if burn_rate:
                block.burn_rate_snapshot = burn_rate
                projection = calculator.project_block_usage(block)
                if projection:
                    block.projection_data = {
                        "totalTokens": projection.projected_total_tokens,
                        "totalCost": projection.projected_total_cost,
                        "remainingMinutes": projection.remaining_minutes,
                    }
