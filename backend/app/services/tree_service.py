from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
import random
import uuid
import traceback
from typing import List, Dict, Any, Optional, Tuple

from app.db.models.tree import Tree, Factory, Child
from app.schemas.tree import (
    TreeResponse, Tree as TreeSchema,
    FactoryCreate, FactoryUpdate, FactoryResponse, Factory as FactorySchema,
    Child as ChildSchema
)

MAX_CHILDREN = 15
MIN_CHILDREN = 1

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

async def get_default_tree_id(db: AsyncSession) -> uuid.UUID:
    """
    Get the default tree ID or create a new tree if none exists.
    
    Args:
        db: Database session
        
    Returns:
        UUID of the default tree
    """

    stmt = select(Tree)
    result = await db.execute(stmt)
    tree = result.scalars().first()
    
    if not tree:
        tree = Tree(name="Default Tree")
        db.add(tree)
        await db.commit()
        await db.refresh(tree)
        print(f"Created new default tree with ID {tree.id}")
    
    return tree.id

async def get_full_tree(db: AsyncSession) -> Tuple[Tree, TreeSchema]:
    """
    Get the complete tree with all factories and children.
    
    Args:
        db: Database session
        
    Returns:
        Tuple containing (SQLAlchemy Tree model, Pydantic TreeSchema)
    """
    tree_id = await get_default_tree_id(db)
    
    # Query tree with explicit join loading for factories and children
    stmt = select(Tree).where(Tree.id == tree_id).options(
        selectinload(Tree.factories).selectinload(Factory.children)
    )
    result = await db.execute(stmt)
    tree = result.unique().scalars().first()
    
    if not tree:
        raise ValidationError("Default tree not found in database")
    
    # Convert to Pydantic model
    tree_schema = TreeSchema(
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
    
    return tree, tree_schema

def validate_factory_data(lower_bound: int, upper_bound: int, child_count: int) -> None:
    """
    Validate factory bounds and child count.
    
    Args:
        lower_bound: Lower bound for random number generation
        upper_bound: Upper bound for random number generation
        child_count: Number of children to generate
        
    Raises:
        ValidationError: If validation fails
    """
    if lower_bound >= upper_bound:
        raise ValidationError("Lower bound must be less than upper bound")
    
    if child_count < MIN_CHILDREN or child_count > MAX_CHILDREN:
        raise ValidationError(f"Child count must be between {MIN_CHILDREN} and {MAX_CHILDREN}")

async def create_factory(db: AsyncSession, factory_data: FactoryCreate) -> Tuple[Factory, FactorySchema]:
    """
    Create a new factory.
    
    Args:
        db: Database session
        factory_data: Factory creation data
        
    Returns:
        Tuple containing (SQLAlchemy Factory model, Pydantic FactorySchema)
    """
    tree_id = await get_default_tree_id(db)
    
    validate_factory_data(
        factory_data.lower_bound, 
        factory_data.upper_bound, 
        factory_data.child_count
    )
    
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
    
    # Create a Pydantic model
    factory_schema = FactorySchema(
        id=new_factory.id,
        name=new_factory.name,
        lower_bound=new_factory.lower_bound,
        upper_bound=new_factory.upper_bound,
        child_count=new_factory.child_count,
        tree_id=new_factory.tree_id,
        children=[]
    )
    
    return new_factory, factory_schema

async def get_factory_by_id(db: AsyncSession, factory_id: uuid.UUID) -> Factory:
    """
    Get a factory by its ID.
    
    Args:
        db: Database session
        factory_id: UUID of the factory
        
    Returns:
        Factory model
        
    Raises:
        ValidationError: If factory not found
    """
    stmt = select(Factory).where(Factory.id == factory_id)
    result = await db.execute(stmt)
    factory = result.scalars().first()
    
    if not factory:
        raise ValidationError(f"Factory with ID {factory_id} not found")
    
    return factory

async def update_factory(
    db: AsyncSession, 
    factory_id: uuid.UUID, 
    factory_data: FactoryUpdate
) -> Tuple[Factory, FactorySchema]:
    """
    Update an existing factory.
    
    Args:
        db: Database session
        factory_id: UUID of the factory to update
        factory_data: Factory update data
        
    Returns:
        Tuple containing (SQLAlchemy Factory model, Pydantic FactorySchema)
    """
    factory = await get_factory_by_id(db, factory_id)
    
    if factory_data.name is not None:
        factory.name = factory_data.name
    
    if factory_data.lower_bound is not None:
        factory.lower_bound = factory_data.lower_bound
    
    if factory_data.upper_bound is not None:
        factory.upper_bound = factory_data.upper_bound
        
    if factory_data.child_count is not None:
        factory.child_count = factory_data.child_count
    
    # Validate bounds and child count
    validate_factory_data(
        factory.lower_bound, 
        factory.upper_bound, 
        factory.child_count
    )
    
    await db.commit()
    await db.refresh(factory)
    
    factory_schema = FactorySchema(
        id=factory.id,
        name=factory.name,
        lower_bound=factory.lower_bound,
        upper_bound=factory.upper_bound,
        child_count=factory.child_count,
        tree_id=factory.tree_id,
        children=[]
    )
    
    return factory, factory_schema

async def delete_factory(db: AsyncSession, factory_id: uuid.UUID) -> uuid.UUID:
    """
    Delete a factory by its ID.
    
    Args:
        db: Database session
        factory_id: UUID of the factory to delete
        
    Returns:
        The tree_id the factory belonged to
    """
    factory = await get_factory_by_id(db, factory_id)
    tree_id = factory.tree_id
    
    await db.delete(factory)
    await db.commit()
    
    return tree_id

async def generate_children(
    db: AsyncSession, factory_id: uuid.UUID
) -> Tuple[Factory, FactorySchema, List[Dict[str, Any]]]:
    """
    Generate random number children for a factory.
    
    Args:
        db: Database session
        factory_id: UUID of the factory
        
    Returns:
        Tuple containing (
            SQLAlchemy Factory model, 
            Pydantic FactorySchema,
            List of child data dictionaries for WebSocket
        )
    """
    factory = await get_factory_by_id(db, factory_id)
    
    await delete_factory_children(db, factory_id)
    
    new_children = []
    for _ in range(factory.child_count):
        random_value = random.randint(factory.lower_bound, factory.upper_bound)
        child = Child(value=random_value, factory_id=factory_id)
        db.add(child)
        new_children.append(child)
    
    await db.commit()
    
    stmt = select(Factory).where(Factory.id == factory_id).options(
        selectinload(Factory.children)
    )
    result = await db.execute(stmt)
    refreshed_factory = result.scalars().first()
    
    # Create a list of child data for WebSocket
    children_data = []
    for child in refreshed_factory.children:
        children_data.append({
            "id": str(child.id),
            "value": child.value,
            "factory_id": str(child.factory_id)
        })
    
    factory_schema = FactorySchema(
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
    
    return refreshed_factory, factory_schema, children_data

async def delete_factory_children(db: AsyncSession, factory_id: uuid.UUID) -> None:
    """
    Delete all children of a factory.
    
    Args:
        db: Database session
        factory_id: UUID of the factory
    """
    delete_stmt = select(Child).where(Child.factory_id == factory_id)
    delete_result = await db.execute(delete_stmt)
    existing_children = delete_result.scalars().all()
    
    for child in existing_children:
        await db.delete(child)