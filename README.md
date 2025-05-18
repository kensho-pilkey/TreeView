# Live Tree Web Application
[livetree.onrender.com](https://livetree.onrender.com/)
## Overview
The Live Tree Web Application is a real-time interactive web application that allows users to create, manage, and visualize a tree structure of "factories" that generate random numbers. The application features a responsive UI with a main tree view showing factories and their randomly generated child nodes.

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

## How to Use

1. **Create a Factory**: Click the "Add Factory" button and provide a name, lower bound, and upper bound
2. **Generate Numbers**: Select a factory and click the generate button (play icon) to create random number nodes
3. **Edit Factory**: Click the edit button (pencil icon) to modify a factory's name and number range
4. **Delete Factory**: Remove a factory and all its children with the delete button (X icon)

## Local Development Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file with PostgreSQL connection details

# Start development server
python run.py
```

## Project Structure

```
livetree/
├── frontend/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── FactoryForm.jsx
│   │   │   ├── FactoryNode.jsx
│   │   │   └── TreeView.jsx
│   │   ├── context/          # React context
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   ├── styles/           # CSS files
│   │   └── App.jsx           # Main application component
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── db/               # Database models and config
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Backend services
│   │   └── websockets/       # WebSocket implementation
│   ├── run.py                # Entry point
│   └── requirements.txt
└── README.md
```
