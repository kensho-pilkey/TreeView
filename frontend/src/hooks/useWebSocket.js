import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to manage WebSocket connection and handle real-time updates
 * 
 * @param {string} url - WebSocket server URL
 * @param {Function} onMessage - Callback function to handle incoming messages
 * @param {number} reconnectDelay - Base delay for reconnection attempts in ms
 * @param {number} maxReconnectAttempts - Maximum number of reconnection attempts
 * @returns {Object} - WebSocket connection state and control methods
 */
const useWebSocket = (
  url, 
  onMessage, 
  reconnectDelay = 1000, 
  maxReconnectAttempts = 10
) => {
  // Connection states: 'CONNECTING', 'OPEN', 'CLOSING', 'CLOSED', 'RECONNECTING'
  const [connectionStatus, setConnectionStatus] = useState('CLOSED');
  const [error, setError] = useState(null);
  
  // References to preserve values between renders without triggering effects
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  
  // Memoized connection handler to prevent unnecessary effect triggers
  const connect = useCallback(() => {
    // Clear any existing reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setTimeout(() => {
      try {
        setConnectionStatus('CONNECTING');
        
        // Create new WebSocket connection
        const socket = new WebSocket(url);
        socketRef.current = socket;
        
        // Connection opened handler
        socket.onopen = () => {
          setConnectionStatus('OPEN');
          setError(null);
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        };
        
        // Message received handler
        socket.onmessage = (event) => {
          try {
            // Parse JSON data from the server
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Call the provided message handler with the parsed data
            onMessage(data);
            
            // Handle ping/pong for connection health check
            if (data.action === 'ping') {
              socket.send(JSON.stringify({
                action: 'pong',
                timestamp: Date.now()
              }));
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
            setError('Failed to parse message from server');
          }
        };
        
        // Connection closed handler
        socket.onclose = (event) => {
          setConnectionStatus('CLOSED');
          
          // Don't attempt to reconnect if socket was closed intentionally
          if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
            attemptReconnect();
          }
        };
        
        // Error handler
        socket.onerror = (err) => {
          console.error('WebSocket error:', err);
          setError('WebSocket connection error');
        };
      } catch (err) {
        console.error('Failed to create WebSocket connection:', err);
        setError('Failed to create WebSocket connection');
        attemptReconnect();
      }
    }, 500);
  }, [url, onMessage, maxReconnectAttempts]);
  
  // Attempt to reconnect with exponential backoff
  const attemptReconnect = useCallback(() => {
    setConnectionStatus('RECONNECTING');
    
    const attempts = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempts;
    
    // Calculate exponential backoff delay: reconnectDelay * 2^attempts
    // With a maximum of 30 seconds to prevent excessively long waits
    const delay = Math.min(reconnectDelay * Math.pow(2, attempts - 1), 30000);
    
    console.log(`Attempting to reconnect (${attempts}/${maxReconnectAttempts}) in ${delay}ms`);
    
    // Set timeout for reconnection
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectDelay, maxReconnectAttempts]);
  
  // Manually send a message through the WebSocket
  const sendMessage = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);
  
  // Manually close the WebSocket connection
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setConnectionStatus('CLOSED');
  }, []);
  
  // Connect when the component mounts
  useEffect(() => {
    connect();
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    connectionStatus,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};

export default useWebSocket;