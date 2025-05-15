import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment variables or use defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    
    # Run the application with Uvicorn
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )