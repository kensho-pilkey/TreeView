"""API routes package"""

# Import and re-export routes to make them available from app.api.routes
from app.api.routes.trees import router as trees_router
from app.api.routes.websockets import router as websockets_router