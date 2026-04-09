import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatArea({
  messages,
  typingUsers,
  currentRoom,
  currentUser,
  currentRole,
  isConnected,
  onSendText,
  onTyping,
}) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendText(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    onTyping();
  };

  // Typing indicator text
  const typerNames = Object.keys(typingUsers);
  let typingText = '';
  if (typerNames.length === 1) {
    typingText = `${typerNames[0]} is typing…`;
  } else if (typerNames.length > 1) {
    typingText = `${typerNames.slice(0, -1).join(', ')} and ${typerNames.at(-1)} are typing…`;
  }

  // Check if user can send (not read-only)
  const canSend = isConnected && currentRole !== 'read';

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-surface flex items-center gap-3">
        {isConnected ? (
          <>
            <span className="text-lg font-semibold">{currentRoom}</span>
            <span className="text-sm text-text-muted">
              connected as <span className="text-primary font-medium">{currentUser}</span>
              {currentRole && (
                <span className={`ml-2 text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                  currentRole === 'admin' ? 'bg-primary/20 text-primary' :
                  currentRole === 'write' ? 'bg-accent/15 text-accent' :
                  'bg-danger/12 text-danger'
                }`}>
                  {currentRole}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="text-lg font-semibold text-text-muted">Select a room to start chatting</span>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted text-sm">
              {isConnected ? 'No messages yet. Say hello! 👋' : 'Connect to a room to see messages'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} currentUser={currentUser} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="px-6 h-6 flex items-center">
        {typingText && (
          <span className="text-xs text-accent italic animate-pulse">{typingText}</span>
        )}
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 border-t border-border bg-surface flex gap-3">
        {currentRole === 'read' && isConnected ? (
          <div className="flex-1 flex items-center justify-center text-text-muted text-sm bg-surface2 rounded-full py-3">
            🔒 Read-only access — you cannot send messages
          </div>
        ) : (
          <>
            <input
              type="text"
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Type a message…' : 'Connect to start chatting'}
              disabled={!canSend}
              id="message-input"
              className="flex-1 bg-surface2 border border-border rounded-full px-5 py-3 text-sm text-text placeholder-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow transition-all disabled:opacity-40"
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              id="send-btn"
              className="bg-primary hover:bg-primary-hover text-white font-semibold px-7 py-3 rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-glow disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none cursor-pointer"
            >
              Send
            </button>
          </>
        )}
      </div>
    </main>
  );
}
