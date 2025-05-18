# LiveTree Documentation

- [Overview](#overview)
- [Architecture](#architecture)
- [Frontend Documentation](#frontend-documentation)
  - [Components](#components)
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

The TreeView component is the main visualization component that renders the tree structure with its factory nodes and children. Instead of receiving props, it directly accesses state and methods through the TreeContext:

```jsx
const TreeView = () => {
  const { 
    tree, 
    loading, 
    error, 
    socketConnected,
    addFactory, 
    updateFactory, 
    deleteFactory, 
    generateChildren,
    clearError 
  } = useTree();
  
  // Component implementation
}
```

**Context Usage:**
- `tree`: Contains the full tree structure including factories and their children
- `loading`: Boolean indicating if operations are in progress
- `error`: Error information if an operation fails
- `socketConnected`: WebSocket connection status
- `addFactory`: Method to create a new factory
- `updateFactory`: Method to update an existing factory
- `deleteFactory`: Method to delete a factory
- `generateChildren`: Method to generate children for a factory
- `clearError`: Method to clear any error state

The TreeView component handles:
- Displaying factories in a circular layout around a central root node
- Dynamically adjusting zoom level based on number of factories (`zoomed-out`, `zoomed-out-more`, or `zoomed-out-max` classes)
- Managing state for editing factories and showing the factory form
- Providing connection status indicators (connected/disconnected)
- Displaying loading indicators during operations

#### FactoryNode Component

The FactoryNode component renders an individual factory with its properties and child nodes in a circular layout.

```jsx
const FactoryNode = ({ factory, zoomLevel, onEdit, onDelete, onGenerateChildren }) => {
  // Component implementation
}
```

**Props:**
- `factory`: Factory object with properties and children
- `zoomLevel`: Current zoom level (controls radius for child node spacing)
- `onEdit`: Callback for editing the factory
- `onDelete`: Callback for deleting the factory
- `onGenerateChildren`: Callback for generating children

The FactoryNode component is visually represented as:
- A rectangular node displaying factory name, range, and child count
- Smaller circular child nodes arranged evenly around the factory node
- Connecting lines between the factory and each child
- Control buttons (edit, generate, delete) that appear on hover

The component dynamically adjusts the radius of child nodes based on the zoom level:
```jsx
let radius = 140; 
if (zoomLevel === 'zoomed-out') radius = 130;
if (zoomLevel === 'zoomed-out-more') radius = 120;  
if (zoomLevel === 'zoomed-out-max') radius = 110;
```

#### FactoryForm Component

The FactoryForm component provides the interface for creating and editing factories.

```jsx
const FactoryForm = ({ factory, onSave, onCancel }) => {
  // Component implementation
}
```

**Props:**
- `factory`: Factory object to edit (null for creating a new factory)
- `onSave`: Callback function when form is submitted with valid data
- `onCancel`: Callback function to cancel editing

The form manages its own state and validation:
```jsx
const [formData, setFormData] = useState({
  name: '',
  lowerBound: 1,
  upperBound: 100,
  childCount: 5
});
  
const [errors, setErrors] = useState({});
```

The form includes:
- Factory name input with validation (letters, numbers, spaces only; max 30 chars)
- Lower and upper bound inputs for random number range
- Child count input with validation (1-15 children)
- Cross-field validation (e.g., upper bound must be greater than lower bound)
- Maximum range validation (range cannot exceed 1,000,000)
- Cancel and Save/Create buttons

The FactoryForm appears as a modal overlay and includes real-time validation feedback as users interact with the form.

### WebSocket Integration

The frontend establishes a WebSocket connection to receive real-time updates using a custom `useWebSocket` hook:

```javascript
// hooks/useWebSocket.js
const useWebSocket = (url, onMessage, reconnectDelay = 1000, maxReconnectAttempts = 10) => {
  const [connectionStatus, setConnectionStatus] = useState('CLOSED');
  const [error, setError] = useState(null);
  
  // Create and manage socket connection
  const connect = useCallback(() => {
    const socket = new WebSocket(url);
    
    socket.onopen = () => setConnectionStatus('OPEN');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    socket.onclose = () => {
      setConnectionStatus('CLOSED');
      // Attempt reconnection with exponential backoff
      attemptReconnect();
    };
    
    return socket;
  }, [url, onMessage]);
  
  // Other implementation details
  
  return { connectionStatus, error, sendMessage, disconnect, reconnect: connect };
};
```

The hook is used in TreeContext to handle various message types (factory creation, updates, etc.) and update the UI in real-time.

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

The LiveTree application uses a three-tier hierarchical structure with Tree, Factory, and Child models.

#### Tree Model

```python
class Tree(Base):
    __tablename__ = "trees"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, default="Root")
    
    # Relationship with factories
    factories = relationship("Factory", back_populates="tree", cascade="all, delete-orphan")
```

The Tree model serves as the top-level container for factories. Each application instance has exactly one tree, which serves as the root of the visualization hierarchy.

#### Factory Model

```python
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
```

The Factory model represents the factory nodes displayed in the tree view. Each factory belongs to a specific tree and can generate random number children. Key properties include:
- Customizable name
- Lower and upper bounds for random number generation
- Child count setting (with a default of 5)
- Cascade delete relationship with its children (when a factory is deleted, all its children are also deleted)

#### Child Model

```python
class Child(Base):
    __tablename__ = "children"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    value = Column(Integer, nullable=False)
    
    # Foreign key to Factory
    factory_id = Column(UUID(as_uuid=True), ForeignKey("factories.id", ondelete="CASCADE"), nullable=False)
    
    # Relationship with Factory
    factory = relationship("Factory", back_populates="children")
```

The Child model represents the randomly generated number nodes that are created by a factory. Each child:
- Has a numeric value generated within the factory's bounds
- Belongs to exactly one factory
- Is automatically deleted when its parent factory is removed (CASCADE delete)

This three-tier structure allows for a flexible hierarchy where multiple factories can exist under a single tree, and each factory can generate its own set of child nodes with random values.

### WebSocket Server

The backend implements a WebSocket server to push real-time updates to all connected clients:

```python
# app/api/routes/websocket.py
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        await websocket_service.send_connection_established(websocket)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")
            
            if action == "ping":
                await websocket_service.handle_ping(websocket, message.get("timestamp"))
            else:
                await websocket_service.send_error_message(websocket, f"Unrecognized action")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await websocket_service.broadcast_client_disconnected()
```

The WebSocket implementation handles client connections, processes messages including ping/pong for connection maintenance, and broadcasts updates when database changes occur.
