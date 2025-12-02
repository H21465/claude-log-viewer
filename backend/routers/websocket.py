"""WebSocket API router for real-time updates."""

import asyncio
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.websocket_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str) -> None:
    """WebSocket endpoint for real-time project updates.

    Args:
        websocket: The WebSocket connection
        project_id: Project ID to subscribe to (use "all" for all projects)

    """
    await manager.connect(websocket, project_id)
    try:
        # Send initial connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "project_id": project_id,
                "message": "Connected to real-time updates",
            },
        )

        # Keep connection alive and listen for client messages
        while True:
            try:
                # Wait for client messages (ping/pong, etc.)
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0,
                )

                # Handle ping
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

            except TimeoutError:
                # Send keepalive ping
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:  # noqa: BLE001
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        print(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket, project_id)


async def broadcast_message_update(
    project_path: str,
    session_id: str,
    data: dict[str, Any],
) -> None:
    """Broadcast a message update to connected clients.

    Args:
        project_path: Path to the project
        session_id: Session ID
        data: Message data

    """
    # Broadcast to specific project subscribers
    # Note: We use project_path as the key, but clients may subscribe with project_id
    # For now, broadcast to "all" subscribers
    await manager.broadcast_all(
        {
            "type": "message_update",
            "project_path": project_path,
            "session_id": session_id,
            "data": data,
        },
    )


async def broadcast_usage_update(
    project_path: str,
    usage_summary: dict[str, Any],
) -> None:
    """Broadcast a usage update to connected clients.

    Args:
        project_path: Path to the project
        usage_summary: Usage summary data including tokens and costs

    """
    await manager.broadcast_all(
        {
            "type": "usage_update",
            "project_path": project_path,
            "data": usage_summary,
        },
    )
