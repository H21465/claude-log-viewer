#!/usr/bin/env python3
"""Rich-based terminal CLI for Claude Log Viewer.

Displays URLs and live status updates for Claude API communication.
Supports server start/stop/restart via keyboard shortcuts.
"""

import asyncio
import os
import queue
import select
import signal
import sys
import termios
import threading
import tty
from collections import deque
from datetime import datetime
from typing import Any

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from services.server_manager import ServerManager
from services.timezone_utils import format_local_time
from services.usage.models import UsageEntry
from services.usage.reader import UsageReader

# Constants
FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://localhost:8000"
MAX_STATUS_ENTRIES = 10
REFRESH_INTERVAL = 0.5  # seconds


class StatusEntry:
    """Represents a single status entry for display."""

    def __init__(
        self,
        timestamp: datetime,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cache_read: int,
        cache_create: int,
        cost_usd: float,
        status: str = "OK",
    ) -> None:
        self.timestamp = timestamp
        self.model = model
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.cache_read = cache_read
        self.cache_create = cache_create
        self.cost_usd = cost_usd
        self.status = status


class KeyboardReader:
    """Reads keyboard input in a separate thread."""

    def __init__(self) -> None:
        self.key_queue: queue.Queue[str] = queue.Queue()
        self._running = False
        self._thread: threading.Thread | None = None
        self._old_settings: list | None = None

    def start(self) -> None:
        """Start the keyboard reader thread."""
        if self._running:
            return

        # Save and set terminal settings
        self._old_settings = termios.tcgetattr(sys.stdin)
        tty.setcbreak(sys.stdin.fileno())

        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stop the keyboard reader thread."""
        self._running = False
        if self._old_settings:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self._old_settings)

    def _read_loop(self) -> None:
        """Read keys in a loop using select for non-blocking reads."""
        fd = sys.stdin.fileno()
        while self._running:
            try:
                # Use select with timeout to avoid blocking forever
                readable, _, _ = select.select([sys.stdin], [], [], 0.1)
                if readable:
                    char = os.read(fd, 1).decode("utf-8", errors="ignore")
                    if char:
                        self.key_queue.put(char)
            except Exception:
                break

    def get_key(self) -> str | None:
        """Get a key from the queue without blocking.

        Returns:
            The key pressed, or None if no key is available

        """
        try:
            return self.key_queue.get_nowait()
        except queue.Empty:
            return None


class ClaudeLogViewerCLI:
    """Rich-based CLI for Claude Log Viewer."""

    def __init__(self) -> None:
        self.console = Console()
        self.status_entries: deque[StatusEntry] = deque(maxlen=MAX_STATUS_ENTRIES)
        self.running = True
        self.last_seen_timestamp: datetime | None = None
        self.total_cost_session = 0.0
        self.total_requests = 0
        self.server_manager = ServerManager()
        self.action_message: str | None = None
        self.action_message_time: datetime | None = None
        self.keyboard_reader = KeyboardReader()
        self._data_refresh_counter = 0

    def _get_server_status_indicator(self, is_running: bool) -> Text:
        """Create a status indicator for server state."""
        if is_running:
            return Text("Running", style="bold green")
        return Text("Stopped", style="bold red")

    def _create_url_panel(self) -> Panel:
        """Create the URL display panel with server status."""
        status = self.server_manager.get_status()

        url_text = Text()
        url_text.append("Frontend: ", style="bold cyan")
        url_text.append(f"{FRONTEND_URL} ", style="underline blue link")
        url_text.append("[")
        url_text.append_text(self._get_server_status_indicator(status["frontend"]))
        url_text.append("]\n")

        url_text.append("Backend:  ", style="bold cyan")
        url_text.append(f"{BACKEND_URL} ", style="underline blue link")
        url_text.append("[")
        url_text.append_text(self._get_server_status_indicator(status["backend"]))
        url_text.append("]")

        return Panel(
            url_text,
            title="[bold green]Claude Log Viewer URLs",
            border_style="green",
            padding=(0, 1),
        )

    def _create_summary_panel(self) -> Panel:
        """Create the session summary panel."""
        summary_text = Text()
        summary_text.append("Session Requests: ", style="bold")
        summary_text.append(f"{self.total_requests}\n", style="cyan")
        summary_text.append("Session Cost: ", style="bold")
        summary_text.append(f"${self.total_cost_session:.4f}", style="yellow")

        return Panel(
            summary_text,
            title="[bold yellow]Session Summary",
            border_style="yellow",
            padding=(0, 1),
        )

    def _create_status_table(self) -> Table:
        """Create the status table with recent API calls."""
        table = Table(
            title="Recent API Requests (Last 10)",
            show_header=True,
            header_style="bold magenta",
            border_style="blue",
            expand=True,
        )

        table.add_column("Time", style="dim", width=12)
        table.add_column("Model", style="cyan", width=20)
        table.add_column("In", justify="right", style="green", width=8)
        table.add_column("Out", justify="right", style="yellow", width=8)
        table.add_column("Cache R", justify="right", style="blue", width=8)
        table.add_column("Cache W", justify="right", style="magenta", width=8)
        table.add_column("Cost", justify="right", style="red", width=10)
        table.add_column("Status", justify="center", width=8)

        for entry in reversed(list(self.status_entries)):
            time_str = format_local_time(entry.timestamp)
            model_name = self._shorten_model_name(entry.model)
            status_style = "green" if entry.status == "OK" else "red"

            table.add_row(
                time_str,
                model_name,
                f"{entry.input_tokens:,}",
                f"{entry.output_tokens:,}",
                f"{entry.cache_read:,}",
                f"{entry.cache_create:,}",
                f"${entry.cost_usd:.4f}",
                Text(entry.status, style=status_style),
            )

        # Fill empty rows if needed
        empty_rows = MAX_STATUS_ENTRIES - len(self.status_entries)
        for _ in range(empty_rows):
            table.add_row("-", "-", "-", "-", "-", "-", "-", "-", style="dim")

        return table

    def _shorten_model_name(self, model: str) -> str:
        """Shorten model name for display."""
        if not model:
            return "unknown"
        # Remove common prefixes and keep essential parts
        model = model.replace("claude-", "").replace("-20", " (")
        if "(" in model and not model.endswith(")"):
            model += ")"
        if len(model) > 18:
            model = model[:15] + "..."
        return model

    def _create_layout(self) -> Layout:
        """Create the main layout."""
        layout = Layout()

        layout.split_column(
            Layout(name="header", size=5),
            Layout(name="body"),
            Layout(name="footer", size=3),
        )

        layout["header"].split_row(
            Layout(name="urls", ratio=2),
            Layout(name="summary", ratio=1),
        )

        layout["urls"].update(self._create_url_panel())
        layout["summary"].update(self._create_summary_panel())
        layout["body"].update(
            Panel(
                self._create_status_table(),
                title="[bold blue]Communication Status",
                border_style="blue",
            ),
        )

        footer_text = Text()

        # Keyboard shortcuts
        footer_text.append("[s]", style="bold cyan")
        footer_text.append("Start ", style="dim")
        footer_text.append("[x]", style="bold red")
        footer_text.append("Stop ", style="dim")
        footer_text.append("[r]", style="bold yellow")
        footer_text.append("Restart ", style="dim")
        footer_text.append("[q]", style="bold magenta")
        footer_text.append("Quit", style="dim")

        footer_text.append(" | ", style="dim")
        footer_text.append("Last update: ", style="dim")
        footer_text.append(datetime.now().strftime("%H:%M:%S"), style="green")

        # Show action message if recent
        if self.action_message and self.action_message_time:
            elapsed = (datetime.now() - self.action_message_time).total_seconds()
            if elapsed < 3.0:  # Show for 3 seconds
                footer_text.append(" | ", style="dim")
                footer_text.append(self.action_message, style="bold yellow")
            else:
                self.action_message = None

        layout["footer"].update(
            Panel(footer_text, border_style="dim"),
        )

        return layout

    def _usage_entry_to_status(self, entry: UsageEntry) -> StatusEntry:
        """Convert UsageEntry to StatusEntry."""
        return StatusEntry(
            timestamp=entry.timestamp,
            model=entry.model,
            input_tokens=entry.input_tokens,
            output_tokens=entry.output_tokens,
            cache_read=entry.cache_read_tokens,
            cache_create=entry.cache_creation_tokens,
            cost_usd=entry.cost_usd,
            status="OK",
        )

    async def _fetch_latest_entries(self) -> list[UsageEntry]:
        """Fetch the latest usage entries from Claude logs."""
        try:
            reader = UsageReader()
            entries, _ = await reader.load_usage_entries(hours_back=1)
            return entries
        except Exception as e:
            self.console.print(f"[red]Error fetching entries: {e}[/red]")
            return []

    async def _update_status_entries(self) -> None:
        """Update status entries with latest data."""
        entries = await self._fetch_latest_entries()

        if not entries:
            return

        # Filter new entries
        new_entries = []
        for entry in entries:
            if self.last_seen_timestamp is None or entry.timestamp > self.last_seen_timestamp:
                new_entries.append(entry)

        # Add new entries
        for entry in new_entries:
            status_entry = self._usage_entry_to_status(entry)
            self.status_entries.append(status_entry)
            self.total_cost_session += entry.cost_usd
            self.total_requests += 1

        # Update last seen timestamp
        if entries:
            self.last_seen_timestamp = max(e.timestamp for e in entries)

    def _set_action_message(self, message: str) -> None:
        """Set a temporary action message to display."""
        self.action_message = message
        self.action_message_time = datetime.now()

    def _handle_key(self, key: str) -> bool:
        """Handle keyboard input.

        Returns:
            False if should quit, True otherwise

        """
        key_lower = key.lower()

        if key_lower == "q":
            self._set_action_message("Quitting...")
            return False

        if key_lower == "s":
            self._set_action_message("Starting servers...")
            backend, frontend = self.server_manager.start_all()
            if backend and frontend:
                self._set_action_message("Servers started successfully!")
            else:
                self._set_action_message("Failed to start some servers")
            return True

        if key_lower == "x":
            self._set_action_message("Stopping servers...")
            backend, frontend = self.server_manager.stop_all()
            if backend and frontend:
                self._set_action_message("Servers stopped successfully!")
            else:
                self._set_action_message("Failed to stop some servers")
            return True

        if key_lower == "r":
            self._set_action_message("Restarting servers...")
            backend, frontend = self.server_manager.restart_all()
            if backend and frontend:
                self._set_action_message("Servers restarted successfully!")
            else:
                self._set_action_message("Failed to restart some servers")
            return True

        return True

    async def run(self) -> None:
        """Run the CLI application."""
        self.console.clear()
        self.console.print("[bold green]Starting Claude Log Viewer CLI...[/bold green]\n")

        # Initial load
        await self._update_status_entries()

        # If no entries, show message
        if not self.status_entries:
            self.console.print("[yellow]No recent API calls found. Waiting for activity...[/yellow]\n")

        # Start keyboard reader in separate thread
        self.keyboard_reader.start()

        try:
            with Live(
                self._create_layout(),
                console=self.console,
                refresh_per_second=4,
                screen=True,
            ) as live:
                while self.running:
                    # Check for keyboard input from the reader thread
                    key = self.keyboard_reader.get_key()
                    if key:
                        if not self._handle_key(key):
                            self.running = False
                            break

                    # Update data less frequently (every 4th iteration = ~2 seconds)
                    self._data_refresh_counter += 1
                    if self._data_refresh_counter >= 4:
                        await self._update_status_entries()
                        self._data_refresh_counter = 0

                    live.update(self._create_layout())
                    await asyncio.sleep(REFRESH_INTERVAL)

        except KeyboardInterrupt:
            pass
        finally:
            # Stop keyboard reader
            self.keyboard_reader.stop()
            # Clean up servers on exit
            self.server_manager.stop_all()
            self.console.print("\n[yellow]Shutting down...[/yellow]")


def main() -> None:
    """Main entry point."""
    cli = ClaudeLogViewerCLI()

    def signal_handler(sig: int, frame: Any) -> None:
        cli.running = False

    signal.signal(signal.SIGINT, signal_handler)

    asyncio.run(cli.run())


if __name__ == "__main__":
    main()
