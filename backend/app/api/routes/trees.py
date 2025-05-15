from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import random
import uuid
import traceback

from app.db.database import get_db
from app.db.models.tree import Tree, Factory, Child
from app.schemas.tree import (
    TreeResponse, Tree as TreeSchema,
    FactoryCreate, FactoryUpdate, FactoryResponse, Factory as FactorySchema,
    Child as ChildSchema
)
from app.websockets.connection_manager import manager

router = APIRouter()

# Helper function to get the default tree ID
async def get_default_tree_id(db: AsyncSession):
    # Get the first tree from the database (there should only be one)
    stmt = select(Tree)
    result = await db.execute(stmt)
    tree = result.scalars().first()
    
    if not tree:
        # This shouldn't happen since we create a default tree on startup
        # But just in case, create one now
        tree = Tree(name="Default Tree")
        db.add(tree)
        await db.commit()
        await db.refresh(tree)
        print(f"Created new default tree with ID {tree.id}")
    
    return tree.id

# Get the default tree with all its data
@router.get("/tree", response_model=TreeResponse)
async def get_tree(db: AsyncSession = Depends(get_db)):
    try:
        # Get the default tree ID
        tree_id = await get_default_tree_id(db)
        
        # Query tree with explicit join loading for factories and children
        stmt = select(Tree).where(Tree.id == tree_id).options(
            selectinload(Tree.factories).selectinload(Factory.children)
        )
        result = await db.execute(stmt)
        tree = result.unique().scalars().first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Default tree not found in database"
            )
        
        # Create response manually to avoid lazy loading
        return {
            "message": "Tree retrieved successfully",
            "data": TreeSchema(
                id=tree.id,
                name=tree.name,
                factories=[
                    FactorySchema(
                        id=factory.id,
                        name=factory.name,
                        lower_bound=factory.lower_bound,
                        upper_bound=factory.upper_bound,
                        child_count=factory.child_count,
                        tree_id=factory.tree_id,
                        children=[
                            ChildSchema(
                                id=child.id,
                                value=child.value,
                                factory_id=child.factory_id
                            ) for child in factory.children
                        ]
                    ) for factory in tree.factories
                ]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving tree: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tree: {str(e)}"
        )

# Factory endpoints
@router.post("/factories", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
async def create_factory(
    factory_data: FactoryCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Get the default tree ID
        tree_id = await get_default_tree_id(db)
        
        # Validate bounds
        if factory_data.lower_bound >= factory_data.upper_bound:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lower bound must be less than upper bound"
            )
        
        if factory_data.child_count < 1 or factory_data.child_count > 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Child count must be between 1 and 15"
            )
        
        # Create new factory
        new_factory = Factory(
            name=factory_data.name,
            lower_bound=factory_data.lower_bound,
            upper_bound=factory_data.upper_bound,
            child_count=factory_data.child_count,
            tree_id=tree_id
        )
        
        db.add(new_factory)
        await db.commit()
        await db.refresh(new_factory)
        
        # Create a Pydantic model to avoid lazy loading
        factory_response = FactorySchema(
            id=new_factory.id,
            name=new_factory.name,
            lower_bound=new_factory.lower_bound,
            upper_bound=new_factory.upper_bound,
            child_count=new_factory.child_count,
            tree_id=new_factory.tree_id,
            children=[]
        )
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "factory_created",
            "data": {
                "id": str(new_factory.id),
                "name": new_factory.name,
                "lower_bound": new_factory.lower_bound,
                "upper_bound": new_factory.upper_bound,
                "child_count": new_factory.child_count,
                "tree_id": str(tree_id),
                "children": []
            }
        })
        
        return {
            "message": "Factory created successfully",
            "data": factory_response
        }
    except HTTPException:
        raise
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
        # Query existing factory
        stmt = select(Factory).where(Factory.id == factory_id)
        result = await db.execute(stmt)
        factory = result.scalars().first()
        
        if not factory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Factory with ID {factory_id} not found"
            )
        
        # Update factory properties
        if factory_data.name is not None:
            factory.name = factory_data.name
        
        if factory_data.lower_bound is not None:
            factory.lower_bound = factory_data.lower_bound
        
        if factory_data.upper_bound is not None:
            factory.upper_bound = factory_data.upper_bound
            
        if factory_data.child_count is not None:
            factory.child_count = factory_data.child_count
        
        # Validate bounds
        if factory.lower_bound >= factory.upper_bound:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lower bound must be less than upper bound"
            )
        
        if factory.child_count < 1 or factory.child_count > 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Child count must be between 1 and 15"
            )
        
        await db.commit()
        await db.refresh(factory)
        
        # Create a Pydantic model to avoid lazy loading
        factory_response = FactorySchema(
            id=factory.id,
            name=factory.name,
            lower_bound=factory.lower_bound,
            upper_bound=factory.upper_bound,
            child_count=factory.child_count,
            tree_id=factory.tree_id,
            children=[]  # We don't need children for update response
        )
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "factory_updated",
            "data": {
                "id": str(factory.id),
                "name": factory.name,
                "lower_bound": factory.lower_bound,
                "upper_bound": factory.upper_bound,
                "child_count": factory.child_count,
                "tree_id": str(factory.tree_id)
            }
        })
        
        return {
            "message": "Factory updated successfully",
            "data": factory_response
        }
    except HTTPException:
        raise
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
        # Query existing factory
        stmt = select(Factory).where(Factory.id == factory_id)
        result = await db.execute(stmt)
        factory = result.scalars().first()
        
        if not factory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Factory with ID {factory_id} not found"
            )
        
        tree_id = factory.tree_id  # Save tree_id before deleting
        
        # Delete factory (cascade will delete children)
        await db.delete(factory)
        await db.commit()
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "factory_deleted",
            "data": {
                "id": str(factory_id),
                "tree_id": str(tree_id)
            }
        })
        
        return None
    except HTTPException:
        raise
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
        # Query existing factory
        stmt = select(Factory).where(Factory.id == factory_id)
        result = await db.execute(stmt)
        factory = result.scalars().first()
        
        if not factory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Factory with ID {factory_id} not found"
            )
        
        # Delete existing children
        delete_stmt = select(Child).where(Child.factory_id == factory_id)
        delete_result = await db.execute(delete_stmt)
        existing_children = delete_result.scalars().all()
        
        for child in existing_children:
            await db.delete(child)
        
        # Generate new children
        new_children = []
        for _ in range(factory.child_count):
            random_value = random.randint(factory.lower_bound, factory.upper_bound)
            child = Child(value=random_value, factory_id=factory_id)
            db.add(child)
            new_children.append(child)
        
        await db.commit()
        
        # Refresh factory to get updated children (with explicit loading)
        stmt = select(Factory).where(Factory.id == factory_id).options(
            selectinload(Factory.children)
        )
        result = await db.execute(stmt)
        refreshed_factory = result.scalars().first()
        
        # Create a list of child data for response and WebSocket
        children_data = []
        for child in refreshed_factory.children:
            children_data.append({
                "id": str(child.id),
                "value": child.value,
                "factory_id": str(child.factory_id)
            })
        
        # Create Pydantic model for response
        factory_response = FactorySchema(
            id=refreshed_factory.id,
            name=refreshed_factory.name,
            lower_bound=refreshed_factory.lower_bound,
            upper_bound=refreshed_factory.upper_bound,
            child_count=refreshed_factory.child_count,
            tree_id=refreshed_factory.tree_id,
            children=[
                ChildSchema(
                    id=child.id,
                    value=child.value,
                    factory_id=child.factory_id
                ) for child in refreshed_factory.children
            ]
        )
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "children_generated",
            "data": {
                "factory_id": str(factory.id),
                "children": children_data
            }
        })
        
        return {
            "message": "Children generated successfully",
            "data": factory_response
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error generating children: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate children: {str(e)}"
        )