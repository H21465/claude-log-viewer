"""Port utility functions for finding available ports.

Provides fallback port selection for backend and frontend servers.
"""

import socket
from pathlib import Path

# Default port configurations
BACKEND_PORTS = [8000, 8001, 8002, 8003, 8004]
FRONTEND_PORTS = [5173, 5174, 5175, 5176, 5177]

# Port file location (relative to project root)
PORT_FILE = Path(__file__).parent.parent.parent / ".backend_port"


def is_port_available(port: int, host: str = "0.0.0.0") -> bool:
    """Check if a port is available for binding.

    Args:
        port: Port number to check
        host: Host address to bind to

    Returns:
        True if port is available, False otherwise

    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return True
        except OSError:
            return False


def find_available_port(ports: list[int], host: str = "0.0.0.0") -> int | None:
    """Find the first available port from a list.

    Args:
        ports: List of port numbers to try
        host: Host address to bind to

    Returns:
        First available port number, or None if all ports are in use

    """
    for port in ports:
        if is_port_available(port, host):
            return port
    return None


def get_backend_port() -> int:
    """Get an available backend port from the fallback list.

    Returns:
        Available port number

    Raises:
        RuntimeError: If no ports are available

    """
    port = find_available_port(BACKEND_PORTS)
    if port is None:
        raise RuntimeError(
            f"No available backend ports found. Tried: {BACKEND_PORTS}"
        )
    return port


def write_port_file(port: int) -> None:
    """Write the current backend port to a file for frontend discovery.

    Args:
        port: Port number to write

    """
    PORT_FILE.write_text(str(port))


def read_port_file() -> int | None:
    """Read the backend port from the port file.

    Returns:
        Port number if file exists and is valid, None otherwise

    """
    if not PORT_FILE.exists():
        return None
    try:
        return int(PORT_FILE.read_text().strip())
    except (ValueError, OSError):
        return None


def cleanup_port_file() -> None:
    """Remove the port file."""
    if PORT_FILE.exists():
        PORT_FILE.unlink()
