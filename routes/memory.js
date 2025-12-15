const express = require('express');
const router = express.Router();
const memoryService = require('../services/memoryService');
const { auth } = require('../middleware/auth');

/**
 * Memory Routes - Endpoints for user memory, insights, and predictions
 */

/**
 * GET /api/memory/insights
 * Get user insights, patterns, and statistics
 */
router.get('/insights', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const insights = await memoryService.getUserInsights(userId);
        
        res.json({
            success: true,
            insights
        });
    } catch (error) {
        console.error('Error getting insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get insights'
        });
    }
});

/**
 * GET /api/memory/context
 * Get personalized context for AI responses
 */
router.get('/context', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const context = await memoryService.getPersonalizedContext(userId);
        
        res.json({
            success: true,
            context
        });
    } catch (error) {
        console.error('Error getting context:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get context'
        });
    }
});

/**
 * POST /api/memory/analyze/:conversationId
 * Analyze a conversation and update memory
 */
router.post('/analyze/:conversationId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        
        const analytics = await memoryService.analyzeConversation(conversationId, userId);
        
        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze conversation'
        });
    }
});

/**
 * POST /api/memory/feedback
 * Record user feedback for learning
 */
router.post('/feedback', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId, feedbackType, reason } = req.body;
        
        if (!messageId || !feedbackType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        await memoryService.recordFeedback(userId, messageId, feedbackType, reason);
        
        res.json({
            success: true,
            message: 'Feedback recorded'
        });
    } catch (error) {
        console.error('Error recording feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record feedback'
        });
    }
});

/**
 * GET /api/memory/predictions
 * Get predictions about user's next actions or questions
 */
router.get('/predictions', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const memory = await memoryService.getUserMemory(userId);
        
        res.json({
            success: true,
            predictions: memory.predictions
        });
    } catch (error) {
        console.error('Error getting predictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get predictions'
        });
    }
});

/**
 * GET /api/memory/topics
 * Get user's topic interests and patterns
 */
router.get('/topics', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const memory = await memoryService.getUserMemory(userId);
        
        const topics = memory.preferences.topicInterests || [];
        const sortedTopics = topics.sort((a, b) => b.frequency - a.frequency);
        
        res.json({
            success: true,
            topics: sortedTopics
        });
    } catch (error) {
        console.error('Error getting topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get topics'
        });
    }
});

/**
 * GET /api/memory/recent-context
 * Get recent conversation context and active topics
 */
router.get('/recent-context', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const memory = await memoryService.getUserMemory(userId);
        
        res.json({
            success: true,
            recentContext: memory.recentContext
        });
    } catch (error) {
        console.error('Error getting recent context:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recent context'
        });
    }
});

/**
 * GET /api/memory/statistics
 * Get user statistics and usage patterns
 */
router.get('/statistics', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const memory = await memoryService.getUserMemory(userId);
        
        res.json({
            success: true,
            statistics: memory.statistics,
            behavioralPatterns: memory.behavioralPatterns
        });
    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics'
        });
    }
});

/**
 * POST /api/memory/active-topic
 * Add or update an active topic/project
 */
router.post('/active-topic', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { topic, description, relatedConversations } = req.body;
        
        if (!topic) {
            return res.status(400).json({
                success: false,
                error: 'Topic is required'
            });
        }
        
        const memory = await memoryService.getUserMemory(userId);
        
        // Check if topic already exists
        const existingTopic = memory.recentContext.activeTopics?.find(t => t.topic === topic);
        
        if (existingTopic) {
            existingTopic.description = description || existingTopic.description;
            existingTopic.lastUpdated = new Date();
            if (relatedConversations) {
                existingTopic.relatedConversations = relatedConversations;
            }
        } else {
            if (!memory.recentContext.activeTopics) {
                memory.recentContext.activeTopics = [];
            }
            memory.recentContext.activeTopics.push({
                topic,
                description,
                startedAt: new Date(),
                lastUpdated: new Date(),
                relatedConversations: relatedConversations || [],
                progress: 'started'
            });
        }
        
        await memory.save();
        
        res.json({
            success: true,
            message: 'Active topic updated'
        });
    } catch (error) {
        console.error('Error updating active topic:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update active topic'
        });
    }
});

/**
 * GET /api/memory/learning-progress
 * Get how well the system has learned about the user
 */
router.get('/learning-progress', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const memory = await memoryService.getUserMemory(userId);
        
        const progress = {
            patternsIdentified: memory.preferences.topicInterests?.length || 0,
            preferencesLearned: Object.keys(memory.preferences.communicationStyle || {}).length,
            conversationsAnalyzed: memory.statistics.totalConversations || 0,
            feedbackReceived: memory.feedbackHistory.totalFeedbackCount || 0,
            predictionsMade: memory.predictions.likelyQuestions?.length || 0,
            learningScore: 0
        };
        
        // Calculate learning score (0-100)
        progress.learningScore = Math.min(
            progress.patternsIdentified * 5 +
            progress.preferencesLearned * 10 +
            progress.conversationsAnalyzed * 2 +
            progress.feedbackReceived * 5,
            100
        );
        
        res.json({
            success: true,
            progress
        });
    } catch (error) {
        console.error('Error getting learning progress:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get learning progress'
        });
    }
});

/**
 * GET /api/memory/attachments
 * Get user's attachment history
 */
router.get('/attachments', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit, type, conversationId } = req.query;
        
        const attachmentMemoryService = require('../services/attachmentMemoryService');
        const attachments = await attachmentMemoryService.getUserAttachmentHistory(userId, {
            limit: limit ? parseInt(limit) : 50,
            type,
            conversationId
        });
        
        res.json({
            success: true,
            attachments,
            count: attachments.length
        });
    } catch (error) {
        console.error('Error getting attachment history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get attachment history'
        });
    }
});

/**
 * GET /api/memory/attachments/stats
 * Get attachment statistics for user
 */
router.get('/attachments/stats', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const attachmentMemoryService = require('../services/attachmentMemoryService');
        const stats = await attachmentMemoryService.getAttachmentStats(userId);
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting attachment stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get attachment stats'
        });
    }
});

/**
 * GET /api/memory/attachments/search
 * Search attachments by content
 */
router.get('/attachments/search', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { q, limit } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query required'
            });
        }
        
        const attachmentMemoryService = require('../services/attachmentMemoryService');
        const results = await attachmentMemoryService.searchAttachments(userId, q, {
            limit: limit ? parseInt(limit) : 20
        });
        
        res.json({
            success: true,
            results,
            count: results.length
        });
    } catch (error) {
        console.error('Error searching attachments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search attachments'
        });
    }
});

/**
 * GET /api/memory/attachments/:conversationId
 * Get attachments for a specific conversation
 */
router.get('/attachments/:conversationId', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const attachmentMemoryService = require('../services/attachmentMemoryService');
        const attachments = await attachmentMemoryService.getConversationAttachments(conversationId);
        
        res.json({
            success: true,
            attachments,
            count: attachments.length
        });
    } catch (error) {
        console.error('Error getting conversation attachments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversation attachments'
        });
    }
});

module.exports = router;
