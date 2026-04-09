export default function MembersList({ members }) {
  if (!members || members.length === 0) {
    return (
      <p className="text-text-muted text-sm">No members online</p>
    );
  }

  const roleColors = {
    admin: 'bg-primary/20 text-primary',
    write: 'bg-accent/15 text-accent',
    read: 'bg-danger/12 text-danger',
  };

  return (
    <div className="flex flex-col gap-1.5">
      {members.map((m) => (
        <div
          key={m.userId}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface2 animate-slide-in"
        >
          <div className="flex items-center gap-2">
            {/* Online dot */}
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
            <span className="text-sm text-text">{m.userId}</span>
          </div>
          <span
            className={`text-[0.65rem] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wide ${
              roleColors[m.role] || 'bg-surface text-text-muted'
            }`}
          >
            {m.role}
          </span>
        </div>
      ))}
    </div>
  );
}
