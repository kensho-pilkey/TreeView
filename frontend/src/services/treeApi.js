/**
 * API service for interacting with the Factory Tree backend
 */

// Base URL for API endpoints - replace with your actual API URL
// In production, you would use environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws';

/**
 * Handles API errors and returns a standardized error object
 * 
 * @param {Response} response - The fetch Response object
 * @returns {Promise<Object>} - Promise resolving to an error object
 */
const handleApiError = async (response) => {
  let errorMessage;
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || 'Unknown error occurred';
  } catch (error) {
    errorMessage = `API error: ${response.statusText || response.status}`;
  }
  
  return {
    success: false,
    status: response.status,
    message: errorMessage
  };
};

/**
 * Generic fetch wrapper for API calls
 * 
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options (method, headers, body)
 * @returns {Promise<Object>} - Promise resolving to response data or error
 */
const apiFetch = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}/${endpoint}`;
    
    // Set default headers if not provided
    if (!options.headers) {
      options.headers = {
        'Content-Type': 'application/json'
      };
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      return handleApiError(response);
    }
    
    // For 204 No Content responses
    if (response.status === 204) {
      return { success: true };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      message: error.message || 'Network error occurred'
    };
  }
};

// Factory Tree API endpoints
const treeApi = {
  /**
   * Get the current state of the tree
   * 
   * @returns {Promise<Object>} - Promise resolving to tree data
   */
  getTree: async () => {
    const response = await apiFetch('tree');
    
    if (response.success) {
      // Transform the API response to match our frontend data structure
      const apiData = response.data.data;
      
      return {
        success: true,
        data: {
          id: apiData.id,
          name: apiData.name,
          factories: apiData.factories.map(factory => ({
            id: factory.id,
            name: factory.name,
            lowerBound: factory.lower_bound,
            upperBound: factory.upper_bound,
            childCount: factory.child_count,
            children: factory.children.map(child => ({
              id: child.id,
              value: child.value
            }))
          }))
        }
      };
    }
    
    return response;
  },
  
  /**
   * Create a new factory
   * 
   * @param {Object} factoryData - New factory data
   * @returns {Promise<Object>} - Promise resolving to created factory data
   */
  createFactory: async (factoryData) => {
    // Transform the frontend data structure to match the API
    const apiFactoryData = {
      name: factoryData.name,
      lower_bound: factoryData.lowerBound,
      upper_bound: factoryData.upperBound,
      child_count: factoryData.childCount
    };
    
    const response = await apiFetch('factories', {
      method: 'POST',
      body: JSON.stringify(apiFactoryData)
    });
    
    if (response.success) {
      // Transform the API response to match our frontend data structure
      const apiFactory = response.data.data;
      
      return {
        success: true,
        data: {
          id: apiFactory.id,
          name: apiFactory.name,
          lowerBound: apiFactory.lower_bound,
          upperBound: apiFactory.upper_bound,
          childCount: apiFactory.child_count,
          children: apiFactory.children.map(child => ({
            id: child.id,
            value: child.value
          }))
        }
      };
    }
    
    return response;
  },
  
  /**
   * Update an existing factory
   * 
   * @param {string} factoryId - ID of the factory to update
   * @param {Object} factoryData - Updated factory data
   * @returns {Promise<Object>} - Promise resolving to updated factory data
   */
  updateFactory: async (factoryId, factoryData) => {
    // Transform the frontend data structure to match the API
    const apiFactoryData = {
      name: factoryData.name,
      lower_bound: factoryData.lowerBound,
      upper_bound: factoryData.upperBound,
      child_count: factoryData.childCount
    };
    
    const response = await apiFetch(`factories/${factoryId}`, {
      method: 'PUT',
      body: JSON.stringify(apiFactoryData)
    });
    
    if (response.success) {
      // Transform the API response to match our frontend data structure
      const apiFactory = response.data.data;
      
      return {
        success: true,
        data: {
          id: apiFactory.id,
          name: apiFactory.name,
          lowerBound: apiFactory.lower_bound,
          upperBound: apiFactory.upper_bound,
          childCount: apiFactory.child_count,
          children: apiFactory.children ? apiFactory.children.map(child => ({
            id: child.id,
            value: child.value
          })) : []
        }
      };
    }
    
    return response;
  },
  
  /**
   * Delete a factory
   * 
   * @param {string} factoryId - ID of the factory to delete
   * @returns {Promise<Object>} - Promise with success status
   */
  deleteFactory: async (factoryId) => {
    return apiFetch(`factories/${factoryId}`, {
      method: 'DELETE'
    });
  },
  
  /**
   * Generate children for a factory
   * 
   * @param {string} factoryId - ID of the factory
   * @returns {Promise<Object>} - Promise resolving to updated factory with children
   */
  generateChildren: async (factoryId) => {
    const response = await apiFetch(`factories/${factoryId}/generate`, {
      method: 'POST'
    });
    
    if (response.success) {
      // Transform the API response to match our frontend data structure
      const apiFactory = response.data.data;
      
      return {
        success: true,
        data: {
          id: apiFactory.id,
          name: apiFactory.name,
          lowerBound: apiFactory.lower_bound,
          upperBound: apiFactory.upper_bound,
          childCount: apiFactory.child_count,
          children: apiFactory.children.map(child => ({
            id: child.id,
            value: child.value
          }))
        }
      };
    }
    
    return response;
  }
};

export { 
  treeApi, 
  WEBSOCKET_URL 
};