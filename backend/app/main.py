from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.future import select

from app.db.database import init_db, close_db, AsyncSession, get_db
from app.db.models.tree import Tree
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

# Function to create default tree if none exists
async def create_default_tree():
    try:
        async with AsyncSession() as db:
            # Check if any tree exists
            stmt = select(Tree)
            result = await db.execute(stmt)
            existing_tree = result.scalars().first()
            
            if not existing_tree:
                # Create the default tree
                default_tree = Tree(name="Default Tree")
                db.add(default_tree)
                await db.commit()
                print("Created default tree with name 'Default Tree'")
                return default_tree.id
            else:
                print(f"Using existing tree: {existing_tree.id}")
                return existing_tree.id
    except Exception as e:
        print(f"Error creating default tree: {str(e)}")
        return None

# Database startup and shutdown events
@app.on_event("startup")
async def startup_db_client():
    await init_db()
    # Create default tree after DB initialization
    default_tree_id = await create_default_tree()
    if default_tree_id:
        app.state.default_tree_id = default_tree_id
        print(f"Default tree ID set: {default_tree_id}")
    else:
        print("Warning: Could not establish default tree ID")

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