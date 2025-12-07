"""Server manager for starting/stopping backend and frontend servers.

Provides process management for uvicorn (backend) and vite (frontend) servers.
"""

import logging
import subprocess
import time
from pathlib import Path
from typing import Self

from services.port_utils import (
    BACKEND_PORTS,
    cleanup_port_file,
    get_backend_port,
    read_port_file,
    write_port_file,
)

logger = logging.getLogger(__name__)

# Default commands (port will be dynamically set)
DEFAULT_FRONTEND_CMD = "npm run dev"

# Paths
BACKEND_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"

# Timeouts
STOP_TIMEOUT = 5  # seconds to wait for graceful shutdown
START_TIMEOUT = 10  # seconds to wait for server to start


class ServerManager:
    """Manages backend and frontend server processes.

    Provides methods to start, stop, and check status of servers.
    Can be used as a context manager for automatic cleanup.
    """

    def __init__(
        self,
        frontend_cmd: str | None = None,
        backend_dir: Path | None = None,
        frontend_dir: Path | None = None,
    ) -> None:
        """Initialize the server manager.

        Args:
            frontend_cmd: Command to start frontend server
            backend_dir: Working directory for backend
            frontend_dir: Working directory for frontend

        Raises:
            ValueError: If frontend_cmd is empty string

        """
        # Validate commands
        if frontend_cmd == "":
            raise ValueError("frontend_cmd cannot be empty")

        self._frontend_cmd = frontend_cmd or DEFAULT_FRONTEND_CMD
        self._backend_dir = backend_dir or BACKEND_DIR
        self._frontend_dir = frontend_dir or FRONTEND_DIR

        self.backend_process: subprocess.Popen | None = None
        self.frontend_process: subprocess.Popen | None = None
        self._backend_port: int | None = None

    def __enter__(self) -> Self:
        """Enter context manager."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:  # noqa: ANN001
        """Exit context manager, stopping all servers."""
        self.stop_all()

    def start_backend(self) -> bool:
        """Start the backend server with automatic port selection.

        Returns:
            True if server started successfully or already running

        """
        if self.is_backend_running():
            logger.info("Backend already running")
            return True

        try:
            # Find available port
            self._backend_port = get_backend_port()
            write_port_file(self._backend_port)

            backend_cmd = (
                f"uv run uvicorn main:app --host 0.0.0.0 --port {self._backend_port}"
            )
            logger.info(f"Starting backend: {backend_cmd}")
            self.backend_process = subprocess.Popen(
                backend_cmd,
                shell=True,
                cwd=self._backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            # Give it a moment to fail if it's going to
            time.sleep(0.5)
            if self.backend_process.poll() is not None:
                logger.error("Backend failed to start")
                self.backend_process = None
                self._backend_port = None
                cleanup_port_file()
                return False
            logger.info(
                f"Backend started on port {self._backend_port} "
                f"with PID {self.backend_process.pid}"
            )
            return True
        except (OSError, FileNotFoundError, RuntimeError) as e:
            logger.error(f"Failed to start backend: {e}")
            self.backend_process = None
            self._backend_port = None
            cleanup_port_file()
            return False

    def stop_backend(self, force: bool = False) -> bool:
        """Stop the backend server.

        Args:
            force: If True, send SIGKILL if graceful shutdown fails

        Returns:
            True if server stopped successfully or wasn't running

        """
        if self.backend_process is None:
            cleanup_port_file()
            return True

        if not self.is_backend_running():
            self.backend_process = None
            self._backend_port = None
            cleanup_port_file()
            return True

        try:
            logger.info("Stopping backend...")
            self.backend_process.terminate()

            try:
                self.backend_process.wait(timeout=STOP_TIMEOUT)
            except subprocess.TimeoutExpired:
                if force:
                    logger.warning("Backend not responding, forcing kill")
                    self.backend_process.kill()
                    self.backend_process.wait(timeout=STOP_TIMEOUT)
                else:
                    logger.error("Backend not responding to terminate")
                    return False

            logger.info("Backend stopped")
            self.backend_process = None
            self._backend_port = None
            cleanup_port_file()
            return True
        except Exception as e:
            logger.error(f"Error stopping backend: {e}")
            return False

    def start_frontend(self) -> bool:
        """Start the frontend server.

        Returns:
            True if server started successfully or already running

        """
        if self.is_frontend_running():
            logger.info("Frontend already running")
            return True

        try:
            logger.info(f"Starting frontend: {self._frontend_cmd}")
            self.frontend_process = subprocess.Popen(
                self._frontend_cmd,
                shell=True,
                cwd=self._frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            # Give it a moment to fail if it's going to
            time.sleep(0.5)
            if self.frontend_process.poll() is not None:
                logger.error("Frontend failed to start")
                self.frontend_process = None
                return False
            logger.info(f"Frontend started with PID {self.frontend_process.pid}")
            return True
        except (OSError, FileNotFoundError) as e:
            logger.error(f"Failed to start frontend: {e}")
            self.frontend_process = None
            return False

    def stop_frontend(self, force: bool = False) -> bool:
        """Stop the frontend server.

        Args:
            force: If True, send SIGKILL if graceful shutdown fails

        Returns:
            True if server stopped successfully or wasn't running

        """
        if self.frontend_process is None:
            return True

        if not self.is_frontend_running():
            self.frontend_process = None
            return True

        try:
            logger.info("Stopping frontend...")
            self.frontend_process.terminate()

            try:
                self.frontend_process.wait(timeout=STOP_TIMEOUT)
            except subprocess.TimeoutExpired:
                if force:
                    logger.warning("Frontend not responding, forcing kill")
                    self.frontend_process.kill()
                    self.frontend_process.wait(timeout=STOP_TIMEOUT)
                else:
                    logger.error("Frontend not responding to terminate")
                    return False

            logger.info("Frontend stopped")
            self.frontend_process = None
            return True
        except Exception as e:
            logger.error(f"Error stopping frontend: {e}")
            return False

    def start_all(self) -> tuple[bool, bool]:
        """Start both backend and frontend servers.

        Returns:
            Tuple of (backend_success, frontend_success)

        """
        backend_result = self.start_backend()
        frontend_result = self.start_frontend()
        return (backend_result, frontend_result)

    def stop_all(self, force: bool = False) -> tuple[bool, bool]:
        """Stop both backend and frontend servers.

        Args:
            force: If True, force kill unresponsive processes

        Returns:
            Tuple of (backend_success, frontend_success)

        """
        backend_result = self.stop_backend(force=force)
        frontend_result = self.stop_frontend(force=force)
        return (backend_result, frontend_result)

    def restart_all(self, force: bool = False) -> tuple[bool, bool]:
        """Restart both servers.

        Args:
            force: If True, force kill unresponsive processes

        Returns:
            Tuple of (backend_success, frontend_success)

        """
        self.stop_all(force=force)
        return self.start_all()

    def is_backend_running(self) -> bool:
        """Check if backend server is running.

        Returns:
            True if backend process is running

        """
        if self.backend_process is None:
            return False
        return self.backend_process.poll() is None

    def is_frontend_running(self) -> bool:
        """Check if frontend server is running.

        Returns:
            True if frontend process is running

        """
        if self.frontend_process is None:
            return False
        return self.frontend_process.poll() is None

    def get_status(self) -> dict[str, bool | int | None]:
        """Get status of both servers.

        Returns:
            Dictionary with 'backend', 'frontend' boolean status and 'backend_port'

        """
        return {
            "backend": self.is_backend_running(),
            "frontend": self.is_frontend_running(),
            "backend_port": self._backend_port or read_port_file(),
        }

    def get_backend_url(self) -> str:
        """Get the backend URL with current port.

        Returns:
            Backend URL string

        """
        port = self._backend_port or read_port_file() or BACKEND_PORTS[0]
        return f"http://localhost:{port}"
