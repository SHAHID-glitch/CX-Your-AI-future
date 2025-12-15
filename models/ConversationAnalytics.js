const mongoose = require('mongoose');

/**
 * ConversationAnalytics Model - Tracks detailed metrics and patterns for each conversation
 * Used for learning, predictions, and improving AI responses
 */
const conversationAnalyticsSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Conversation summary and context
    summary: {
        brief: String, // 1-2 sentence summary
        detailed: String, // Detailed summary
        mainTopic: String,
        subTopics: [String],
        keyPoints: [String],
        conclusions: [String]
    },
    
    // Semantic analysis
    semanticData: {
        // Main topics discussed
        topics: [{
            name: String,
            confidence: Number,
            mentions: Number,
            category: String
        }],
        
        // Entities mentioned (people, places, products, etc.)
        entities: [{
            name: String,
            type: String,
            mentions: Number
        }],
        
        // Keywords extracted
        keywords: [{
            word: String,
            frequency: Number,
            relevance: Number
        }],
        
        // Intent detected
        intents: [{
            intent: String,
            confidence: Number,
            messageIds: [mongoose.Schema.Types.ObjectId]
        }]
    },
    
    // Sentiment analysis
    sentimentAnalysis: {
        overall: {
            type: String,
            enum: ['very-positive', 'positive', 'neutral', 'negative', 'very-negative'],
            default: 'neutral'
        },
        score: Number, // -1 to 1
        
        // Sentiment progression through conversation
        progression: [{
            messageIndex: Number,
            sentiment: String,
            score: Number
        }],
        
        // User satisfaction indicators
        satisfactionIndicators: {
            thanksCount: Number,
            appreciationWords: Number,
            frustrationIndicators: Number,
            clarificationRequests: Number
        }
    },
    
    // Conversation metrics
    metrics: {
        // Message statistics
        totalMessages: Number,
        userMessages: Number,
        assistantMessages: Number,
        averageMessageLength: Number,
        
        // Time metrics
        duration: Number, // in minutes
        avgResponseTime: Number, // in seconds
        
        // Interaction quality
        followUpQuestions: Number,
        clarificationRequests: Number,
        topicChanges: Number,
        conversationDepth: Number, // How deep the conversation went
        
        // Engagement metrics
        engagementScore: Number, // 0-100
        completionRate: Number, // Did user get what they needed?
        returnProbability: Number // Likelihood to return to this topic
    },
    
    // Conversation patterns
    patterns: {
        // Question types asked
        questionTypes: [{
            type: String, // 'how-to', 'what-is', 'why', 'comparison', 'troubleshooting'
            count: Number
        }],
        
        // Conversation flow
        flow: [{
            stage: String, // 'introduction', 'exploration', 'deep-dive', 'conclusion'
            messageRange: { start: Number, end: Number },
            topics: [String]
        }],
        
        // User behavior patterns
        behaviorPatterns: [{
            pattern: String,
            confidence: Number,
            examples: [String]
        }]
    },
    
    // Learning indicators
    learningIndicators: {
        // Did user learn something new?
        knowledgeGained: Boolean,
        skillsDeveloped: [String],
        
        // Concepts explained
        conceptsExplained: [{
            concept: String,
            complexity: String,
            understood: Boolean
        }],
        
        // User's learning style indicators
        learningStyle: {
            prefersExamples: Boolean,
            prefersStepByStep: Boolean,
            prefersVisuals: Boolean,
            prefersTheory: Boolean
        }
    },
    
    // Problem-solving tracking
    problemSolving: {
        problemIdentified: Boolean,
        problemDescription: String,
        solutionProvided: Boolean,
        solutionType: String, // 'direct-answer', 'guided', 'exploratory'
        stepsToSolution: Number,
        wasSolved: Boolean,
        userFeedback: String
    },
    
    // Related conversations
    relationships: {
        // Similar past conversations
        similarConversations: [{
            conversationId: mongoose.Schema.Types.ObjectId,
            similarity: Number,
            commonTopics: [String]
        }],
        
        // Follow-up conversations
        followUpOf: mongoose.Schema.Types.ObjectId,
        hasFollowUps: [mongoose.Schema.Types.ObjectId],
        
        // Part of a series
        seriesId: String,
        seriesPosition: Number
    },
    
    // Predictions for future
    predictions: {
        // Likely follow-up topics
        likelyFollowUpTopics: [{
            topic: String,
            probability: Number,
            reason: String
        }],
        
        // Questions user might ask next
        predictedQuestions: [{
            question: String,
            probability: Number,
            category: String
        }],
        
        // User's next likely action
        nextActions: [{
            action: String,
            probability: Number
        }]
    },
    
    // Conversation quality
    quality: {
        // AI performance
        aiPerformance: {
            relevance: Number, // 0-10
            accuracy: Number,
            helpfulness: Number,
            clarity: Number
        },
        
        // Conversation effectiveness
        effectiveness: {
            goalAchieved: Boolean,
            timeEfficiency: Number,
            informationDensity: Number
        },
        
        // Issues detected
        issues: [{
            issue: String,
            severity: String,
            messageId: mongoose.Schema.Types.ObjectId
        }]
    },
    
    // Metadata
    analyzedAt: Date,
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    analysisVersion: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes
conversationAnalyticsSchema.index({ conversationId: 1 });
conversationAnalyticsSchema.index({ userId: 1 });
conversationAnalyticsSchema.index({ 'summary.mainTopic': 1 });
conversationAnalyticsSchema.index({ 'semanticData.topics.name': 1 });
conversationAnalyticsSchema.index({ 'sentimentAnalysis.overall': 1 });
conversationAnalyticsSchema.index({ analyzedAt: -1 });

// Methods
conversationAnalyticsSchema.methods.calculateEngagementScore = function() {
    const { totalMessages, followUpQuestions, conversationDepth, duration } = this.metrics;
    
    // Simple engagement formula (can be improved)
    let score = 0;
    score += Math.min(totalMessages * 5, 30); // Max 30 points
    score += Math.min(followUpQuestions * 10, 30); // Max 30 points
    score += Math.min(conversationDepth * 5, 20); // Max 20 points
    score += Math.min(duration * 2, 20); // Max 20 points
    
    this.metrics.engagementScore = Math.min(score, 100);
    return this.metrics.engagementScore;
};

conversationAnalyticsSchema.methods.updateSentiment = function(sentimentScore) {
    this.sentimentAnalysis.score = sentimentScore;
    
    if (sentimentScore >= 0.6) {
        this.sentimentAnalysis.overall = 'very-positive';
    } else if (sentimentScore >= 0.2) {
        this.sentimentAnalysis.overall = 'positive';
    } else if (sentimentScore >= -0.2) {
        this.sentimentAnalysis.overall = 'neutral';
    } else if (sentimentScore >= -0.6) {
        this.sentimentAnalysis.overall = 'negative';
    } else {
        this.sentimentAnalysis.overall = 'very-negative';
    }
};

conversationAnalyticsSchema.methods.addPrediction = function(type, data) {
    if (type === 'topic') {
        this.predictions.likelyFollowUpTopics.push(data);
    } else if (type === 'question') {
        this.predictions.predictedQuestions.push(data);
    } else if (type === 'action') {
        this.predictions.nextActions.push(data);
    }
};

module.exports = mongoose.model('ConversationAnalytics', conversationAnalyticsSchema);
