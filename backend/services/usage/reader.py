"""Usage data reader for Claude Log Viewer.

This module provides functionality to read and parse token usage data
from Claude CLI JSONL log files.
"""

import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from .data_processors import DataConverter, TimestampProcessor, TokenExtractor
from .models import CostMode, UsageEntry
from .pricing import PricingCalculator

logger = logging.getLogger(__name__)

FIELD_COST_USD = "cost_usd"
FIELD_MODEL = "model"
TOKEN_INPUT = "input_tokens"
TOKEN_OUTPUT = "output_tokens"


class UsageReader:
    """Reader for Claude usage data from JSONL files."""

    def __init__(self, data_path: str | None = None):
        """Initialize the usage reader.

        Args:
            data_path: Path to Claude data directory (defaults to ~/.claude/projects)

        """
        self.data_path = Path(data_path if data_path else "~/.claude/projects").expanduser()
        self.pricing_calculator = PricingCalculator()
        self.timestamp_processor = TimestampProcessor()

    async def load_usage_entries(
        self,
        hours_back: int | None = None,
        mode: CostMode = CostMode.AUTO,
        include_raw: bool = False,
    ) -> tuple[list[UsageEntry], list[dict[str, Any]] | None]:
        """Load and convert JSONL files to UsageEntry objects.

        Args:
            hours_back: Only include entries from last N hours
            mode: Cost calculation mode
            include_raw: Whether to return raw JSON data alongside entries

        Returns:
            Tuple of (usage_entries, raw_data) where raw_data is None unless include_raw=True

        """
        cutoff_time = None
        if hours_back:
            cutoff_time = datetime.now(UTC) - timedelta(hours=hours_back)

        jsonl_files = self._find_jsonl_files()
        if not jsonl_files:
            logger.warning("No JSONL files found in %s", self.data_path)
            return [], None

        all_entries: list[UsageEntry] = []
        raw_entries: list[dict[str, Any]] | None = [] if include_raw else None
        processed_hashes: set[str] = set()

        for file_path in jsonl_files:
            entries, raw_data = await self._process_single_file(
                file_path,
                mode,
                cutoff_time,
                processed_hashes,
                include_raw,
            )
            all_entries.extend(entries)
            if include_raw and raw_data:
                raw_entries.extend(raw_data)  # type: ignore

        all_entries.sort(key=lambda e: e.timestamp)

        logger.info(f"Processed {len(all_entries)} entries from {len(jsonl_files)} files")

        return all_entries, raw_entries

    def _find_jsonl_files(self) -> list[Path]:
        """Find all .jsonl files in the data directory."""
        if not self.data_path.exists():
            logger.warning("Data path does not exist: %s", self.data_path)
            return []
        return list(self.data_path.rglob("*.jsonl"))

    async def _process_single_file(
        self,
        file_path: Path,
        mode: CostMode,
        cutoff_time: datetime | None,
        processed_hashes: set[str],
        include_raw: bool,
    ) -> tuple[list[UsageEntry], list[dict[str, Any]] | None]:
        """Process a single JSONL file."""
        entries: list[UsageEntry] = []
        raw_data: list[dict[str, Any]] | None = [] if include_raw else None

        try:
            entries_read = 0
            entries_filtered = 0
            entries_mapped = 0

            with open(file_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        data = json.loads(line)
                        entries_read += 1

                        if not self._should_process_entry(
                            data, cutoff_time, processed_hashes,
                        ):
                            entries_filtered += 1
                            continue

                        entry = self._map_to_usage_entry(data, mode)
                        if entry:
                            entries_mapped += 1
                            entries.append(entry)
                            self._update_processed_hashes(data, processed_hashes)

                        if include_raw:
                            raw_data.append(data)  # type: ignore

                    except json.JSONDecodeError as e:
                        logger.debug(f"Failed to parse JSON line in {file_path}: {e}")
                        continue

            logger.debug(
                f"File {file_path.name}: {entries_read} read, "
                f"{entries_filtered} filtered out, {entries_mapped} successfully mapped",
            )

        except Exception as e:
            logger.warning("Failed to read file %s: %s", file_path, e)
            return [], None

        return entries, raw_data

    def _should_process_entry(
        self,
        data: dict[str, Any],
        cutoff_time: datetime | None,
        processed_hashes: set[str],
    ) -> bool:
        """Check if entry should be processed based on time and uniqueness."""
        if cutoff_time:
            timestamp_str = data.get("timestamp")
            if timestamp_str:
                timestamp = self.timestamp_processor.parse_timestamp(timestamp_str)
                if timestamp and timestamp < cutoff_time:
                    return False

        unique_hash = self._create_unique_hash(data)
        return not (unique_hash and unique_hash in processed_hashes)

    def _create_unique_hash(self, data: dict[str, Any]) -> str | None:
        """Create unique hash for deduplication."""
        message_id = data.get("message_id") or (
            data.get("message", {}).get("id")
            if isinstance(data.get("message"), dict)
            else None
        )
        request_id = data.get("requestId") or data.get("request_id")

        return f"{message_id}:{request_id}" if message_id and request_id else None

    def _update_processed_hashes(
        self, data: dict[str, Any], processed_hashes: set[str],
    ) -> None:
        """Update the processed hashes set with current entry's hash."""
        unique_hash = self._create_unique_hash(data)
        if unique_hash:
            processed_hashes.add(unique_hash)

    def _map_to_usage_entry(
        self,
        data: dict[str, Any],
        mode: CostMode,
    ) -> UsageEntry | None:
        """Map raw data to UsageEntry with proper cost calculation."""
        try:
            timestamp = self.timestamp_processor.parse_timestamp(data.get("timestamp", ""))
            if not timestamp:
                return None

            token_data = TokenExtractor.extract_tokens(data)
            if not any(v for k, v in token_data.items() if k != "total_tokens"):
                return None

            model = DataConverter.extract_model_name(data, default="unknown")

            entry_data: dict[str, Any] = {
                FIELD_MODEL: model,
                TOKEN_INPUT: token_data["input_tokens"],
                TOKEN_OUTPUT: token_data["output_tokens"],
                "cache_creation_tokens": token_data.get("cache_creation_tokens", 0),
                "cache_read_tokens": token_data.get("cache_read_tokens", 0),
                FIELD_COST_USD: data.get("cost") or data.get(FIELD_COST_USD),
            }
            cost_usd = self.pricing_calculator.calculate_cost_for_entry(entry_data, mode)

            message = data.get("message", {})
            message_id = data.get("message_id") or message.get("id") or ""
            request_id = data.get("request_id") or data.get("requestId") or "unknown"

            return UsageEntry(
                timestamp=timestamp,
                input_tokens=token_data["input_tokens"],
                output_tokens=token_data["output_tokens"],
                cache_creation_tokens=token_data.get("cache_creation_tokens", 0),
                cache_read_tokens=token_data.get("cache_read_tokens", 0),
                cost_usd=cost_usd,
                model=model,
                message_id=message_id,
                request_id=request_id,
            )

        except (KeyError, ValueError, TypeError, AttributeError) as e:
            logger.debug(f"Failed to map entry: {type(e).__name__}: {e}")
            return None


async def load_usage_entries(
    data_path: str | None = None,
    hours_back: int | None = None,
    mode: CostMode = CostMode.AUTO,
    include_raw: bool = False,
) -> tuple[list[UsageEntry], list[dict[str, Any]] | None]:
    """Load and convert JSONL files to UsageEntry objects.

    Args:
        data_path: Path to Claude data directory (defaults to ~/.claude/projects)
        hours_back: Only include entries from last N hours
        mode: Cost calculation mode
        include_raw: Whether to return raw JSON data alongside entries

    Returns:
        Tuple of (usage_entries, raw_data) where raw_data is None unless include_raw=True

    """
    reader = UsageReader(data_path)
    return await reader.load_usage_entries(hours_back, mode, include_raw)
