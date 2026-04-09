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
 */
async function handle(ws, msg, userId, roomId) {  // ← async added
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
            await handleChangeRole(ws, msg, userId, roomId);  // ← await added
            break;

        default:
            sendError(ws, `Unknown message type: "${type}"`);
    }
}

// ── Content Messages ────────────────────────────────────────────────────────────

function handleContent(ws, msg, userId, roomId) {
    if (!rbac.canSend(roomId, userId)) {
        return sendError(ws, 'Permission denied');
    }

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

    const envelope = {
        messageId: randomUUID(),
        senderId: userId,
        roomId,
        timestamp: new Date().toISOString(),
        type: msg.type,
        content,
    };

    roomManager.broadcast(roomId, envelope);
}

// ── Typing Indicator ────────────────────────────────────────────────────────────

function handleTyping(_ws, msg, userId, roomId) {
    roomManager.broadcast(roomId, {
        type: 'typing',
        roomId,
        userId,
        isTyping: !!msg.isTyping,
    }, userId);  // exclude sender
}

// ── Role Change (Admin Only) ────────────────────────────────────────────────────

async function handleChangeRole(ws, msg, userId, roomId) {  // ← async added
    if (!rbac.canChangeRole(roomId, userId)) {
        return sendError(ws, 'Permission denied');
    }

    const { targetUserId, newRole } = msg;

    if (!targetUserId) return sendError(ws, 'change_role requires targetUserId');
    if (!rbac.isValidRole(newRole)) return sendError(ws, `Invalid role: "${newRole}". Must be one of: ${roomManager.VALID_ROLES.join(', ')}`);
    if (targetUserId === userId) return sendError(ws, 'Cannot change your own role');

    // ← await here — without this, DB write was being skipped silently
    const success = await roomManager.setRole(roomId, targetUserId, newRole);

    if (!success) return sendError(ws, 'Failed to change role — user may not exist in this room');

    roomManager.broadcast(roomId, {
        type: 'role_changed',
        roomId,
        targetUserId,
        newRole,
        changedBy: userId,
        timestamp: new Date().toISOString(),
    });
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function sendError(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message }));
    }
}

module.exports = { handle };