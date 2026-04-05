import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { BASE } from '../services/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (token) {
      socketRef.current = io(BASE, { auth: { token } });
      socketRef.current.on('connect_error', (err) => {
        console.warn('Socket error:', err.message);
      });
    }
    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
