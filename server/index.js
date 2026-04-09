/**
 * index.js – Express HTTP server + WebSocket server.
 *
 * Architecture:
 *   - Express serves REST API endpoints
 *   - ws.Server is attached to the HTTP server (upgrade-based)
 *   - JWT authentication for both REST and WebSocket
 *   - Clients connect with ?token=JWT query param
 *   - Heartbeat (ping/pong) every 30 s to detect stale connections
 *   - MongoDB connected before server starts
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const connectDB = require('./dbConnctions');
const roomManager = require('./roomManager');
const messageHandler = require('./messageHandler');
const User = require('./models/User');
const RoomMember = require('./models/RoomMember');
const { authenticate, verifyToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

// ── Express ─────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS — allow React dev server
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));

// ── Auth Routes (public) ────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);

// ── Health check (public) ───────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Protected REST Endpoints ────────────────────────────────────────────────────

// Get all members of a room (with roles)
app.get('/api/rooms/:roomId', authenticate, (req, res) => {
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

// Add a user to a room (or update their role)
app.post('/api/rooms/:roomId/members', authenticate, async (req, res) => {
    const { roomId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    const validRoles = ['admin', 'write', 'read'];
    const assignedRole = role || 'write';

    if (!validRoles.includes(assignedRole)) {
        return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    try {
        const userExists = await User.findOne({ username: userId });
        if (!userExists) {
            return res.status(404).json({ error: `User '${userId}' not found.` });
        }

        const member = await RoomMember.findOneAndUpdate(
            { roomId, userId },
            { role: assignedRole },
            { upsert: true, new: true }
        );

        await roomManager.setRole(roomId, userId, assignedRole);

        res.status(201).json({ message: 'Member added/updated', member });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users in the system (protected)
app.get('/api/users', authenticate, async (_req, res) => {
    try {
        const users = await User.find({}).select('-password -__v');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const server = http.createServer(app);

// ── WebSocket Server ────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const token = params.get('token');
    const roomId = params.get('roomId');

    // ── JWT Authentication ───────────────────────────────────────────────────────
    if (!token) {
        ws.close(4001, 'Authentication required. Provide ?token=JWT');
        return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        ws.close(4001, 'Invalid or expired token');
        return;
    }

    const userId = decoded.username;

    if (!roomId) {
        ws.close(4000, 'Missing roomId query parameter');
        return;
    }

    // Register in room (loads role from DB)
    await roomManager.joinRoom(roomId, userId, ws);
    console.log(`[+] ${userId} joined ${roomId}  (clients: ${roomManager.getMembers(roomId).length})`);

    // Notify others in the room
    roomManager.broadcast(roomId, {
        type: 'system',
        message: `${userId} joined the room`,
        roomId,
        timestamp: new Date().toISOString(),
    }, userId);

    // Tell the joiner their role and who's in the room
    const role = roomManager.getRole(roomId, userId);
    ws.send(JSON.stringify({
        type: 'system',
        message: `Connected to ${roomId} as "${role}"`,
        role,
        roomId,
        members: roomManager.getMembers(roomId),
        timestamp: new Date().toISOString(),
    }));

    // ── Heartbeat ─────────────────────────────────────────────────────────────────
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // ── Incoming Messages ─────────────────────────────────────────────────────────
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

    // ── Disconnect ────────────────────────────────────────────────────────────────
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

// ── Heartbeat Interval ────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL = 30_000;

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

// ── Start (DB first, then server) ─────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});