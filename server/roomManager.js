/**
 * roomManager.js – In-memory room state + MongoDB persistence.
 *
 * Strategy:
 *   - MongoDB is the source of truth (roles persist across restarts)
 *   - In-memory Maps act as a session cache (fast lookups during active connections)
 *   - On joinRoom: load role from DB → cache it in memory
 *   - On setRole:  update DB first → then update cache
 */

'use strict';

const RoomMember = require('./models/RoomMember');

const VALID_ROLES = ['admin', 'write', 'read'];

// ── In-Memory Cache (session-level, not persistent) ─────────────────────────────

/** roomId → Set<userId> */
const rooms = new Map();

/** roomId → Map<userId, role> */
const roles = new Map();

/** roomId → Map<userId, Set<WebSocket>> */
const clients = new Map();

// ── Helpers ─────────────────────────────────────────────────────────────────────

function ensureRoom(roomId) {
  if (!rooms.has(roomId))   rooms.set(roomId, new Set());
  if (!roles.has(roomId))   roles.set(roomId, new Map());
  if (!clients.has(roomId)) clients.set(roomId, new Map());
}

function isValidRoom(roomId) {
  // Any roomId is valid — rooms are created on first join
  // You can restrict this by checking a Rooms collection in DB if needed
  return typeof roomId === 'string' && roomId.trim().length > 0;
}

// ── Public API ──────────────────────────────────────────────────────────────────

/**
 * Register a WebSocket connection for a user in a room.
 * Loads the user's role from MongoDB; creates a default 'write' entry if new.
 */
async function joinRoom(roomId, userId, ws) {
  ensureRoom(roomId);

  rooms.get(roomId).add(userId);

  // Check if role is already cached (e.g. second tab opening)
  if (!roles.get(roomId).has(userId)) {
    try {
      // Look up role from DB
      let member = await RoomMember.findOne({ roomId, userId });

      if (!member) {
        // First time this user joins this room — create record with default role
        member = await RoomMember.create({ roomId, userId, role: 'write' });
        console.log(`[DB] Created new member: ${userId} in ${roomId} as 'write'`);
      }

      // Cache it in memory for the session
      roles.get(roomId).set(userId, member.role);

    } catch (err) {
      console.error(`[DB] Failed to load role for ${userId}@${roomId}:`, err.message);
      // Fallback to 'read' on DB failure (safe default)
      roles.get(roomId).set(userId, 'read');
    }
  }

  // Track WebSocket (multi-tab safe)
  const roomClients = clients.get(roomId);
  if (!roomClients.has(userId)) roomClients.set(userId, new Set());
  roomClients.get(userId).add(ws);
}

/**
 * Remove a single WebSocket for a user.
 * Returns true if the user fully left the room (all tabs closed).
 */
function leaveRoom(roomId, userId, ws) {
  if (!clients.has(roomId)) return false;

  const roomClients = clients.get(roomId);
  const userSockets = roomClients.get(userId);
  if (!userSockets) return false;

  userSockets.delete(ws);

  if (userSockets.size === 0) {
    roomClients.delete(userId);
    rooms.get(roomId).delete(userId);
    // NOTE: We do NOT remove from roles cache — in case they rejoin quickly
    return true;
  }
  return false;
}

function getMembers(roomId) {
  return rooms.has(roomId) ? [...rooms.get(roomId)] : [];
}

function getRole(roomId, userId) {
  return roles.has(roomId) ? roles.get(roomId).get(userId) || null : null;
}

/**
 * Update a user's role in both MongoDB and the in-memory cache.
 */
async function setRole(roomId, userId, newRole) {
  if (!VALID_ROLES.includes(newRole)) return false;

  try {
    await RoomMember.findOneAndUpdate(
      { roomId, userId },
      { role: newRole },
      { upsert: true, new: true }  // create if doesn't exist, return updated doc
    );

    // Update memory cache if user is currently online
    if (roles.has(roomId)) {
      roles.get(roomId).set(userId, newRole);
    }

    console.log(`[DB] Role updated: ${userId}@${roomId} → ${newRole}`);
    return true;

  } catch (err) {
    console.error(`[DB] Failed to update role for ${userId}@${roomId}:`, err.message);
    return false;
  }
}

function getRoomClients(roomId) {
  return clients.get(roomId) || new Map();
}

/**
 * Broadcast a payload to every connected socket in a room.
 */
function broadcast(roomId, payload, excludeUserId = null) {
  const roomClients = getRoomClients(roomId);
  const data = JSON.stringify(payload);

  for (const [userId, sockets] of roomClients) {
    if (userId === excludeUserId) continue;
    for (const ws of sockets) {
      if (ws.readyState === 1) ws.send(data);
    }
  }
}

module.exports = {
  VALID_ROLES,
  isValidRoom,
  joinRoom,   // now async
  leaveRoom,
  getMembers,
  getRole,
  setRole,    // now async
  getRoomClients,
  broadcast,
};