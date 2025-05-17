import uvicorn
import os
import multiprocessing
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("run")

if __name__ == "__main__":
    environment = os.getenv("ENVIRONMENT", "development").lower()
    is_production = environment == "production"
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    if is_production:
        workers = int(str(multiprocessing.cpu_count()))
        log_level = os.getenv("LOG_LEVEL", "warning").lower()
        reload = False
        
        logger.info(f"Starting server in PRODUCTION mode with {workers} workers")
        
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            workers=workers,
            log_level=log_level,
            reload=False,
            access_log=False
        )
    else:
        log_level = os.getenv("LOG_LEVEL", "info").lower()
        reload = os.getenv("RELOAD", "True").lower() == "true"
        
        logger.info("Starting server in DEVELOPMENT mode with hot reloading")
        
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=reload,
            log_level=log_level
        )