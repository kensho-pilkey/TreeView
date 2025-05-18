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
  
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const isFirstConnectRef = useRef(true);
  const unmountingRef = useRef(false);
  
  const closeSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (err) {
        console.warn('Error closing WebSocket:', err);
      }
      socketRef.current = null;
    }
  }, []);
  
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  const attemptReconnect = useCallback(() => {
    if (unmountingRef.current) return;
    
    if (reconnectAttemptsRef.current > 1) {
      setConnectionStatus('RECONNECTING');
    }
    
    const attempts = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempts;
    
    const delay = Math.min(reconnectDelay * Math.pow(2, attempts - 1), 30000);
    
    console.log(`Attempting to reconnect (${attempts}/${maxReconnectAttempts}) in ${delay}ms`);
    
    clearTimeouts();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!unmountingRef.current) connect();
    }, delay);
  }, [reconnectDelay, maxReconnectAttempts]);
  
  const connect = useCallback(() => {
    if (unmountingRef.current) return;
    
    clearTimeouts();
    
    if (isFirstConnectRef.current) {
      setConnectionStatus('CONNECTING');
      isFirstConnectRef.current = false;
    }
    
    try {
      closeSocket();
      
      const socket = new WebSocket(url);
      socketRef.current = socket;
      
      socket.onopen = () => {
        if (unmountingRef.current) return;
        setConnectionStatus('OPEN');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };
      
      socket.onmessage = (event) => {
        if (unmountingRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
          
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
      
      socket.onclose = (event) => {
        if (unmountingRef.current) return;
        
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus('CLOSED');
        }
        
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts && !unmountingRef.current) {
          attemptReconnect();
        }
      };
      
      socket.onerror = (err) => {
        if (unmountingRef.current) return;
        
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
        
        const isStrictModeRerender = socketRef.current && 
                                    socketRef.current.readyState === WebSocket.CONNECTING && 
                                    reconnectAttemptsRef.current === 0;
        
        if (!isStrictModeRerender) {
          console.warn('Non-StrictMode WebSocket error occurred');
        }
      };
    } catch (err) {
      if (unmountingRef.current) return;
      
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      attemptReconnect();
    }
  }, [url, onMessage, maxReconnectAttempts, attemptReconnect, closeSocket, clearTimeouts]);
  
  const sendMessage = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);
  
  const disconnect = useCallback(() => {
    unmountingRef.current = true;
    closeSocket();
    clearTimeouts();
    setConnectionStatus('CLOSED');
  }, [closeSocket, clearTimeouts]);
  
  useEffect(() => {
    unmountingRef.current = false;
    
    const connectTimeout = setTimeout(() => {
      if (!unmountingRef.current) connect();
    }, 50);
    
    return () => {
      unmountingRef.current = true;
      clearTimeout(connectTimeout);
      
      setTimeout(() => {
        closeSocket();
        clearTimeouts();
      }, 50);
    };
  }, [connect, closeSocket, clearTimeouts]);

  useEffect(() => {
    if (unmountingRef.current) return;
    
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({
            action: 'ping',
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error sending heartbeat:', err);
        }
      }
    }, 30000);
    
    return () => clearInterval(heartbeatInterval);
  }, []);
  
  return {
    connectionStatus,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};

export default useWebSocket;