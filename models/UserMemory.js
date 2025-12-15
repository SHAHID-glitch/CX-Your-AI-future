const mongoose = require('mongoose');

/**
 * UserMemory Model - Stores user's learned preferences, patterns, and behavioral insights
 * This enables the AI to memorize past interactions and predict future needs
 */
const userMemorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    
    // User preferences learned over time
    preferences: {
        // Communication style preferences
        communicationStyle: {
            preferredTone: {
                type: String,
                enum: ['formal', 'casual', 'friendly', 'professional', 'technical'],
                default: 'friendly'
            },
            preferredLength: {
                type: String,
                enum: ['concise', 'balanced', 'detailed', 'comprehensive'],
                default: 'balanced'
            },
            preferredFormat: {
                type: String,
                enum: ['plain', 'markdown', 'bulleted', 'numbered', 'mixed'],
                default: 'mixed'
            }
        },
        
        // Topic interests and expertise levels
        topicInterests: [{
            topic: String,
            category: String,
            frequency: { type: Number, default: 1 },
            lastMentioned: Date,
            expertise: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced', 'expert'],
                default: 'intermediate'
            }
        }],
        
        // Frequently asked questions and topics
        frequentQuestions: [{
            question: String,
            category: String,
            count: { type: Number, default: 1 },
            lastAsked: Date,
            avgSatisfaction: Number
        }],
        
        // Language preferences
        languagePatterns: {
            preferredLanguage: { type: String, default: 'en' },
            technicalLevel: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced'],
                default: 'intermediate'
            },
            usesJargon: { type: Boolean, default: false },
            prefersExamples: { type: Boolean, default: true }
        }
    },
    
    // Behavioral patterns
    behavioralPatterns: {
        // Usage patterns
        activeHours: [{
            hour: Number,
            count: Number
        }],
        avgSessionLength: Number,
        avgMessagesPerSession: Number,
        
        // Interaction patterns
        followUpRate: Number, // How often user asks follow-up questions
        clarificationRate: Number, // How often user asks for clarification
        feedbackRate: Number, // How often user provides feedback
        
        // Feature usage
        featuresUsed: [{
            feature: String,
            count: Number,
            lastUsed: Date
        }],
        
        // Conversation patterns
        conversationStartPatterns: [{
            pattern: String,
            count: Number,
            category: String
        }],
        
        // Time-based patterns
        peakUsageDays: [String], // ['Monday', 'Wednesday']
        typicalSessionDuration: Number // in minutes
    },
    
    // Learning from feedback
    feedbackHistory: {
        // Positive feedback patterns
        likedResponses: [{
            messageId: mongoose.Schema.Types.ObjectId,
            context: String,
            topics: [String],
            responseType: String,
            timestamp: Date,
            reason: String // Why they liked it
        }],
        
        // Negative feedback patterns
        dislikedResponses: [{
            messageId: mongoose.Schema.Types.ObjectId,
            context: String,
            topics: [String],
            responseType: String,
            timestamp: Date,
            reason: String // Why they disliked it
        }],
        
        // Corrections and improvements
        corrections: [{
            original: String,
            corrected: String,
            topic: String,
            timestamp: Date,
            applied: Boolean
        }],
        
        // Overall satisfaction metrics
        averageSatisfaction: { type: Number, default: 0 },
        totalFeedbackCount: { type: Number, default: 0 }
    },
    
    // Contextual memory - recent important context
    recentContext: {
        // Last few conversation summaries
        recentConversations: [{
            conversationId: mongoose.Schema.Types.ObjectId,
            summary: String,
            topics: [String],
            sentiment: String,
            importance: Number,
            timestamp: Date
        }],
        
        // Active projects or ongoing topics
        activeTopics: [{
            topic: String,
            description: String,
            startedAt: Date,
            lastUpdated: Date,
            relatedConversations: [mongoose.Schema.Types.ObjectId],
            progress: String
        }],
        
        // User's stated goals
        userGoals: [{
            goal: String,
            category: String,
            deadline: Date,
            progress: String,
            relatedConversations: [mongoose.Schema.Types.ObjectId]
        }]
    },
    
    // Predictions and insights
    predictions: {
        // Likely next questions based on patterns
        likelyQuestions: [{
            question: String,
            probability: Number,
            context: String,
            basedOn: [String] // What patterns led to this prediction
        }],
        
        // Topics user might be interested in
        suggestedTopics: [{
            topic: String,
            reason: String,
            confidence: Number,
            category: String
        }],
        
        // Predicted needs
        predictedNeeds: [{
            need: String,
            probability: Number,
            basedOn: String,
            suggestions: [String]
        }]
    },
    
    // Semantic memory - long-term knowledge about user
    longTermKnowledge: {
        // User's background info mentioned in conversations
        background: [{
            fact: String,
            category: String,
            confidence: Number,
            mentionedIn: [mongoose.Schema.Types.ObjectId],
            firstMentioned: Date,
            lastConfirmed: Date
        }],
        
        // User's expertise areas
        expertiseAreas: [{
            area: String,
            level: String,
            evidence: [String],
            lastUpdated: Date
        }],
        
        // User's interests and hobbies
        interests: [{
            interest: String,
            intensity: Number,
            category: String,
            firstMentioned: Date
        }]
    },
    
    // Statistics and analytics
    statistics: {
        totalConversations: { type: Number, default: 0 },
        totalMessages: { type: Number, default: 0 },
        totalTokensUsed: { type: Number, default: 0 },
        averageResponseTime: Number,
        topCategories: [{
            category: String,
            count: Number,
            percentage: Number
        }],
        learningProgress: {
            patternsIdentified: Number,
            preferencesLearned: Number,
            predictionsAccuracy: Number
        }
    },
    
    // Metadata
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    lastAnalyzed: Date,
    memoryVersion: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes for faster queries
userMemorySchema.index({ userId: 1 });
userMemorySchema.index({ 'preferences.topicInterests.topic': 1 });
userMemorySchema.index({ 'recentContext.activeTopics.topic': 1 });
userMemorySchema.index({ lastUpdated: -1 });

// Methods
userMemorySchema.methods.addTopicInterest = function(topic, category) {
    const existing = this.preferences.topicInterests.find(t => t.topic === topic);
    if (existing) {
        existing.frequency += 1;
        existing.lastMentioned = new Date();
    } else {
        this.preferences.topicInterests.push({
            topic,
            category,
            frequency: 1,
            lastMentioned: new Date()
        });
    }
};

userMemorySchema.methods.recordFeedback = function(type, messageId, context, topics) {
    if (type === 'positive') {
        this.feedbackHistory.likedResponses.push({
            messageId,
            context,
            topics,
            timestamp: new Date()
        });
    } else if (type === 'negative') {
        this.feedbackHistory.dislikedResponses.push({
            messageId,
            context,
            topics,
            timestamp: new Date()
        });
    }
    this.feedbackHistory.totalFeedbackCount += 1;
};

userMemorySchema.methods.updateStatistics = function() {
    this.statistics.totalConversations = this.recentContext.recentConversations.length;
    this.lastUpdated = new Date();
};

module.exports = mongoose.model('UserMemory', userMemorySchema);
