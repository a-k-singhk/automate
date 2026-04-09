import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { getRoomMembers } from '../utils/api';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const ws = useWebSocket();

  const [currentRoom, setCurrentRoom] = useState('');
  const [memberDetails, setMemberDetails] = useState([]);

  // Fetch member details from API (with roles)
  const fetchMembers = useCallback(async () => {
    if (!currentRoom) return;
    try {
      const data = await getRoomMembers(currentRoom);
      setMemberDetails(data.members || []);
    } catch {
      // If room doesn't exist yet in API, use WS member list
      setMemberDetails(
        ws.members.map((uid) => ({ userId: uid, role: 'write' }))
      );
    }
  }, [currentRoom, ws.members]);

  // Re-fetch members whenever the WS member list changes
  useEffect(() => {
    if (ws.isConnected && currentRoom) {
      fetchMembers();
    }
  }, [ws.isConnected, ws.members, ws.messages, currentRoom, fetchMembers]);

  // Handle connect
  const handleConnect = useCallback((roomId) => {
    ws.clearMessages();
    setCurrentRoom(roomId);
    ws.connect(roomId);
  }, [ws]);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    ws.disconnect();
    setCurrentRoom('');
    setMemberDetails([]);
  }, [ws]);

  // Handle role change
  const handleChangeRole = useCallback((targetUserId, newRole) => {
    ws.sendChangeRole(targetUserId, newRole);
    // Refetch members after a short delay
    setTimeout(fetchMembers, 500);
  }, [ws, fetchMembers]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (user?.username && currentRoom) {
      ws.sendTyping(currentRoom, user.username);
    }
  }, [ws, currentRoom, user]);

  // Handle logout
  const handleLogout = useCallback(() => {
    ws.disconnect();
    logout();
  }, [ws, logout]);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        isConnected={ws.isConnected}
        currentRoom={currentRoom}
        currentRole={ws.currentRole}
        members={memberDetails}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onChangeRole={handleChangeRole}
        onLogout={handleLogout}
        username={user?.username}
      />
      <ChatArea
        messages={ws.messages}
        typingUsers={ws.typingUsers}
        currentRoom={currentRoom}
        currentUser={user?.username}
        currentRole={ws.currentRole}
        isConnected={ws.isConnected}
        onSendText={ws.sendText}
        onTyping={handleTyping}
      />
    </div>
  );
}
