import os
from dotenv import load_dotenv
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from fastapi import Depends
from typing import AsyncGenerator

load_dotenv()

# Get the DATABASE_URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")

# Make sure we're using the asyncpg driver
if DATABASE_URL:
    # Replace postgres:// with postgresql+asyncpg://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    # Replace postgresql:// with postgresql+asyncpg://
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    print(f"Using database URL: {DATABASE_URL}")
else:
    # Fallback for local development
    DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/treeview"
    print(f"No DATABASE_URL found in environment, using default: {DATABASE_URL}")

engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Make sure to set to False in production
    future=True,
)

# SessionLocal factory
async_session_factory = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base class for declarative models
Base = declarative_base()

# Initialize the database
async def init_db():
    try:
        # Create tables if they don't exist
        async with engine.begin() as conn:
            # Uncomment for first run or when models change
            # await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        print("Connected to PostgreSQL database")
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        raise e

# Close database connections
async def close_db():
    await engine.dispose()
    print("PostgreSQL connection closed")

# FastAPI dependency for getting a database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for getting an async database session"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise e