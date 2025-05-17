from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging

from app.websockets.connection_manager import manager
from app.db.database import get_db
from app.services import websocket_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    
    try:
        await websocket_service.send_connection_established(websocket)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                action = message.get("action")
                
                if action == "ping":
                    await websocket_service.handle_ping(
                        websocket, 
                        message.get("timestamp", None)
                    )
                else:
                    logger.warning(f"Received unrecognized action: {action}")
                    await websocket_service.send_error_message(
                        websocket,
                        f"Unrecognized action: {action}"
                    )
                    
            except json.JSONDecodeError:
                logger.error("Received invalid JSON data")
                await websocket_service.send_error_message(
                    websocket,
                    "Invalid JSON format"
                )
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                await websocket_service.send_error_message(
                    websocket,
                    "Error processing message"
                )
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
        await websocket_service.broadcast_client_disconnected()
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        if websocket in manager.active_connections:
            manager.disconnect(websocket)

@router.get("/ws/stats")
async def get_websocket_stats():
    """Get statistics about WebSocket connections"""
    return websocket_service.get_connection_stats()