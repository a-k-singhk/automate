/**
 * index.js – Express HTTP server + WebSocket server.
 *
 * Architecture:
 *   - Express serves the static /client directory
 *   - ws.Server is attached to the HTTP server (upgrade-based)
 *   - Clients connect with ?userId=X&roomId=Y query params
 *   - Heartbeat (ping/pong) every 30 s to detect stale connections
 */

'use strict';

const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const url = require('url');

const roomManager = require('./roomManager');
const messageHandler = require('./messageHandler');

// ── Express ─────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));

// Health endpoint
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// List rooms & members (handy for debugging)
app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    if (!roomManager.isValidRoom(roomId)) {
        return res.status(404).json({ error: 'Room not found' });
    }
    const members = roomManager.getMembers(roomId);
    const memberDetails = members.map((uid) => ({
        userId: uid,
        role: roomManager.getRole(roomId, uid),
    }));
    res.json({ roomId, members: memberDetails });
});

const server = http.createServer(app);

// ── WebSocket Server ────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    // Parse query params
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const userId = params.get('userId');
    const roomId = params.get('roomId');

    if (!userId || !roomId) {
        ws.close(4000, 'Missing userId or roomId query parameter');
        return;
    }

    // Register
    roomManager.joinRoom(roomId, userId, ws);
    console.log(`[+] ${userId} joined ${roomId}  (clients: ${roomManager.getMembers(roomId).length})`);

    // Notify room
    roomManager.broadcast(roomId, {
        type: 'system',
        message: `${userId} joined the room`,
        roomId,
        timestamp: new Date().toISOString(),
    }, userId);

    // Send the joiner their current role
    const role = roomManager.getRole(roomId, userId);
    ws.send(JSON.stringify({
        type: 'system',
        message: `Connected to ${roomId} as "${role}"`,
        role,
        roomId,
        members: roomManager.getMembers(roomId),
        timestamp: new Date().toISOString(),
    }));

    // ── Heartbeat ───────────────────────────────────────────────────────────────
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // ── Incoming Messages ───────────────────────────────────────────────────────
    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        messageHandler.handle(ws, msg, userId, roomId);
    });

    // ── Disconnect ──────────────────────────────────────────────────────────────
    ws.on('close', () => {
        const fullyLeft = roomManager.leaveRoom(roomId, userId, ws);
        if (fullyLeft) {
            console.log(`[-] ${userId} left ${roomId}`);
            roomManager.broadcast(roomId, {
                type: 'system',
                message: `${userId} left the room`,
                roomId,
                timestamp: new Date().toISOString(),
            });
        }
    });

    ws.on('error', (err) => {
        console.error(`[!] WS error for ${userId}@${roomId}:`, err.message);
    });
});

// ── Heartbeat Interval ──────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
        if (!ws.isAlive) {
            console.log('[!] Terminating stale connection');
            ws.terminate();
            continue;
        }
        ws.isAlive = false;
        ws.ping();
    }
}, HEARTBEAT_INTERVAL);

wss.on('close', () => clearInterval(heartbeat));

// ── Start ───────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
