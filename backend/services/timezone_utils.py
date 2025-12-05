"""Timezone conversion utilities.

Provides functions to convert UTC datetimes to local timezone.
"""

from datetime import datetime, timezone


def utc_to_local(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to local timezone.

    Args:
        utc_dt: A datetime object (can be UTC-aware, other TZ-aware, or naive)

    Returns:
        A datetime object in the local timezone

    Notes:
        - Naive datetimes (without tzinfo) are assumed to be UTC
        - Already localized datetimes are converted to local timezone

    """
    if utc_dt.tzinfo is None:
        # Assume naive datetime is UTC
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)

    # Convert to local timezone
    return utc_dt.astimezone()


def format_local_time(dt: datetime, fmt: str = "%H:%M:%S") -> str:
    """Format a datetime as local time string.

    Args:
        dt: A datetime object (can be UTC-aware, other TZ-aware, or naive)
        fmt: strftime format string (default: "%H:%M:%S")

    Returns:
        Formatted time string in local timezone

    """
    local_dt = utc_to_local(dt)
    return local_dt.strftime(fmt)
