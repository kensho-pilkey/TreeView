from fastapi import WebSocket, WebSocketDisconnect
import json
from typing import List, Dict, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active WebSocket connections
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept and store new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Remaining connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to a specific client"""
        await websocket.send_json(message)
        logger.debug(f"Personal message sent: {message['action']}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            logger.debug("No active connections for broadcast")
            return
            
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending broadcast to client: {str(e)}")
                disconnected.append(connection)
        
        # Clean up any disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
        
        if disconnected:
            logger.info(f"Removed {len(disconnected)} disconnected clients. Remaining: {len(self.active_connections)}")
        
        logger.info(f"Broadcast message sent to {len(self.active_connections)} clients: {message['action']}")
    
    def get_connection_count(self) -> int:
        """Return the number of active connections"""
        return len(self.active_connections)

# Create a singleton connection manager
manager = ConnectionManager()