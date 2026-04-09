import { useState } from 'react';
import MembersList from './MembersList';
import AdminPanel from './AdminPanel';

export default function Sidebar({
  isConnected,
  currentRoom,
  currentRole,
  members,
  onConnect,
  onDisconnect,
  onChangeRole,
  onLogout,
  username,
}) {
  const [roomId, setRoomId] = useState('room1');

  const handleConnect = () => {
    onConnect(roomId);
  };

  return (
    <aside className="w-[300px] min-w-[300px] bg-surface border-r border-border flex flex-col p-5 gap-5 overflow-y-auto">
      {/* User info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {username?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span className="text-sm font-medium text-text">{username}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
          title="Logout"
        >
          Logout
        </button>
      </div>

      <div className="h-px bg-border" />

      {/* Connect section */}
      <h2 className="text-xs text-text-muted uppercase tracking-widest font-semibold">
        🔌 Connect
      </h2>

      <div className="space-y-1.5">
        <label className="text-xs text-text-muted uppercase tracking-wide">Room ID</label>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={isConnected}
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all disabled:opacity-50 cursor-pointer"
        >
          <option value="room1">room1</option>
          <option value="room2">room2</option>
          <option value="room3">room3</option>
        </select>
      </div>

      {!isConnected ? (
        <button
          onClick={handleConnect}
          id="connect-btn"
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-glow cursor-pointer"
        >
          Connect
        </button>
      ) : (
        <button
          onClick={onDisconnect}
          id="disconnect-btn"
          className="w-full bg-danger hover:bg-danger/80 text-white font-semibold py-2.5 rounded-lg transition-all cursor-pointer"
        >
          Disconnect
        </button>
      )}

      {/* Status badge */}
      <div
        className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full w-fit ${
          isConnected
            ? 'bg-accent/12 text-accent'
            : 'bg-danger/12 text-danger'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-accent shadow-[0_0_8px_var(--color-accent)]' : 'bg-danger'
          }`}
        />
        {isConnected ? `Connected — ${currentRoom}` : 'Disconnected'}
      </div>

      <div className="h-px bg-border" />

      {/* Members */}
      <h2 className="text-xs text-text-muted uppercase tracking-widest font-semibold">
        👥 Members
      </h2>

      {isConnected ? (
        <MembersList members={members} />
      ) : (
        <p className="text-text-muted text-sm">Connect to see members</p>
      )}

      {/* Admin panel */}
      {isConnected && currentRole === 'admin' && (
        <>
          <div className="h-px bg-border" />
          <AdminPanel onChangeRole={onChangeRole} />
        </>
      )}
    </aside>
  );
}
