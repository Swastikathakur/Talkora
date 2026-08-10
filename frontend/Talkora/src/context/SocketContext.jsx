import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';
import { setAuthToken } from '../lib/api';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    let newSocket = null;

    const initSocket = async () => {
      if (!isSignedIn) {
        setAuthToken(null);
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
        return;
      }

      try {
        const token = await getToken();
        setAuthToken(token);

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        newSocket = io(API_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('getOnlineUsers', (users) => {
          setOnlineUsers(users);
        });

        setSocket(newSocket);
      } catch (err) {
        console.error('Error initializing socket connection:', err);
      }
    };

    initSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isSignedIn, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
