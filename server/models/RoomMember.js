const mongoose = require('mongoose');

const roomMemberSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'write', 'read'],
        default: 'write'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RoomMember', roomMemberSchema);
