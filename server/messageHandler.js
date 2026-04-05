/**
 * messageHandler.js – Routes incoming WebSocket messages by `type`.
 *
 * Supported types:
 *   text        – plain chat message
 *   audio       – base64-encoded audio blob + duration
 *   image       – base64-encoded image + caption
 *   document    – base64 file + filename, mimeType, size
 *   typing      – typing indicator (broadcast to others)
 *   change_role – admin-only: change another user's role
 */

'use strict';

const { randomUUID } = require('crypto');
const rbac = require('./rbac');
const roomManager = require('./roomManager');

/**
 * Process a single parsed message from a WebSocket client.
 *
 * @param {WebSocket} ws       – the sender's socket
 * @param {object}    msg      – parsed JSON payload
 * @param {string}    userId   – authenticated sender
 * @param {string}    roomId   – room the sender belongs to
 */
function handle(ws, msg, userId, roomId) {
    const { type } = msg;

    switch (type) {
        case 'text':
        case 'audio':
        case 'image':
        case 'document':
            handleContent(ws, msg, userId, roomId);
            break;

        case 'typing':
            handleTyping(ws, msg, userId, roomId);
            break;

        case 'change_role':
            handleChangeRole(ws, msg, userId, roomId);
            break;

        default:
            sendError(ws, `Unknown message type: "${type}"`);
    }
}

// ── Content Messages ────────────────────────────────────────────────────────────

function handleContent(ws, msg, userId, roomId) {
    // RBAC check
    if (!rbac.canSend(roomId, userId)) {
        return sendError(ws, 'Permission denied');
    }

    // Validate per type
    const content = msg.content;
    if (!content) return sendError(ws, 'Missing "content" field');

    switch (msg.type) {
        case 'text':
            if (typeof content.text !== 'string' || !content.text.trim()) {
                return sendError(ws, 'text message requires a non-empty content.text');
            }
            break;

        case 'audio':
            if (!content.data) return sendError(ws, 'audio message requires content.data (base64)');
            if (typeof content.duration !== 'number') return sendError(ws, 'audio message requires content.duration (number)');
            break;

        case 'image':
            if (!content.data) return sendError(ws, 'image message requires content.data (base64)');
            break;

        case 'document':
            if (!content.filename) return sendError(ws, 'document message requires content.filename');
            if (!content.mimeType) return sendError(ws, 'document message requires content.mimeType');
            if (!content.data) return sendError(ws, 'document message requires content.data (base64)');
            if (typeof content.size !== 'number') return sendError(ws, 'document message requires content.size (number)');
            break;
    }

    // Build outgoing envelope
    const envelope = {
        messageId: randomUUID(),
        senderId: userId,
        roomId,
        timestamp: new Date().toISOString(),
        type: msg.type,
        content,
    };

    // Broadcast to entire room (including sender so their UI confirms delivery)
    roomManager.broadcast(roomId, envelope);
}

// ── Typing Indicator ────────────────────────────────────────────────────────────

function handleTyping(_ws, msg, userId, roomId) {
    const payload = {
        type: 'typing',
        roomId,
        userId,
        isTyping: !!msg.isTyping,
    };

    // Broadcast to everyone EXCEPT the sender
    roomManager.broadcast(roomId, payload, userId);
}

// ── Role Change (Admin Only) ────────────────────────────────────────────────────

function handleChangeRole(ws, msg, userId, roomId) {
    if (!rbac.canChangeRole(roomId, userId)) {
        return sendError(ws, 'Permission denied');
    }

    const { targetUserId, newRole } = msg;

    if (!targetUserId) return sendError(ws, 'change_role requires targetUserId');
    if (!rbac.isValidRole(newRole)) return sendError(ws, `Invalid role: "${newRole}". Must be one of: ${roomManager.VALID_ROLES.join(', ')}`);
    if (targetUserId === userId) return sendError(ws, 'Cannot change your own role');

    const success = roomManager.setRole(roomId, targetUserId, newRole);
    if (!success) return sendError(ws, 'Failed to change role');

    // Notify the entire room
    const notification = {
        type: 'role_changed',
        roomId,
        targetUserId,
        newRole,
        changedBy: userId,
        timestamp: new Date().toISOString(),
    };

    roomManager.broadcast(roomId, notification);
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function sendError(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message }));
    }
}

module.exports = { handle };
