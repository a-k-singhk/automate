/**
 * rbac.js – Role-Based Access Control helpers.
 *
 * Roles:
 *   admin – send, receive, and change other members' roles
 *   write – send and receive messages
 *   read  – receive only; sending is rejected
 */

'use strict';

const roomManager = require('./roomManager');

/**
 * Can the user send messages (text, audio, image, document) in this room?
 */
function canSend(roomId, userId) {
    const role = roomManager.getRole(roomId, userId);
    return role === 'admin' || role === 'write';
}

/**
 * Can the user change other members' roles?
 */
function canChangeRole(roomId, userId) {
    const role = roomManager.getRole(roomId, userId);
    return role === 'admin';
}

/**
 * Is the given string a valid role?
 */
function isValidRole(role) {
    return roomManager.VALID_ROLES.includes(role);
}

module.exports = { canSend, canChangeRole, isValidRole };
