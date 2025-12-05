"""Tests for ServerManager class.

Tests server start/stop/restart functionality with mocked subprocesses.
"""

import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import will fail until implementation exists - this is expected in RED phase
from services.server_manager import ServerManager


class TestServerManagerInit:
    """Test ServerManager initialization."""

    def test_initial_state(self) -> None:
        """SM-001: Initial state should have no processes."""
        manager = ServerManager()
        assert manager.backend_process is None
        assert manager.frontend_process is None

    def test_initial_backend_not_running(self) -> None:
        """SM-002: Backend should not be running initially."""
        manager = ServerManager()
        assert manager.is_backend_running() is False

    def test_initial_frontend_not_running(self) -> None:
        """SM-002b: Frontend should not be running initially."""
        manager = ServerManager()
        assert manager.is_frontend_running() is False

    def test_initial_get_status(self) -> None:
        """SM-003: get_status should return both as stopped."""
        manager = ServerManager()
        status = manager.get_status()
        assert status == {"backend": False, "frontend": False}


class TestBackendStartStop:
    """Test backend server start and stop."""

    @patch("subprocess.Popen")
    def test_start_backend_success(self, mock_popen: MagicMock) -> None:
        """SM-010: Backend should start successfully."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None  # Process is running
        mock_process.pid = 12345
        mock_popen.return_value = mock_process

        manager = ServerManager()
        result = manager.start_backend()

        assert result is True
        assert manager.backend_process is not None
        mock_popen.assert_called_once()

    @patch("subprocess.Popen")
    def test_backend_running_after_start(self, mock_popen: MagicMock) -> None:
        """SM-011: Backend should report as running after start."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_process.pid = 12345
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()

        assert manager.is_backend_running() is True

    @patch("subprocess.Popen")
    def test_double_start_backend(self, mock_popen: MagicMock) -> None:
        """SM-012: Double start should keep existing process."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_process.pid = 12345
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()
        result = manager.start_backend()  # Second start

        assert result is True
        assert mock_popen.call_count == 1  # Only called once

    @patch("subprocess.Popen")
    def test_start_backend_failure(self, mock_popen: MagicMock) -> None:
        """SM-013: Backend start should fail gracefully on error."""
        mock_popen.side_effect = OSError("Port already in use")

        manager = ServerManager()
        result = manager.start_backend()

        assert result is False
        assert manager.backend_process is None

    @patch("subprocess.Popen")
    def test_stop_backend_success(self, mock_popen: MagicMock) -> None:
        """SM-020: Backend should stop successfully."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_process.pid = 12345
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()
        result = manager.stop_backend()

        assert result is True
        mock_process.terminate.assert_called_once()

    @patch("subprocess.Popen")
    def test_backend_not_running_after_stop(self, mock_popen: MagicMock) -> None:
        """SM-021: Backend should not be running after stop."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()

        # Simulate process termination
        mock_process.poll.return_value = 0  # Process exited
        manager.stop_backend()

        assert manager.is_backend_running() is False

    def test_stop_backend_when_not_running(self) -> None:
        """SM-022: Stopping non-running backend should return True."""
        manager = ServerManager()
        result = manager.stop_backend()
        assert result is True

    @patch("subprocess.Popen")
    def test_force_stop_backend(self, mock_popen: MagicMock) -> None:
        """SM-023: Force stop should send SIGKILL."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_process.pid = 12345
        # Simulate terminate not working
        mock_process.wait.side_effect = [subprocess.TimeoutExpired("cmd", 5), None]
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()
        result = manager.stop_backend(force=True)

        assert result is True
        mock_process.kill.assert_called()


class TestFrontendStartStop:
    """Test frontend server start and stop."""

    @patch("subprocess.Popen")
    def test_start_frontend_success(self, mock_popen: MagicMock) -> None:
        """SM-030: Frontend should start successfully."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_process.pid = 12346
        mock_popen.return_value = mock_process

        manager = ServerManager()
        result = manager.start_frontend()

        assert result is True
        assert manager.frontend_process is not None

    @patch("subprocess.Popen")
    def test_frontend_running_after_start(self, mock_popen: MagicMock) -> None:
        """SM-031: Frontend should report as running after start."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_frontend()

        assert manager.is_frontend_running() is True

    @patch("subprocess.Popen")
    def test_stop_frontend_success(self, mock_popen: MagicMock) -> None:
        """SM-032: Frontend should stop successfully."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_frontend()
        result = manager.stop_frontend()

        assert result is True
        mock_process.terminate.assert_called_once()

    @patch("subprocess.Popen")
    def test_double_start_frontend(self, mock_popen: MagicMock) -> None:
        """SM-033: Double start should keep existing process."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_frontend()
        result = manager.start_frontend()

        assert result is True
        assert mock_popen.call_count == 1


class TestBatchOperations:
    """Test batch start/stop/restart operations."""

    @patch("subprocess.Popen")
    def test_start_all(self, mock_popen: MagicMock) -> None:
        """SM-040: start_all should start both servers."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        result = manager.start_all()

        assert result == (True, True)
        assert mock_popen.call_count == 2

    @patch("subprocess.Popen")
    def test_stop_all(self, mock_popen: MagicMock) -> None:
        """SM-041: stop_all should stop both servers."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_all()

        # Simulate processes exiting after terminate
        mock_process.poll.return_value = 0
        result = manager.stop_all()

        assert result == (True, True)

    @patch("subprocess.Popen")
    def test_restart_all(self, mock_popen: MagicMock) -> None:
        """SM-042: restart_all should stop then start both servers."""
        # Create separate mock processes for each start
        mock_processes = []

        def create_mock_process(*args, **kwargs):  # noqa: ARG001
            mock_process = MagicMock()
            mock_process.poll.return_value = None
            mock_process.pid = 12345 + len(mock_processes)
            mock_processes.append(mock_process)
            return mock_process

        mock_popen.side_effect = create_mock_process

        manager = ServerManager()
        manager.start_all()  # Creates 2 processes

        assert mock_popen.call_count == 2

        result = manager.restart_all()

        assert result == (True, True)
        # Should have created 4 processes total (2 initial + 2 restart)
        assert mock_popen.call_count == 4

    @patch("subprocess.Popen")
    def test_stop_all_partial_running(self, mock_popen: MagicMock) -> None:
        """SM-043: stop_all with only backend running."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()  # Only start backend

        mock_process.poll.return_value = 0
        result = manager.stop_all()

        assert result == (True, True)


class TestExternalDetection:
    """Test detection of external process changes."""

    @patch("subprocess.Popen")
    def test_detect_external_backend_stop(self, mock_popen: MagicMock) -> None:
        """SM-050: Detect when backend is stopped externally."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()

        # Simulate external kill
        mock_process.poll.return_value = -9  # Killed

        assert manager.is_backend_running() is False


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_backend_command(self) -> None:
        """SM-060: Empty command should raise ValueError."""
        with pytest.raises(ValueError, match="backend_cmd"):
            ServerManager(backend_cmd="")

    def test_empty_frontend_command(self) -> None:
        """SM-060b: Empty frontend command should raise ValueError."""
        with pytest.raises(ValueError, match="frontend_cmd"):
            ServerManager(frontend_cmd="")

    @patch("subprocess.Popen")
    def test_invalid_command(self, mock_popen: MagicMock) -> None:
        """SM-061: Invalid command should fail gracefully."""
        mock_popen.side_effect = FileNotFoundError("Command not found")

        manager = ServerManager(backend_cmd="nonexistent_command")
        result = manager.start_backend()

        assert result is False

    @patch("subprocess.Popen")
    def test_cleanup_on_context_exit(self, mock_popen: MagicMock) -> None:
        """Test that cleanup stops all servers."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        with ServerManager() as manager:
            manager.start_all()

        # After context exit, terminate should be called
        assert mock_process.terminate.called


class TestGetStatus:
    """Test get_status method."""

    @patch("subprocess.Popen")
    def test_get_status_both_running(self, mock_popen: MagicMock) -> None:
        """Status should reflect both running."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_all()
        status = manager.get_status()

        assert status == {"backend": True, "frontend": True}

    @patch("subprocess.Popen")
    def test_get_status_backend_only(self, mock_popen: MagicMock) -> None:
        """Status should reflect only backend running."""
        mock_process = MagicMock()
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process

        manager = ServerManager()
        manager.start_backend()
        status = manager.get_status()

        assert status == {"backend": True, "frontend": False}
