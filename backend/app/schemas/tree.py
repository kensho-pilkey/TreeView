from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
import uuid

# Base schemas for common operations
class ChildBase(BaseModel):
    value: int

class ChildCreate(ChildBase):
    pass

class Child(ChildBase):
    id: UUID4 = Field(default_factory=uuid.uuid4)
    factory_id: UUID4
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "value": 42,
                "factory_id": "3fa85f64-5717-4562-b3fc-2c963f66afa7"
            }
        }

class FactoryBase(BaseModel):
    name: str
    lower_bound: int = 1
    upper_bound: int = 100
    child_count: int = 5

class FactoryCreate(FactoryBase):
    pass

class FactoryUpdate(BaseModel):
    name: Optional[str] = None
    lower_bound: Optional[int] = None
    upper_bound: Optional[int] = None
    child_count: Optional[int] = None

class Factory(FactoryBase):
    id: UUID4 = Field(default_factory=uuid.uuid4)
    tree_id: UUID4
    children: List[Child] = []
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa7",
                "name": "Sample Factory",
                "lower_bound": 1,
                "upper_bound": 100,
                "child_count": 5,
                "tree_id": "3fa85f64-5717-4562-b3fc-2c963f66afa8",
                "children": []
            }
        }

class TreeBase(BaseModel):
    name: str = "Root"

class TreeCreate(TreeBase):
    pass

class TreeUpdate(BaseModel):
    name: Optional[str] = None

class Tree(TreeBase):
    id: UUID4 = Field(default_factory=uuid.uuid4)
    factories: List[Factory] = []
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa8",
                "name": "Root",
                "factories": []
            }
        }

# Response schemas
class TreeResponse(BaseModel):
    message: str
    data: Optional[Tree] = None

    class Config:
        orm_mode = True

class FactoryResponse(BaseModel):
    message: str
    data: Optional[Factory] = None

    class Config:
        orm_mode = True

class ChildResponse(BaseModel):
    message: str
    data: Optional[Child] = None

    class Config:
        orm_mode = True

# WebSocket message schemas
class WebSocketMessage(BaseModel):
    action: str
    data: dict