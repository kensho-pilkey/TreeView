from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.database import init_db, close_db
from app.api.routes import trees, websockets

# Create FastAPI app
app = FastAPI(
    title="Tree Visualization API",
    description="Backend API for Tree Visualization Project",
    version="0.1.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative frontend port
    "http://localhost:8080",  # Another common frontend port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database startup and shutdown events
@app.on_event("startup")
async def startup_db_client():
    await init_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_db()

# Include routers
app.include_router(trees.router, prefix="/api", tags=["trees"])
app.include_router(websockets.router, tags=["websockets"])

@app.get("/", tags=["root"])
async def root():
    return JSONResponse(
        status_code=200,
        content={
            "message": "Welcome to the Tree Visualization API",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)