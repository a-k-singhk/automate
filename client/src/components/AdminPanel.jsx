import { useState } from 'react';

export default function AdminPanel({ onChangeRole }) {
  const [targetUser, setTargetUser] = useState('');
  const [newRole, setNewRole] = useState('write');

  const handleApply = () => {
    if (!targetUser.trim()) return;
    onChangeRole(targetUser.trim(), newRole);
    setTargetUser('');
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
        <span>⚡</span> Admin: Change Role
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
          placeholder="Username"
          className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all cursor-pointer"
        >
          <option value="admin">admin</option>
          <option value="write">write</option>
          <option value="read">read</option>
        </select>
      </div>

      <button
        onClick={handleApply}
        className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2 rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-glow cursor-pointer"
      >
        Apply
      </button>
    </div>
  );
}
