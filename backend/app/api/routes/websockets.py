from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging

from app.websockets.connection_manager import manager
from app.db.database import get_db  # Updated this import

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    # Accept the connection
    await manager.connect(websocket)
    
    try:
        # Send initial connection status message
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
        
        # Listen for messages from the client
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            
            try:
                # Parse the received message as JSON
                message = json.loads(data)
                action = message.get("action")
                
                # Handle client-initiated actions (if needed)
                if action == "ping":
                    await manager.send_personal_message(
                        {
                            "action": "pong",
                            "data": {
                                "message": "Pong!",
                                "timestamp": message.get("timestamp", None)
                            }
                        },
                        websocket
                    )
                else:
                    logger.warning(f"Received unrecognized action: {action}")
                    
            except json.JSONDecodeError:
                logger.error("Received invalid JSON data")
                await manager.send_personal_message(
                    {
                        "action": "error",
                        "data": {
                            "message": "Invalid JSON format"
                        }
                    },
                    websocket
                )
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                await manager.send_personal_message(
                    {
                        "action": "error",
                        "data": {
                            "message": "Error processing message"
                        }
                    },
                    websocket
                )
                
    except WebSocketDisconnect:
        # Handle disconnection
        manager.disconnect(websocket)
        
        # Notify other clients about disconnection (optional)
        await manager.broadcast(
            {
                "action": "client_disconnected",
                "data": {
                    "connections": manager.get_connection_count()
                }
            }
        )
    except Exception as e:
        # Handle other exceptions
        logger.error(f"WebSocket error: {str(e)}")
        if websocket in manager.active_connections:
            manager.disconnect(websocket)

@router.get("/ws/stats")
async def get_websocket_stats():
    """Get statistics about WebSocket connections"""
    return {
        "active_connections": manager.get_connection_count()
    }