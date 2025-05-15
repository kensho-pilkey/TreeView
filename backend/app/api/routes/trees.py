from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import random
import uuid
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.db.models.tree import Tree, Factory, Child
from app.schemas.tree import (
    TreeCreate, TreeUpdate, TreeResponse, Tree as TreeSchema,
    FactoryCreate, FactoryUpdate, FactoryResponse, Factory as FactorySchema,
    Child as ChildSchema
)
from app.websockets.connection_manager import manager

router = APIRouter()

# Tree endpoints
@router.post("/trees", response_model=TreeResponse, status_code=status.HTTP_201_CREATED)
async def create_tree(
    tree_data: TreeCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Create new tree
        new_tree = Tree(name=tree_data.name)
        db.add(new_tree)
        await db.commit()
        await db.refresh(new_tree)
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "tree_created",
            "data": {
                "id": str(new_tree.id),
                "name": new_tree.name,
                "factories": []
            }
        })
        
        return {
            "message": "Tree created successfully",
            "data": new_tree
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tree: {str(e)}"
        )

@router.get("/trees/{tree_id}", response_model=TreeResponse)
async def get_tree(
    tree_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db)
):
    try:
        # Query tree with its factories and children
        query = select(Tree).where(Tree.id == tree_id)
        result = await db.execute(query)
        tree = result.scalars().first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tree with ID {tree_id} not found"
            )
        
        return {
            "message": "Tree retrieved successfully",
            "data": tree
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tree: {str(e)}"
        )

@router.get("/trees", response_model=List[TreeSchema])
async def get_all_trees(db: AsyncSession = Depends(get_db)):
    try:
        # Query all trees
        query = select(Tree)
        result = await db.execute(query)
        trees = result.scalars().all()
        
        return trees
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve trees: {str(e)}"
        )

@router.put("/trees/{tree_id}", response_model=TreeResponse)
async def update_tree(
    tree_id: uuid.UUID,
    tree_data: TreeUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Query existing tree
        query = select(Tree).where(Tree.id == tree_id)
        result = await db.execute(query)
        tree = result.scalars().first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tree with ID {tree_id} not found"
            )
        
        # Update tree properties
        if tree_data.name is not None:
            tree.name = tree_data.name
        
        await db.commit()
        await db.refresh(tree)
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "tree_updated",
            "data": {
                "id": str(tree.id),
                "name": tree.name
            }
        })
        
        return {
            "message": "Tree updated successfully",
            "data": tree
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tree: {str(e)}"
        )

@router.delete("/trees/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tree(
    tree_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Query existing tree
        query = select(Tree).where(Tree.id == tree_id)
        result = await db.execute(query)
        tree = result.scalars().first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tree with ID {tree_id} not found"
            )
        
        # Delete tree (cascade will delete factories and children)
        await db.delete(tree)
        await db.commit()
        
        # Notify all connected clients
        await manager.broadcast({
            "action": "tree_deleted",
            "data": {
                "id": str(tree_id)
            }
        })
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tree: {str(e)}"
        )

# Factory endpoints
@router.post("/trees/{tree_id}/factories", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
async def create_factory(
    tree_id: uuid.UUID,
    factory_data: FactoryCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Check if tree exists
        query = select(Tree).where(Tree.id == tree_id)
        result = await db.execute(query)
        tree = result.scalars().first()
        
        if not tree:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tree with ID {tree_id} not found"
            )
        
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
            "data": new_factory
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
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
        query = select(Factory).where(Factory.id == factory_id)
        result = await db.execute(query)
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
            "data": factory
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
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
        query = select(Factory).where(Factory.id == factory_id)
        result = await db.execute(query)
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
        query = select(Factory).where(Factory.id == factory_id)
        result = await db.execute(query)
        factory = result.scalars().first()
        
        if not factory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Factory with ID {factory_id} not found"
            )
        
        # Delete existing children
        delete_query = select(Child).where(Child.factory_id == factory_id)
        delete_result = await db.execute(delete_query)
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
        
        # Refresh factory to get updated children
        await db.refresh(factory)
        
        # Create a list of child data for WebSocket message
        children_data = [
            {
                "id": str(child.id),
                "value": child.value,
                "factory_id": str(child.factory_id)
            }
            for child in factory.children
        ]
        
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
            "data": factory
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate children: {str(e)}"
        )