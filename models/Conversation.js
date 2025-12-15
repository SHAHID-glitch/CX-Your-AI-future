const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        default: 'New Chat'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    messageCount: {
        type: Number,
        default: 0
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String
    }],
    category: {
        type: String,
        enum: ['general', 'coding', 'writing', 'research', 'other'],
        default: 'general'
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    settings: {
        responseType: {
            type: String,
            enum: ['concise', 'balanced', 'detailed', 'creative'],
            default: 'balanced'
        },
        model: {
            type: String,
            default: 'gpt-4'
        },
        temperature: {
            type: Number,
            default: 0.7
        }
    },
    
    // Enhanced fields for memory and context
    summary: {
        type: String,
        default: ''
    },
    mainTopics: [{
        type: String
    }],
    sentiment: {
        type: String,
        enum: ['very-positive', 'positive', 'neutral', 'negative', 'very-negative'],
        default: 'neutral'
    },
    keyInsights: [{
        type: String
    }],
    relatedConversations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation'
    }],
    
    // Analytics reference
    analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConversationAnalytics'
    }
}, {
    timestamps: true
});

// Index for faster queries
conversationSchema.index({ userId: 1, lastActivity: -1 });
conversationSchema.index({ userId: 1, isPinned: -1, lastActivity: -1 });
conversationSchema.index({ tags: 1 });

// Virtual for messages
conversationSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'conversationId'
});

module.exports = mongoose.model('Conversation', conversationSchema);
