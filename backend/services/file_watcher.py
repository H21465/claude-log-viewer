"""File watcher service for monitoring Claude log changes."""

import asyncio
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from watchdog.events import FileModifiedEvent, FileSystemEventHandler
from watchdog.observers import Observer

from services.log_parser import get_claude_logs_dir


class LogFileHandler(FileSystemEventHandler):
    """Handles file system events for Claude log files."""

    def __init__(
        self,
        on_change: Callable[[str, str, dict[str, Any]], None],
        loop: asyncio.AbstractEventLoop,
    ) -> None:
        """Initialize the handler.

        Args:
            on_change: Callback function(project_path, session_id, new_messages)
            loop: asyncio event loop for running async callbacks

        """
        self.on_change = on_change
        self.loop = loop
        self._file_positions: dict[str, int] = {}
        self._debounce_tasks: dict[str, asyncio.TimerHandle] = {}
        self._debounce_delay = 0.5  # seconds

    def on_modified(self, event: FileModifiedEvent) -> None:
        """Handle file modification events.

        Args:
            event: The file system event

        """
        if event.is_directory:
            return

        path = event.src_path
        if not path.endswith(".jsonl"):
            return

        # Debounce: cancel previous task and schedule new one
        if path in self._debounce_tasks:
            self._debounce_tasks[path].cancel()

        # Schedule processing after debounce delay
        self._debounce_tasks[path] = self.loop.call_later(
            self._debounce_delay,
            lambda p=path: asyncio.run_coroutine_threadsafe(
                self._process_file_change(p), self.loop,
            ),
        )

    async def _process_file_change(self, file_path: str) -> None:
        """Process a file change after debouncing.

        Args:
            file_path: Path to the changed file

        """
        try:
            # Extract project hash and session from path
            # Path format: ~/.claude/projects/{project_hash}/{session_id}.jsonl
            path = Path(file_path)

            # Session ID is the filename without extension
            session_id = path.stem
            # Project hash is the parent directory name
            project_hash = path.parent.name

            print(f"File changed: {file_path}")
            print(f"  Project hash: {project_hash}, Session: {session_id}")

            # Decode project path from hash (e.g., -Users-hayamamo-projects-tmp-live -> /Users/hayamamo/projects/tmp/live)
            project_path = self._decode_project_path(project_hash)

            print(f"  Decoded project path: {project_path}")

            # Read new lines from file
            new_messages = self._read_new_lines(file_path)
            if not new_messages:
                print("  No new messages")
                return

            print(f"  New messages: {len(new_messages)}")

            # Call the callback
            print("  Calling on_change callback...")
            self.on_change(project_path, session_id, {
                "type": "new_messages",
                "project_path": project_path,
                "session_id": session_id,
                "messages": new_messages,
            })
            print("  Callback completed")

        except Exception as e:
            print(f"Error processing file change: {e}")
            import traceback
            traceback.print_exc()

    def _decode_project_path(self, encoded_name: str) -> str:
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

    def _read_new_lines(self, file_path: str) -> list[dict]:
        """Read new lines from a file since last read.

        Args:
            file_path: Path to the file

        Returns:
            List of new message dictionaries

        """
        current_pos = self._file_positions.get(file_path, 0)
        new_messages = []

        try:
            with open(file_path, encoding="utf-8") as f:
                # Get file size
                f.seek(0, 2)
                file_size = f.tell()

                # If file is smaller, it was truncated - read from start
                if file_size < current_pos:
                    current_pos = 0

                f.seek(current_pos)
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            msg = json.loads(line)
                            new_messages.append(msg)
                        except json.JSONDecodeError:
                            pass

                # Update position
                self._file_positions[file_path] = f.tell()

        except Exception as e:
            print(f"Error reading file {file_path}: {e}")

        return new_messages


class FileWatcher:
    """Watches Claude log directories for changes."""

    def __init__(self) -> None:
        """Initialize the file watcher."""
        self.observer: Observer | None = None
        self.handler: LogFileHandler | None = None
        self._callbacks: list[Callable[[str, str, dict[str, Any]], None]] = []
        self._running = False

    def add_callback(
        self, callback: Callable[[str, str, dict[str, Any]], None],
    ) -> None:
        """Add a callback for file changes.

        Args:
            callback: Function to call on changes (project_path, session_id, data)

        """
        self._callbacks.append(callback)

    def _on_change(self, project_path: str, session_id: str, data: dict[str, Any]) -> None:
        """Internal change handler that calls all callbacks.

        Args:
            project_path: Path to the project
            session_id: Session ID
            data: Change data

        """
        for callback in self._callbacks:
            try:
                callback(project_path, session_id, data)
            except Exception as e:
                print(f"Error in file watcher callback: {e}")

    def start(self, loop: asyncio.AbstractEventLoop) -> None:
        """Start watching for file changes.

        Args:
            loop: asyncio event loop

        """
        if self._running:
            return

        logs_dir = get_claude_logs_dir()
        watch_path = logs_dir / "projects"

        if not watch_path.exists():
            print(f"Watch path does not exist: {watch_path}")
            return

        self.handler = LogFileHandler(self._on_change, loop)
        self.observer = Observer()
        self.observer.schedule(self.handler, str(watch_path), recursive=True)
        self.observer.start()
        self._running = True
        print(f"File watcher started: {watch_path}")

    def stop(self) -> None:
        """Stop watching for file changes."""
        if self.observer and self._running:
            self.observer.stop()
            self.observer.join()
            self._running = False
            print("File watcher stopped")


# Global instance
file_watcher = FileWatcher()
