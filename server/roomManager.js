/**
 * roomManager.js – In-memory room state, member registry, and role management.
 *
 * Data structures:
 *   rooms  : Map<roomId, Set<userId>>         – who is in each room
 *   roles  : Map<roomId, Map<userId, role>>   – permission level per user per room
 *   clients: Map<roomId, Map<userId, Set<ws>>>– WebSocket refs (supports multi-tab)
 */

'use strict';

// ── Seed Data ───────────────────────────────────────────────────────────────────

const VALID_ROLES = ['admin', 'write', 'read'];

/** roomId → Map<userId, role> */
const roles = new Map([
  ['room1', new Map([
    ['alice', 'admin'],
    ['bob', 'write'],
    ['charlie', 'read'],
  ])],
  ['room2', new Map()],
]);

/** roomId → Set<userId>  (currently connected users) */
const rooms = new Map([
  ['room1', new Set()],
  ['room2', new Set()],
]);

/** roomId → Map<userId, Set<WebSocket>> */
const clients = new Map([
  ['room1', new Map()],
  ['room2', new Map()],
]);

// ── Public API ──────────────────────────────────────────────────────────────────

function isValidRoom(roomId) {
  return rooms.has(roomId);
}

/**
 * Register a WebSocket connection for a user in a room.
 * Auto-assigns 'write' role if the user has no existing role in that room.
 */
function joinRoom(roomId, userId, ws) {
  if (!isValidRoom(roomId)) {
    rooms.set(roomId, new Set());
    roles.set(roomId, new Map());
    clients.set(roomId, new Map());
  }

  rooms.get(roomId).add(userId);

  // Assign default role if new to room
  if (!roles.get(roomId).has(userId)) {
    roles.get(roomId).set(userId, 'write');
  }

  // Track WebSocket (multi-tab safe)
  const roomClients = clients.get(roomId);
  if (!roomClients.has(userId)) {
    roomClients.set(userId, new Set());
  }
  roomClients.get(userId).add(ws);
}

/**
 * Remove a single WebSocket for a user. If it was their last connection,
 * remove them from the room entirely.
 * Returns true if the user fully left the room.
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
    return true; // fully disconnected
  }
  return false;
}

function getMembers(roomId) {
  return rooms.has(roomId) ? [...rooms.get(roomId)] : [];
}

function getRole(roomId, userId) {
  return roles.has(roomId) ? roles.get(roomId).get(userId) || null : null;
}

function setRole(roomId, userId, newRole) {
  if (!VALID_ROLES.includes(newRole)) return false;
  if (!roles.has(roomId)) return false;
  roles.get(roomId).set(userId, newRole);
  return true;
}

/**
 * Get all WebSocket connections for every user in a room.
 * Returns Map<userId, Set<WebSocket>>.
 */
function getRoomClients(roomId) {
  return clients.get(roomId) || new Map();
}

/**
 * Broadcast a payload to every connected socket in a room.
 * @param {string}   roomId
 * @param {object}   payload       – will be JSON-stringified
 * @param {string}  [excludeUserId] – optional userId to skip (e.g. the sender)
 */
function broadcast(roomId, payload, excludeUserId = null) {
  const roomClients = getRoomClients(roomId);
  const data = JSON.stringify(payload);

  for (const [userId, sockets] of roomClients) {
    if (userId === excludeUserId) continue;
    for (const ws of sockets) {
      if (ws.readyState === 1 /* WebSocket.OPEN */) {
        ws.send(data);
      }
    }
  }
}

module.exports = {
  VALID_ROLES,
  isValidRoom,
  joinRoom,
  leaveRoom,
  getMembers,
  getRole,
  setRole,
  getRoomClients,
  broadcast,
};
