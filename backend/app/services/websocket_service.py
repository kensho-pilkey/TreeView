from fastapi import WebSocket
from typing import Dict, Any, List, Optional
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.websockets.connection_manager import manager

async def broadcast_factory_created(factory_data: Dict[str, Any]) -> None:
    """
    Broadcast a factory creation event to all connected clients.
    
    Args:
        factory_data: Dictionary containing factory data
    """
    await manager.broadcast({
        "action": "factory_created",
        "data": {
            "id": str(factory_data["id"]),
            "name": factory_data["name"],
            "lower_bound": factory_data["lower_bound"],
            "upper_bound": factory_data["upper_bound"],
            "child_count": factory_data["child_count"],
            "tree_id": str(factory_data["tree_id"]),
            "children": []
        }
    })
    logger.info(f"Broadcast factory_created: {factory_data['id']}")

async def broadcast_factory_updated(factory_data: Dict[str, Any]) -> None:
    """
    Broadcast a factory update event to all connected clients.
    
    Args:
        factory_data: Dictionary containing factory data
    """
    await manager.broadcast({
        "action": "factory_updated",
        "data": {
            "id": str(factory_data["id"]),
            "name": factory_data["name"],
            "lower_bound": factory_data["lower_bound"],
            "upper_bound": factory_data["upper_bound"],
            "child_count": factory_data["child_count"],
            "tree_id": str(factory_data["tree_id"])
        }
    })
    logger.info(f"Broadcast factory_updated: {factory_data['id']}")

async def broadcast_factory_deleted(factory_id: str, tree_id: str) -> None:
    """
    Broadcast a factory deletion event to all connected clients.
    
    Args:
        factory_id: String UUID of the deleted factory
        tree_id: String UUID of the tree the factory belonged to
    """
    await manager.broadcast({
        "action": "factory_deleted",
        "data": {
            "id": factory_id,
            "tree_id": tree_id
        }
    })
    logger.info(f"Broadcast factory_deleted: {factory_id}")

async def broadcast_children_generated(factory_id: str, children_data: List[Dict[str, Any]]) -> None:
    """
    Broadcast a children generation event to all connected clients.
    
    Args:
        factory_id: String UUID of the factory
        children_data: List of dictionaries containing child data
    """
    await manager.broadcast({
        "action": "children_generated",
        "data": {
            "factory_id": factory_id,
            "children": children_data
        }
    })
    logger.info(f"Broadcast children_generated for factory: {factory_id}, count: {len(children_data)}")

async def send_connection_established(websocket: WebSocket) -> None:
    """
    Send a connection established message to a client.
    
    Args:
        websocket: The WebSocket connection
    """
    await manager.send_personal_message(
        {
            "action": "connection_established",
            "data": {
                "message": "Connected to WebSocket",
                "connections": manager.get_connection_count()
            }
        },
        websocket
    )
    logger.info(f"New WebSocket connection established, total: {manager.get_connection_count()}")

async def send_error_message(websocket: WebSocket, message: str) -> None:
    """
    Send an error message to a client.
    
    Args:
        websocket: The WebSocket connection
        message: Error message to send
    """
    await manager.send_personal_message(
        {
            "action": "error",
            "data": {
                "message": message
            }
        },
        websocket
    )
    logger.error(f"Sent error to client: {message}")

async def broadcast_client_disconnected() -> None:
    """
    Broadcast a client disconnection event to all connected clients.
    """
    await manager.broadcast(
        {
            "action": "client_disconnected",
            "data": {
                "connections": manager.get_connection_count()
            }
        }
    )
    logger.info(f"Client disconnected, remaining: {manager.get_connection_count()}")

async def handle_ping(websocket: WebSocket, timestamp: Optional[str] = None) -> None:
    """
    Send a pong response to a ping message.
    
    Args:
        websocket: The WebSocket connection
        timestamp: Optional timestamp from the client's ping
    """
    await manager.send_personal_message(
        {
            "action": "pong",
            "data": {
                "message": "Pong!",
                "timestamp": timestamp
            }
        },
        websocket
    )
    logger.debug("Responded to ping")

def get_connection_stats() -> Dict[str, int]:
    """
    Get statistics about WebSocket connections.
    
    Returns:
        Dictionary with connection statistics
    """
    return {
        "active_connections": manager.get_connection_count()
    }