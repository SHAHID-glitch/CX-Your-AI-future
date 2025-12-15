const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    isRegenerated: {
        type: Boolean,
        default: false
    },
    regeneratedAt: {
        type: Date
    },
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        type: {
            type: String,
            enum: ['like', 'dislike', 'love', 'helpful', 'unhelpful']
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    attachments: [{
        filename: String,
        url: String,
        type: String, // 'image', 'file', 'document', 'audio', 'video'
        size: Number,
        mimeType: String,
        prompt: String, // For generated images
        description: String, // AI-generated description of the content
        extractedText: String, // OCR or document text
        tags: [String], // Auto-generated tags
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for faster queries
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ 'reactions.userId': 1 });

module.exports = mongoose.model('Message', messageSchema);
