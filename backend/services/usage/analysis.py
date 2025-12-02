"""Usage analysis functionality for Claude usage monitoring.

This module provides P90 calculation, trend analysis, and session
analysis capabilities.
"""

import logging
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

import numpy as np

from .plans import COMMON_TOKEN_LIMITS, DEFAULT_TOKEN_LIMIT, LIMIT_DETECTION_THRESHOLD

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class P90Config:
    """Configuration for P90 calculation."""

    common_limits: Sequence[int]
    limit_threshold: float
    default_min_limit: int
    cache_ttl_seconds: int


def _did_hit_limit(tokens: int, common_limits: Sequence[int], threshold: float) -> bool:
    """Check if token count indicates hitting a limit.

    Args:
        tokens: Token count to check
        common_limits: List of known token limits
        threshold: Threshold ratio (e.g., 0.95 for 95%)

    Returns:
        True if tokens >= any limit * threshold

    """
    return any(tokens >= limit * threshold for limit in common_limits)


def _extract_sessions(
    blocks: Sequence[dict[str, Any]],
    filter_fn: Callable[[dict[str, Any]], bool],
) -> list[int]:
    """Extract token counts from blocks matching filter criteria.

    Args:
        blocks: List of session blocks
        filter_fn: Function to filter blocks

    Returns:
        List of token counts from matching blocks

    """
    return [
        block["totalTokens"]
        for block in blocks
        if filter_fn(block) and block.get("totalTokens", 0) > 0
    ]


def _calculate_p90_from_blocks(blocks: Sequence[dict[str, Any]], cfg: P90Config) -> int:
    """Calculate P90 token limit from session blocks.

    Algorithm:
    1. First try to use only sessions that hit known limits
    2. If no limit hits, use all completed sessions
    3. Calculate 90th percentile (P90) from token distribution
    4. Return max(P90, default_min_limit)

    Args:
        blocks: List of session blocks
        cfg: P90 configuration

    Returns:
        P90 token limit

    """
    # First try sessions that hit limits
    hits = _extract_sessions(
        blocks,
        lambda b: (
            not b.get("isGap", False)
            and not b.get("isActive", False)
            and _did_hit_limit(
                b.get("totalTokens", 0),
                cfg.common_limits,
                cfg.limit_threshold,
            )
        ),
    )

    # Fall back to all completed sessions
    if not hits:
        hits = _extract_sessions(
            blocks,
            lambda b: not b.get("isGap", False) and not b.get("isActive", False),
        )

    if not hits:
        return cfg.default_min_limit

    # Calculate P90 using numpy
    p90_value = np.percentile(hits, 90)
    return max(int(p90_value), cfg.default_min_limit)


class P90Calculator:
    """Calculates P90 token limits from session history."""

    def __init__(self, config: P90Config | None = None) -> None:
        """Initialize P90 calculator.

        Args:
            config: Optional P90 configuration (uses defaults if not provided)

        """
        if config is None:
            config = P90Config(
                common_limits=COMMON_TOKEN_LIMITS,
                limit_threshold=LIMIT_DETECTION_THRESHOLD,
                default_min_limit=DEFAULT_TOKEN_LIMIT,
                cache_ttl_seconds=60 * 60,  # 1 hour
            )
        self._cfg: P90Config = config
        # Cache: {blocks_tuple: (cache_key, result)}
        self._cache: dict[tuple, tuple[int, int]] = {}

    def _get_cached_result(
        self,
        cache_key: int,
        blocks_tuple: tuple[tuple[bool, bool, int], ...],
    ) -> int | None:
        """Get cached P90 result if valid.

        Args:
            cache_key: Current cache expiration key
            blocks_tuple: Tuple of block data

        Returns:
            Cached result or None if cache miss/expired

        """
        if blocks_tuple in self._cache:
            cached_key, cached_result = self._cache[blocks_tuple]
            if cached_key == cache_key:
                return cached_result
        return None

    def _cache_result(
        self,
        cache_key: int,
        blocks_tuple: tuple[tuple[bool, bool, int], ...],
        result: int,
    ) -> None:
        """Cache P90 calculation result.

        Args:
            cache_key: Cache expiration key
            blocks_tuple: Tuple of block data
            result: P90 calculation result

        """
        self._cache[blocks_tuple] = (cache_key, result)

    def calculate_p90_limit(
        self,
        blocks: list[dict[str, Any]] | None = None,
        *,
        use_cache: bool = True,
    ) -> int | None:
        """Calculate P90 token limit from session blocks.

        Args:
            blocks: List of session blocks
            use_cache: Whether to use cached results (keyword-only)

        Returns:
            P90 token limit, or None if no blocks provided

        """
        if not blocks:
            return None

        if not use_cache:
            return _calculate_p90_from_blocks(blocks, self._cfg)

        # Use cache with time-based expiration
        ttl: int = self._cfg.cache_ttl_seconds
        expire_key: int = int(time.time() // ttl)
        blocks_tuple: tuple[tuple[bool, bool, int], ...] = tuple(
            (
                b.get("isGap", False),
                b.get("isActive", False),
                b.get("totalTokens", 0),
            )
            for b in blocks
        )

        # Check cache
        cached = self._get_cached_result(expire_key, blocks_tuple)
        if cached is not None:
            return cached

        # Calculate and cache
        result = _calculate_p90_from_blocks(blocks, self._cfg)
        self._cache_result(expire_key, blocks_tuple, result)
        return result


async def analyze_trend(
    blocks: list[dict[str, Any]],
    window_hours: int = 24,  # noqa: ARG001
) -> dict[str, Any]:
    """Analyze usage trends over a time window.

    Args:
        blocks: List of session blocks
        window_hours: Time window in hours (reserved for future filtering)

    Returns:
        Dictionary with trend analysis including:
        - avg_tokens_per_hour
        - peak_tokens_per_hour
        - total_tokens
        - active_sessions

    """
    if not blocks:
        return {
            "avg_tokens_per_hour": 0.0,
            "peak_tokens_per_hour": 0.0,
            "total_tokens": 0,
            "active_sessions": 0,
        }

    # Filter out gaps and extract relevant data
    valid_blocks = [b for b in blocks if not b.get("isGap", False)]

    total_tokens = sum(b.get("totalTokens", 0) for b in valid_blocks)
    active_sessions = sum(1 for b in valid_blocks if b.get("isActive", False))

    # Calculate hourly rates
    hourly_tokens = []
    for block in valid_blocks:
        duration = block.get("durationMinutes", 0)
        if duration > 0:
            tokens = block.get("totalTokens", 0)
            hourly_rate = (tokens / duration) * 60
            hourly_tokens.append(hourly_rate)

    avg_tokens_per_hour = np.mean(hourly_tokens) if hourly_tokens else 0.0
    peak_tokens_per_hour = np.max(hourly_tokens) if hourly_tokens else 0.0

    return {
        "avg_tokens_per_hour": float(avg_tokens_per_hour),
        "peak_tokens_per_hour": float(peak_tokens_per_hour),
        "total_tokens": total_tokens,
        "active_sessions": active_sessions,
    }


async def analyze_session_patterns(
    blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    """Analyze session patterns and statistics.

    Args:
        blocks: List of session blocks

    Returns:
        Dictionary with session pattern analysis including:
        - avg_session_duration
        - avg_tokens_per_session
        - session_count
        - completion_rate

    """
    if not blocks:
        return {
            "avg_session_duration": 0.0,
            "avg_tokens_per_session": 0.0,
            "session_count": 0,
            "completion_rate": 0.0,
        }

    # Filter out gaps
    valid_blocks = [b for b in blocks if not b.get("isGap", False)]

    if not valid_blocks:
        return {
            "avg_session_duration": 0.0,
            "avg_tokens_per_session": 0.0,
            "session_count": 0,
            "completion_rate": 0.0,
        }

    # Calculate statistics
    durations = [b.get("durationMinutes", 0) for b in valid_blocks]
    token_counts = [b.get("totalTokens", 0) for b in valid_blocks]

    completed = sum(1 for b in valid_blocks if not b.get("isActive", False))
    session_count = len(valid_blocks)

    return {
        "avg_session_duration": float(np.mean(durations)),
        "avg_tokens_per_session": float(np.mean(token_counts)),
        "session_count": session_count,
        "completion_rate": completed / session_count if session_count > 0 else 0.0,
    }


async def calculate_usage_statistics(
    blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    """Calculate comprehensive usage statistics.

    Args:
        blocks: List of session blocks

    Returns:
        Dictionary with comprehensive statistics including:
        - trend analysis
        - session patterns
        - P90 limit
        - cost statistics

    """
    if not blocks:
        return {
            "trend": await analyze_trend([]),
            "patterns": await analyze_session_patterns([]),
            "p90_limit": None,
            "cost_stats": {
                "total_cost": 0.0,
                "avg_cost_per_session": 0.0,
                "cost_per_hour": 0.0,
            },
        }

    # Calculate P90 limit
    calculator = P90Calculator()
    p90_limit = calculator.calculate_p90_limit(blocks)

    # Calculate cost statistics
    valid_blocks = [b for b in blocks if not b.get("isGap", False)]
    total_cost = sum(b.get("costUSD", 0.0) for b in valid_blocks)
    avg_cost_per_session = total_cost / len(valid_blocks) if valid_blocks else 0.0

    # Calculate cost per hour
    total_hours = sum(b.get("durationMinutes", 0) for b in valid_blocks) / 60
    cost_per_hour = total_cost / total_hours if total_hours > 0 else 0.0

    return {
        "trend": await analyze_trend(blocks),
        "patterns": await analyze_session_patterns(blocks),
        "p90_limit": p90_limit,
        "cost_stats": {
            "total_cost": total_cost,
            "avg_cost_per_session": avg_cost_per_session,
            "cost_per_hour": cost_per_hour,
        },
    }
