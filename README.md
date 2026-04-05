# Chat Interface System

A modular, full-stack chat system built with **Node.js**, **Express**, and **WebSockets** (`ws`). Supports multiple message types, real-time typing indicators, and role-based access control—all powered by in-memory state.

---

## Quick Start

```bash
npm install
npm start          # → http://localhost:3000
```

Open multiple browser tabs, pick different users (alice / bob / charlie), and join `room1` to chat.

---

## Project Structure

```
/server
  index.js            # Express + WebSocket server with heartbeat
  roomManager.js      # Room state, members, roles, broadcast
  messageHandler.js   # Route messages by type, validate, enforce RBAC
  rbac.js             # Role-check helpers (canSend, canChangeRole)
/client
  index.html          # Single-page demo UI
README.md
```

---

## Architecture Q&A

### 1. What library is used for WebSockets and why?

We use the **`ws`** library (not Socket.IO). Reasons:

- **Lightweight** – zero-dependency, protocol-native implementation with no abstraction layer overhead.
- **Standards-compliant** – speaks raw RFC 6455 WebSocket, making it easy to integrate with any client (browsers, mobile, IoT).
- **Full control** – gives direct access to ping/pong frames for heartbeat, binary messages for future streaming, and upgrade-level hooks.
- Socket.IO adds automatic reconnection and room abstractions, but for this system we want explicit control over room management and RBAC enforcement at the message level.

### 2. How are non-text message types (audio, documents, images) handled?

All message types travel over the **same WebSocket connection** as JSON payloads:

```json
{
  "type": "image",
  "content": {
    "data": "<base64-encoded string>",
    "caption": "Screenshot"
  }
}
```

- **Audio** includes a `duration` (seconds) field alongside the base64 `data`.
- **Documents** carry `filename`, `mimeType`, `data` (base64), and `size` (bytes).
- The server validates required fields per type in `messageHandler.js`, then stamps each message with a `messageId` (UUID v4), `senderId`, `roomId`, and `timestamp` before broadcasting.

> **Production note:** For large files, a hybrid approach is recommended—upload the binary via HTTP (multipart) to object storage (S3), then send a WebSocket message containing only the file URL and metadata. This keeps the WebSocket channel fast and prevents memory spikes.

### 3. How is the typing indicator implemented?

1. **Client → Server:** On every `input` event the client sends `{ type: "typing", isTyping: true }`. A 2-second debounce timer resets on each keystroke; when it fires, `isTyping: false` is sent.
2. **Server → Other Clients:** The server rebroadcasts the typing event to **all other members** in the room (excluding the sender) via `roomManager.broadcast(roomId, payload, excludeUserId)`.
3. **Receiver UI:** A `typingTimers` map tracks who is typing. Each entry has a 3-second auto-expire. The indicator renders "alice is typing…" or "alice, bob are typing…".

### 4. How is role separation (Admin / Read / Write) enforced?

| Role    | Send | Receive | Change Roles |
|---------|------|---------|--------------|
| `admin` | ✅   | ✅      | ✅           |
| `write` | ✅   | ✅      | ❌           |
| `read`  | ❌   | ✅      | ❌           |

- Roles are stored in `roomManager.js` as `Map<roomId, Map<userId, role>>` and seeded on startup.
- **Server-side enforcement** happens in `messageHandler.js` before any broadcast:
  - Content messages (`text`, `audio`, `image`, `document`) call `rbac.canSend()`. If the user is `read`, an `{ type: "error", message: "Permission denied" }` is sent back.
  - `change_role` calls `rbac.canChangeRole()`. Only `admin` users pass.
- The client never trusts its own role—every action is validated server-side.

---

## Seed Data

| Room    | User      | Role    |
|---------|-----------|---------|
| `room1` | alice     | admin   |
| `room1` | bob       | write   |
| `room1` | charlie   | read    |
| `room2` | *(empty)* |         |

---

## Features

- ✅ Real-time WebSocket messaging (text, audio, image, document)
- ✅ Typing indicator with debounce
- ✅ Role-based access control (admin / write / read)
- ✅ Admin can change roles at runtime
- ✅ Heartbeat ping/pong (30s interval) to detect stale connections
- ✅ Graceful disconnect with room notifications
- ✅ Multi-tab support (same user, multiple connections)
- ✅ REST endpoint for room/member inspection (`GET /api/rooms/:roomId`)
