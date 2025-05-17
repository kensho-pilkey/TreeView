# LiveTree Documentation

This documentation describes the LiveTree web application - a real-time interactive tree visualization tool that allows users to create and manage factory nodes that generate random numbers.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Frontend Documentation](#frontend-documentation)
  - [Components](#components)
  - [State Management](#state-management)
  - [WebSocket Integration](#websocket-integration)
- [Backend Documentation](#backend-documentation)
  - [API Endpoints](#api-endpoints)
  - [Database Schema](#database-schema)
  - [WebSocket Server](#websocket-server)

## Overview

The Live Tree Web Application is a real-time interactive web application that allows users to create, manage, and visualize a tree structure of "factories" that generate random numbers. The application features a responsive UI with a main tree view showing factories and their randomly generated child nodes.

### Features

- **Interactive Tree View**: Visual representation of factories and their generated random number children
- **Real-time Updates**: All changes to the tree are immediately visible across all connected browsers without refreshing
- **Factory Management**:
  - Create factories with customizable names
  - Set and adjust lower and upper bounds for random number generation
  - Generate up to 15 random number children per factory
  - Edit or delete existing factories
- **Persistent State**: Tree structure persists across page reloads
- **Secure Implementation**: Input validation and protection against injections
- **Responsive Design**: Works across various screen sizes

## Architecture

LiveTree follows a client-server architecture with separate frontend and backend:

### Technology Stack

#### Frontend
- React.js with Vite for fast development
- Vanilla CSS for styling
- WebSocket for real-time communication
- Lucide icons for UI elements

#### Backend
- FastAPI framework for high-performance API endpoints
- SQLAlchemy ORM for database interactions
- PostgreSQL database for persistent storage
- WebSockets for real-time updates
- Pydantic for data validation and settings management

#### Deployment
- Render for cloud hosting and deployment
- PostgreSQL hosted on Render

## Frontend Documentation

### Components

#### TreeView Component

The TreeView component is the main visualization component that renders the tree structure with its factory nodes and children.

```jsx
<TreeView 
  factories={factories}
  onFactoryCreate={handleFactoryCreate}
  onFactoryUpdate={handleFactoryUpdate}
  onFactoryDelete={handleFactoryDelete}
  onGenerateChildren={handleGenerateChildren}
/>
```

**Props:**
- `factories`: Array of factory objects
- `onFactoryCreate`: Callback for creating a new factory
- `onFactoryUpdate`: Callback for updating a factory
- `onFactoryDelete`: Callback for deleting a factory
- `onGenerateChildren`: Callback for generating children for a factory

#### FactoryNode Component

The FactoryNode component renders an individual factory with its properties and child nodes in a circular layout.

```jsx
<FactoryNode
  factory={factory}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onGenerateChildren={handleGenerateChildren}
/>
```

**Props:**
- `factory`: Factory object with properties and children
- `onEdit`: Callback for editing the factory
- `onDelete`: Callback for deleting the factory
- `onGenerateChildren`: Callback for generating children

The FactoryNode component is visually represented as:
- A rectangular node displaying factory name, range, and child count
- Smaller circular child nodes arranged evenly around the factory
- Connecting lines between the factory and each child
- Control buttons (edit, generate, delete) that appear on hover

#### FactoryForm Component

The FactoryForm component provides the interface for creating and editing factories.

```jsx
<FactoryForm
  initialValues={factory}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

**Props:**
- `initialValues`: Initial form values (optional)
- `onSubmit`: Callback for form submission
- `onCancel`: Callback for canceling the form

### State Management

LiveTree uses React Context and hooks for state management. Main state components:

#### Factory State

```jsx
const { 
  factories,
  loading,
  error,
  createFactory,
  updateFactory,
  deleteFactory,
  generateChildren
} = useFactories();
```

#### WebSocket State

```jsx
const {
  connected,
  lastUpdate,
  connect,
  disconnect
} = useWebSocket();
```

### WebSocket Integration

The frontend establishes a WebSocket connection to receive real-time updates from other users:

```javascript
// WebSocketService.js
const connectWebSocket = () => {
  const socket = new WebSocket(`wss://${window.location.host}/ws`);
  
  socket.onopen = () => {
    setConnected(true);
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleUpdate(data);
  };
  
  socket.onclose = () => {
    setConnected(false);
    // Attempt reconnection
    setTimeout(connectWebSocket, 5000);
  };
  
  return socket;
};
```

## Backend Documentation

### API Endpoints

#### Factory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tree` | Get entire tree |
| POST | `/api/factories` | Create a new factory |
| PUT | `/api/factories/{factory_id}` | Update a factory |
| DELETE | `/api/factories/{factory_id}` | Delete a factory |
| POST | `/api/factories/{factory_id}/generate` | Generate children for a factory |

### Database Schema

#### Factory Model

```python
class Factory(Base):
    __tablename__ = "factories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    lower_bound = Column(Integer, nullable=False)
    upper_bound = Column(Integer, nullable=False)
    child_count = Column(Integer, default=0)
    
    # Relationship with FactoryChild
    children = relationship("FactoryChild", back_populates="factory", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### FactoryChild Model

```python
class FactoryChild(Base):
    __tablename__ = "factory_children"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id = Column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=False)
    value = Column(Integer, nullable=False)
    
    # Relationship with Factory
    factory = relationship("Factory", back_populates="children")
    
    created_at = Column(DateTime, default=datetime.utcnow)
```

### WebSocket Server

The backend implements a WebSocket server to push real-time updates to all connected clients:

```python
# websocket.py
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket_manager.broadcast(data)
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
```


