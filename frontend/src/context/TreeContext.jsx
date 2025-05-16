import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { treeApi, WEBSOCKET_URL } from '../services/treeApi';

// Initial state
const initialState = {
  tree: {
    id: 'root',
    name: 'Root',
    factories: []
  },
  loading: false,
  error: null,
  socketConnected: false
};

// Action types
const actionTypes = {
  FETCH_TREE_START: 'FETCH_TREE_START',
  FETCH_TREE_SUCCESS: 'FETCH_TREE_SUCCESS',
  FETCH_TREE_ERROR: 'FETCH_TREE_ERROR',
  ADD_FACTORY_START: 'ADD_FACTORY_START',
  ADD_FACTORY_SUCCESS: 'ADD_FACTORY_SUCCESS',
  ADD_FACTORY_ERROR: 'ADD_FACTORY_ERROR',
  UPDATE_FACTORY_START: 'UPDATE_FACTORY_START',
  UPDATE_FACTORY_SUCCESS: 'UPDATE_FACTORY_SUCCESS',
  UPDATE_FACTORY_ERROR: 'UPDATE_FACTORY_ERROR',
  DELETE_FACTORY_START: 'DELETE_FACTORY_START',
  DELETE_FACTORY_SUCCESS: 'DELETE_FACTORY_SUCCESS',
  DELETE_FACTORY_ERROR: 'DELETE_FACTORY_ERROR',
  GENERATE_CHILDREN_START: 'GENERATE_CHILDREN_START',
  GENERATE_CHILDREN_SUCCESS: 'GENERATE_CHILDREN_SUCCESS',
  GENERATE_CHILDREN_ERROR: 'GENERATE_CHILDREN_ERROR',
  SOCKET_CONNECTED: 'SOCKET_CONNECTED',
  SOCKET_DISCONNECTED: 'SOCKET_DISCONNECTED',
  SOCKET_UPDATE_TREE: 'SOCKET_UPDATE_TREE',
  SOCKET_UPDATE_FACTORY: 'SOCKET_UPDATE_FACTORY',
  SOCKET_DELETE_FACTORY: 'SOCKET_DELETE_FACTORY',
  SOCKET_ERROR: 'SOCKET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer function
const treeReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.FETCH_TREE_START:
    case actionTypes.ADD_FACTORY_START:
    case actionTypes.UPDATE_FACTORY_START:
    case actionTypes.DELETE_FACTORY_START:
    case actionTypes.GENERATE_CHILDREN_START:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case actionTypes.FETCH_TREE_SUCCESS:
      return {
        ...state,
        tree: action.payload,
        loading: false
      };
      
    case actionTypes.ADD_FACTORY_SUCCESS:
      return {
        ...state,
        tree: {
          ...state.tree,
          factories: [...state.tree.factories, action.payload]
        },
        loading: false
      };
      
    case actionTypes.UPDATE_FACTORY_SUCCESS:
      return {
        ...state,
        tree: {
          ...state.tree,
          factories: state.tree.factories.map(factory => {
            if (factory.id === action.payload.id) {
              // Preserve the existing children when updating a factory
              return {
                ...action.payload,
                children: factory.children || [] // Keep existing children
              };
            }
            return factory;
          })
        },
        loading: false
      };
      
    case actionTypes.DELETE_FACTORY_SUCCESS:
      return {
        ...state,
        tree: {
          ...state.tree,
          factories: state.tree.factories.filter(factory => 
            factory.id !== action.payload
          )
        },
        loading: false
      };
      
    case actionTypes.GENERATE_CHILDREN_SUCCESS:
      return {
        ...state,
        tree: {
          ...state.tree,
          factories: state.tree.factories.map(factory => 
            factory.id === action.payload.id ? action.payload : factory
          )
        },
        loading: false
      };
      
    case actionTypes.FETCH_TREE_ERROR:
    case actionTypes.ADD_FACTORY_ERROR:
    case actionTypes.UPDATE_FACTORY_ERROR:
    case actionTypes.DELETE_FACTORY_ERROR:
    case actionTypes.GENERATE_CHILDREN_ERROR:
    case actionTypes.SOCKET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case actionTypes.SOCKET_CONNECTED:
      return {
        ...state,
        socketConnected: true
      };
      
    case actionTypes.SOCKET_DISCONNECTED:
      return {
        ...state,
        socketConnected: false
      };
      
    case actionTypes.SOCKET_UPDATE_TREE:
      return {
        ...state,
        tree: action.payload
      };
      
    case actionTypes.SOCKET_UPDATE_FACTORY:
      // Check if factory exists
      const factoryExists = state.tree.factories.some(factory => 
        factory.id === action.payload.id
      );
      
      if (factoryExists) {
        // Update existing factory while preserving children if they're not in the payload
        return {
          ...state,
          tree: {
            ...state.tree,
            factories: state.tree.factories.map(factory => {
              if (factory.id === action.payload.id) {
                // If the payload has children, use them, otherwise keep existing children
                return {
                  ...action.payload,
                  children: action.payload.children || factory.children || []
                };
              }
              return factory;
            })
          }
        };
      } else {
        // Add new factory
        return {
          ...state,
          tree: {
            ...state.tree,
            factories: [...state.tree.factories, action.payload]
          }
        };
      }
      
    case actionTypes.SOCKET_DELETE_FACTORY:
      return {
        ...state,
        tree: {
          ...state.tree,
          factories: state.tree.factories.filter(factory => 
            factory.id !== action.payload
          )
        }
      };
      
    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
};

// Create the context
const TreeContext = createContext();

/**
 * Tree context provider component
 */
export const TreeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(treeReducer, initialState);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    console.log('WebSocket message received:', data);
    
    // Match the backend's action-based message format
    switch (data.action) {
      case 'connection_established':
        console.log('WebSocket connection established', data.data);
        dispatch({ type: actionTypes.SOCKET_CONNECTED });
        break;
        
      case 'factory_created':
        // Map backend data to our frontend structure
        const newFactory = {
          id: data.data.id,
          name: data.data.name,
          lowerBound: data.data.lower_bound,
          upperBound: data.data.upper_bound,
          childCount: data.data.child_count,
          children: []
        };
        dispatch({ type: actionTypes.SOCKET_UPDATE_FACTORY, payload: newFactory });
        break;
        
      case 'factory_updated':
        // Find existing factory to preserve its children
        const existingFactory = state.tree.factories.find(
          factory => factory.id === data.data.id
        );

        // Map backend data to our frontend structure while preserving children
        const updatedFactory = {
          id: data.data.id,
          name: data.data.name,
          lowerBound: data.data.lower_bound,
          upperBound: data.data.upper_bound,
          childCount: data.data.child_count,
          // Preserve existing children
          children: existingFactory ? existingFactory.children : []
        };
        
        dispatch({ type: actionTypes.SOCKET_UPDATE_FACTORY, payload: updatedFactory });
        break;
        
      case 'children_generated':
        // Get the factory that needs to be updated
        const factoryToUpdate = state.tree.factories.find(
          factory => factory.id === data.data.factory_id
        );
        
        if (factoryToUpdate) {
          // Map the children data from backend to frontend structure
          const mappedChildren = data.data.children.map(child => ({
            id: child.id,
            value: child.value
          }));
          
          // Create updated factory object with new children
          const factoryWithChildren = {
            ...factoryToUpdate,
            children: mappedChildren
          };
          
          dispatch({ type: actionTypes.SOCKET_UPDATE_FACTORY, payload: factoryWithChildren });
        }
        break;
        
      case 'factory_deleted':
        dispatch({ type: actionTypes.SOCKET_DELETE_FACTORY, payload: data.data.id });
        break;
        
      case 'error':
        dispatch({ type: actionTypes.SOCKET_ERROR, payload: data.data.message });
        break;
        
      case 'client_disconnected':
      case 'pong':
        // These are informational only, no state updates needed
        console.log(`Received ${data.action} message:`, data.data);
        break;
        
      default:
        console.warn('Unknown WebSocket message action:', data.action);
    }
  }, [state.tree.factories]);
  
  // Set up WebSocket connection
  const { connectionStatus, error: socketError } = useWebSocket(
    WEBSOCKET_URL,
    handleWebSocketMessage
  );
  
  // Update socket connection status
  useEffect(() => {
    if (connectionStatus === 'OPEN') {
      dispatch({ type: actionTypes.SOCKET_CONNECTED });
    } else if (connectionStatus === 'CLOSED' || connectionStatus === 'RECONNECTING') {
      dispatch({ type: actionTypes.SOCKET_DISCONNECTED });
    }
    
    if (socketError) {
      dispatch({ type: actionTypes.SOCKET_ERROR, payload: socketError });
    }
  }, [connectionStatus, socketError]);
  
  // Fetch the initial tree state
  useEffect(() => {
    const fetchInitialTree = async () => {
      dispatch({ type: actionTypes.FETCH_TREE_START });
      
      try {
        const response = await treeApi.getTree();
        
        if (response.success) {
          dispatch({ type: actionTypes.FETCH_TREE_SUCCESS, payload: response.data });
        } else {
          dispatch({ type: actionTypes.FETCH_TREE_ERROR, payload: response.message });
        }
      } catch (error) {
        dispatch({ 
          type: actionTypes.FETCH_TREE_ERROR, 
          payload: error.message || 'Failed to fetch tree data' 
        });
      }
    };
    
    fetchInitialTree();
  }, []);
  
  // Factory operations
  const addFactory = async (factoryData) => {
    dispatch({ type: actionTypes.ADD_FACTORY_START });
    
    try {
      const response = await treeApi.createFactory(factoryData);
      
      if (response.success) {
        dispatch({ type: actionTypes.ADD_FACTORY_SUCCESS, payload: response.data });
        return { success: true, factory: response.data };
      } else {
        dispatch({ type: actionTypes.ADD_FACTORY_ERROR, payload: response.message });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to add factory';
      dispatch({ type: actionTypes.ADD_FACTORY_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };
  
  const updateFactory = async (factoryId, factoryData) => {
    dispatch({ type: actionTypes.UPDATE_FACTORY_START });
    
    try {
      // Find the existing factory to preserve its children
      const existingFactory = state.tree.factories.find(
        factory => factory.id === factoryId
      );
      
      const response = await treeApi.updateFactory(factoryId, factoryData);
      
      if (response.success) {
        // Preserve children from the existing factory in the updated factory data
        const updatedFactoryWithChildren = {
          ...response.data,
          children: existingFactory ? existingFactory.children : []
        };
        
        dispatch({ 
          type: actionTypes.UPDATE_FACTORY_SUCCESS, 
          payload: updatedFactoryWithChildren
        });
        
        return { success: true, factory: updatedFactoryWithChildren };
      } else {
        dispatch({ type: actionTypes.UPDATE_FACTORY_ERROR, payload: response.message });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update factory';
      dispatch({ type: actionTypes.UPDATE_FACTORY_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };
  
  const deleteFactory = async (factoryId) => {
    dispatch({ type: actionTypes.DELETE_FACTORY_START });
    
    try {
      const response = await treeApi.deleteFactory(factoryId);
      
      if (response.success) {
        dispatch({ type: actionTypes.DELETE_FACTORY_SUCCESS, payload: factoryId });
        return { success: true };
      } else {
        dispatch({ type: actionTypes.DELETE_FACTORY_ERROR, payload: response.message });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete factory';
      dispatch({ type: actionTypes.DELETE_FACTORY_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };
  
  const generateChildren = async (factoryId) => {
    dispatch({ type: actionTypes.GENERATE_CHILDREN_START });
    
    try {
      const response = await treeApi.generateChildren(factoryId);
      
      if (response.success) {
        dispatch({ type: actionTypes.GENERATE_CHILDREN_SUCCESS, payload: response.data });
        return { success: true, factory: response.data };
      } else {
        dispatch({ type: actionTypes.GENERATE_CHILDREN_ERROR, payload: response.message });
        return { success: false, error: response.message };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to generate children';
      dispatch({ type: actionTypes.GENERATE_CHILDREN_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };
  
  const clearError = () => {
    dispatch({ type: actionTypes.CLEAR_ERROR });
  };
  
  // Context value
  const value = {
    tree: state.tree,
    loading: state.loading,
    error: state.error,
    socketConnected: state.socketConnected,
    addFactory,
    updateFactory,
    deleteFactory,
    generateChildren,
    clearError
  };
  
  return (
    <TreeContext.Provider value={value}>
      {children}
    </TreeContext.Provider>
  );
};

// Custom hook to use the tree context
export const useTree = () => {
  const context = useContext(TreeContext);
  
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider');
  }
  
  return context;
};

export default TreeContext;