from sqlalchemy import Column, Integer, String, ForeignKey, Table, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.database import Base

# Tree model class
class Tree(Base):
    __tablename__ = "trees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, default="Root")
    
    # Relationship with factories
    factories = relationship("Factory", back_populates="tree", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tree id={self.id} name={self.name}>"

# Factory model class
class Factory(Base):
    __tablename__ = "factories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    lower_bound = Column(Integer, nullable=False, default=1)
    upper_bound = Column(Integer, nullable=False, default=100)
    child_count = Column(Integer, nullable=False, default=5)
    
    # Foreign key to Tree
    tree_id = Column(UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False)
    
    # Relationship with Tree
    tree = relationship("Tree", back_populates="factories")
    
    # Relationship with Children
    children = relationship("Child", back_populates="factory", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Factory id={self.id} name={self.name}>"

# Child model class
class Child(Base):
    __tablename__ = "children"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    value = Column(Integer, nullable=False)
    
    # Foreign key to Factory
    factory_id = Column(UUID(as_uuid=True), ForeignKey("factories.id", ondelete="CASCADE"), nullable=False)
    
    # Relationship with Factory
    factory = relationship("Factory", back_populates="children")
    
    def __repr__(self):
        return f"<Child id={self.id} value={self.value}>"