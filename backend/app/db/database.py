import os
from dotenv import load_dotenv
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from fastapi import Depends
from typing import AsyncGenerator

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

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