import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    // Close existing socket before creating a new one (so we can
    // re-authenticate whenever login state or token changes)
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
      joinedRoomsRef.current.clear();
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected', isAuthenticated ? `(user: ${user?.id})` : '(guest)');
      setConnected(true);
      // Re-join all rooms after reconnect
      joinedRoomsRef.current.forEach((roomId) => {
        newSocket.emit('join-room', roomId);
      });
    });

    newSocket.on('connect_error', (err) => {
      console.log('❌ Socket error:', err.message);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.userId]: data.isTyping ? data.userName : null,
      }));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.close();
      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
      joinedRoomsRef.current.clear();
    };
    // Recreate the socket whenever auth state changes so the new
    // connection authenticates with the current token.
  }, [isAuthenticated, user?.id]);

  const joinRoom = (roomId) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('join-room', roomId);
      joinedRoomsRef.current.add(roomId);
    }
  };

  const leaveRoom = (roomId) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave-room', roomId);
      joinedRoomsRef.current.delete(roomId);
    }
  };

  const sendMessage = (roomId, content) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { roomId, content });
    }
  };

  const setTyping = (roomId, isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { roomId, isTyping });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      onlineUsers,
      typingUsers,
      connected,
      joinRoom,
      leaveRoom,
      sendMessage,
      setTyping,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);