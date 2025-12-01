"""WebSocket connection manager for real-time updates."""

import asyncio
import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages."""

    def __init__(self) -> None:
        """Initialize the connection manager."""
        self.active_connections: dict[str, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, project_id: str) -> None:
        """Accept a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            project_id: Project ID to subscribe to

        """
        await websocket.accept()
        async with self._lock:
            if project_id not in self.active_connections:
                self.active_connections[project_id] = []
            self.active_connections[project_id].append(websocket)

    async def disconnect(self, websocket: WebSocket, project_id: str) -> None:
        """Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection to remove
            project_id: Project ID the connection was subscribed to

        """
        async with self._lock:
            if project_id in self.active_connections:
                if websocket in self.active_connections[project_id]:
                    self.active_connections[project_id].remove(websocket)
                if not self.active_connections[project_id]:
                    del self.active_connections[project_id]

    async def broadcast_to_project(self, project_id: str, message: dict[str, Any]) -> None:
        """Broadcast a message to all connections for a project.

        Args:
            project_id: Project ID to broadcast to
            message: Message to send

        """
        async with self._lock:
            connections = self.active_connections.get(project_id, [])
            dead_connections = []

            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)

            # Clean up dead connections
            for conn in dead_connections:
                if conn in self.active_connections.get(project_id, []):
                    self.active_connections[project_id].remove(conn)

    async def broadcast_all(self, message: dict[str, Any]) -> None:
        """Broadcast a message to all connections.

        Args:
            message: Message to send

        """
        async with self._lock:
            for project_id in list(self.active_connections.keys()):
                for connection in self.active_connections[project_id]:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    def get_connected_projects(self) -> list[str]:
        """Get list of projects with active connections.

        Returns:
            List of project IDs with active connections

        """
        return list(self.active_connections.keys())


# Global instance
manager = ConnectionManager()
