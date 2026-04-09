import { useRef, useState, useCallback, useEffect } from 'react';
import { getToken } from '../utils/api';

/**
 * Custom hook for managing a WebSocket connection with JWT auth.
 */
export function useWebSocket() {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentRole, setCurrentRole] = useState('');
  const [typingUsers, setTypingUsers] = useState({});

  const typingSentRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const typingTimersRef = useRef({});

  // Clear typing user after timeout
  const clearTypingUser = useCallback((userId) => {
    setTypingUsers((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'system':
        setMessages((prev) => [...prev, { ...msg, cls: 'system' }]);
        if (msg.role) setCurrentRole(msg.role);
        if (msg.members) {
          // members is just an array of userIds from system message
          // We'll refetch from API for role info
          setMembers(msg.members);
        }
        break;

      case 'text':
      case 'audio':
      case 'image':
      case 'document':
        setMessages((prev) => [...prev, msg]);
        break;

      case 'typing': {
        const { userId, isTyping } = msg;
        if (isTyping) {
          setTypingUsers((prev) => ({ ...prev, [userId]: true }));
          clearTimeout(typingTimersRef.current[userId]);
          typingTimersRef.current[userId] = setTimeout(() => {
            clearTypingUser(userId);
          }, 3000);
        } else {
          clearTimeout(typingTimersRef.current[userId]);
          clearTypingUser(userId);
        }
        break;
      }

      case 'role_changed':
        setMessages((prev) => [
          ...prev,
          {
            type: 'system',
            cls: 'system',
            message: `🔄 ${msg.changedBy} changed ${msg.targetUserId}'s role to ${msg.newRole}`,
            timestamp: msg.timestamp,
          },
        ]);
        // The members list will be refetched by the ChatPage
        break;

      case 'error':
        setMessages((prev) => [
          ...prev,
          { type: 'error', cls: 'error', message: msg.message, timestamp: new Date().toISOString() },
        ]);
        break;

      default:
        break;
    }
  }, [clearTypingUser]);

  // Connect to WebSocket
  const connect = useCallback((roomId) => {
    const token = getToken();
    if (!token || wsRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? window.location.hostname + ':3000' 
      : window.location.host;
    const ws = new WebSocket(`${protocol}://${host}?token=${token}&roomId=${roomId}`);

    ws.addEventListener('open', () => {
      setIsConnected(true);
    });

    ws.addEventListener('message', handleMessage);

    ws.addEventListener('close', () => {
      setIsConnected(false);
      wsRef.current = null;
      setCurrentRole('');
      setTypingUsers({});
    });

    ws.addEventListener('error', () => {
      setMessages((prev) => [
        ...prev,
        { type: 'error', cls: 'error', message: 'Connection error', timestamp: new Date().toISOString() },
      ]);
    });

    wsRef.current = ws;
  }, [handleMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Send a text message
  const sendText = useCallback((text) => {
    if (!wsRef.current || !text.trim()) return;
    wsRef.current.send(JSON.stringify({ type: 'text', content: { text } }));

    // Stop typing indicator
    clearTimeout(typingTimeoutRef.current);
    if (typingSentRef.current && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'typing', isTyping: false }));
      typingSentRef.current = false;
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((roomId, userId) => {
    if (!wsRef.current) return;

    if (!typingSentRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'typing', roomId, userId, isTyping: true }));
      typingSentRef.current = true;
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'typing', roomId, userId, isTyping: false }));
      }
      typingSentRef.current = false;
    }, 2000);
  }, []);

  // Send role change
  const sendChangeRole = useCallback((targetUserId, newRole) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'change_role', targetUserId, newRole }));
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setMembers([]);
    setCurrentRole('');
    setTypingUsers({});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      Object.values(typingTimersRef.current).forEach(clearTimeout);
    };
  }, [disconnect]);

  return {
    isConnected,
    messages,
    members,
    currentRole,
    typingUsers,
    connect,
    disconnect,
    sendText,
    sendTyping,
    sendChangeRole,
    clearMessages,
  };
}
