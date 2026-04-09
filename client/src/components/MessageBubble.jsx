export default function MessageBubble({ msg, currentUser }) {
  // System message
  if (msg.type === 'system' || msg.cls === 'system') {
    return (
      <div className="animate-fade-in-up text-center py-1">
        <span className="text-text-muted text-sm italic">{msg.message}</span>
      </div>
    );
  }

  // Error message
  if (msg.type === 'error' || msg.cls === 'error') {
    return (
      <div className="animate-fade-in-up text-center py-1">
        <span className="bg-danger/10 text-danger text-sm px-4 py-2 rounded-lg inline-block">
          ⚠️ {msg.message}
        </span>
      </div>
    );
  }

  const isOwn = msg.senderId === currentUser;
  const alignment = isOwn ? 'items-end' : 'items-start';

  // Content rendering based on type
  let content;
  switch (msg.type) {
    case 'text':
      content = msg.content?.text || '';
      break;
    case 'audio':
      content = `🎙️ Audio (${msg.content?.duration || 0}s)`;
      break;
    case 'image':
      content = `🖼️ Image${msg.content?.caption ? ': ' + msg.content.caption : ''}`;
      break;
    case 'document': {
      const size = msg.content?.size || 0;
      const formatted = size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
      content = `📄 ${msg.content?.filename || 'file'} (${formatted})`;
      break;
    }
    default:
      content = JSON.stringify(msg);
  }

  return (
    <div className={`flex flex-col ${alignment} animate-fade-in-up`}>
      {/* Sender name for other users */}
      {!isOwn && msg.senderId && (
        <span className="text-xs text-text-muted mb-1 ml-1 font-medium">
          {msg.senderId}
        </span>
      )}

      <div
        className={`max-w-[70%] px-4 py-3 text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary text-white rounded-2xl rounded-br-sm'
            : 'bg-surface2 text-text rounded-2xl rounded-bl-sm'
        }`}
      >
        {/* Type badge for non-text */}
        {msg.type !== 'text' && (
          <span className="inline-block text-[0.65rem] px-2 py-0.5 rounded-md bg-white/15 mr-2 uppercase tracking-wide font-medium">
            {msg.type}
          </span>
        )}
        {content}

        {/* Timestamp */}
        {msg.timestamp && (
          <div className={`text-[0.65rem] mt-1 text-right ${isOwn ? 'text-white/50' : 'text-text-muted/60'}`}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
