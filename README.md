# Random Number Factory - Tree View Web Application

## Overview
Random Number Factory is a real-time interactive web application that allows users to create, manage, and visualize a tree structure of "factories" that generate random numbers. The application features a responsive UI with a main tree view showing factories and their randomly generated child nodes.

## Features

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

## Technology Stack

### Frontend
- React.js with Vite for fast development
- Tailwind CSS for styling
- WebSocket for real-time communication
- Lucide icons for UI elements

### Backend
- FastAPI framework for high-performance API endpoints
- SQLAlchemy ORM for database interactions
- PostgreSQL database for persistent storage
- WebSockets for real-time updates
- Pydantic for data validation and settings management

### Deployment
- Render for cloud hosting and deployment
- PostgreSQL hosted on Render
