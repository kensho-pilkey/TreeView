from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import traceback

from app.db.database import get_db
from app.schemas.tree import (
    TreeResponse, FactoryCreate, FactoryUpdate, FactoryResponse
)
from app.services import tree_service, websocket_service

router = APIRouter()

@router.get("/tree", response_model=TreeResponse)
async def get_tree(db: AsyncSession = Depends(get_db)):
    try:
        _, tree_schema = await tree_service.get_full_tree(db)
        
        return {
            "message": "Tree retrieved successfully",
            "data": tree_schema
        }
    except tree_service.ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error retrieving tree: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tree: {str(e)}"
        )

@router.post("/factories", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
async def create_factory(
    factory_data: FactoryCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        factory, factory_schema = await tree_service.create_factory(db, factory_data)
        
        await websocket_service.broadcast_factory_created({
            "id": factory.id,
            "name": factory.name,
            "lower_bound": factory.lower_bound,
            "upper_bound": factory.upper_bound,
            "child_count": factory.child_count,
            "tree_id": factory.tree_id
        })
        
        return {
            "message": "Factory created successfully",
            "data": factory_schema
        }
    except tree_service.ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Error creating factory: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create factory: {str(e)}"
        )

@router.put("/factories/{factory_id}", response_model=FactoryResponse)
async def update_factory(
    factory_id: uuid.UUID,
    factory_data: FactoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        factory, factory_schema = await tree_service.update_factory(
            db, factory_id, factory_data
        )
        
        await websocket_service.broadcast_factory_updated({
            "id": factory.id,
            "name": factory.name,
            "lower_bound": factory.lower_bound,
            "upper_bound": factory.upper_bound,
            "child_count": factory.child_count,
            "tree_id": factory.tree_id
        })
        
        return {
            "message": "Factory updated successfully",
            "data": factory_schema
        }
    except tree_service.ValidationError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        await db.rollback()
        print(f"Error updating factory: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update factory: {str(e)}"
        )

@router.delete("/factories/{factory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factory(
    factory_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    try:
        tree_id = await tree_service.delete_factory(db, factory_id)
        
        await websocket_service.broadcast_factory_deleted(
            str(factory_id),
            str(tree_id)
        )
        
        return None
    except tree_service.ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Error deleting factory: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete factory: {str(e)}"
        )

@router.post("/factories/{factory_id}/generate", response_model=FactoryResponse)
async def generate_children(
    factory_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    try:
        _, factory_schema, children_data = await tree_service.generate_children(
            db, factory_id
        )
        
        await websocket_service.broadcast_children_generated(
            str(factory_id),
            children_data
        )
        
        return {
            "message": "Children generated successfully",
            "data": factory_schema
        }
    except tree_service.ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        print(f"Error generating children: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate children: {str(e)}"
        )