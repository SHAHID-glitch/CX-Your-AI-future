const UserMemory = require('../models/UserMemory');
const ConversationAnalytics = require('../models/ConversationAnalytics');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const attachmentMemoryService = require('./attachmentMemoryService');

/**
 * Memory Service - Handles learning from conversations, analyzing patterns,
 * and making predictions about user behavior and needs
 */
class MemoryService {
    
    /**
     * Initialize or get user memory
     */
    async getUserMemory(userId) {
        let memory = await UserMemory.findOne({ userId });
        
        if (!memory) {
            memory = new UserMemory({
                userId,
                preferences: {},
                behavioralPatterns: {},
                feedbackHistory: {},
                recentContext: {},
                predictions: {},
                longTermKnowledge: {},
                statistics: {}
            });
            await memory.save();
        }
        
        return memory;
    }
    
    /**
     * Analyze a conversation and extract insights
     */
    async analyzeConversation(conversationId, userId) {
        try {
            // Get conversation and messages
            const conversation = await Conversation.findById(conversationId);
            const messages = await Message.find({ conversationId }).sort({ timestamp: 1 });
            
            if (!messages || messages.length === 0) {
                return null;
            }
            
            // Create or update analytics
            let analytics = await ConversationAnalytics.findOne({ conversationId });
            if (!analytics) {
                analytics = new ConversationAnalytics({
                    conversationId,
                    userId,
                    summary: {},
                    semanticData: {},
                    sentimentAnalysis: {},
                    metrics: {},
                    patterns: {},
                    learningIndicators: {},
                    problemSolving: {},
                    relationships: {},
                    predictions: {},
                    quality: {}
                });
            }
            
            // Extract topics and keywords
            const { topics, keywords, entities } = this.extractTopicsAndKeywords(messages);
            analytics.semanticData.topics = topics;
            analytics.semanticData.keywords = keywords;
            analytics.semanticData.entities = entities;
            
            // Analyze sentiment
            const sentiment = this.analyzeSentiment(messages);
            analytics.sentimentAnalysis = sentiment;
            
            // Calculate metrics
            const metrics = this.calculateMetrics(messages);
            analytics.metrics = metrics;
            
            // Detect patterns
            const patterns = this.detectPatterns(messages);
            analytics.patterns = patterns;
            
            // Generate summary
            const summary = this.generateSummary(messages, topics);
            analytics.summary = summary;
            
            // Detect problem-solving
            const problemSolving = this.detectProblemSolving(messages);
            analytics.problemSolving = problemSolving;
            
            // Generate predictions
            const predictions = this.generatePredictions(messages, topics, patterns);
            analytics.predictions = predictions;
            
            // Calculate engagement score
            analytics.calculateEngagementScore();
            
            analytics.analyzedAt = new Date();
            await analytics.save();
            
            // Update user memory with insights
            await this.updateUserMemory(userId, analytics, messages);
            
            return analytics;
            
        } catch (error) {
            console.error('Error analyzing conversation:', error);
            throw error;
        }
    }
    
    /**
     * Extract topics, keywords, and entities from messages
     */
    extractTopicsAndKeywords(messages) {
        const topics = [];
        const keywords = [];
        const entities = [];
        const topicMap = {};
        const keywordMap = {};
        
        // Common programming/tech topics
        const commonTopics = {
            'javascript': 'Programming',
            'python': 'Programming',
            'react': 'Web Development',
            'node': 'Backend Development',
            'database': 'Database',
            'api': 'API Development',
            'css': 'Web Design',
            'html': 'Web Development',
            'machine learning': 'AI/ML',
            'data science': 'Data',
            'docker': 'DevOps',
            'git': 'Version Control'
        };
        
        messages.forEach(msg => {
            const content = msg.content.toLowerCase();
            const words = content.split(/\s+/);
            
            // Extract keywords (words longer than 4 characters, excluding common words)
            const commonWords = ['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'what', 'when', 'where', 'which', 'about', 'would', 'could', 'should'];
            words.forEach(word => {
                const cleaned = word.replace(/[^a-z0-9]/g, '');
                if (cleaned.length > 4 && !commonWords.includes(cleaned)) {
                    keywordMap[cleaned] = (keywordMap[cleaned] || 0) + 1;
                }
            });
            
            // Detect topics
            Object.keys(commonTopics).forEach(topic => {
                if (content.includes(topic)) {
                    const key = topic;
                    if (!topicMap[key]) {
                        topicMap[key] = {
                            name: topic,
                            category: commonTopics[topic],
                            mentions: 0,
                            confidence: 0.7
                        };
                    }
                    topicMap[key].mentions += 1;
                }
            });
        });
        
        // Convert maps to arrays
        Object.values(topicMap).forEach(topic => {
            topics.push(topic);
        });
        
        Object.entries(keywordMap).forEach(([word, frequency]) => {
            keywords.push({
                word,
                frequency,
                relevance: Math.min(frequency / messages.length, 1)
            });
        });
        
        // Sort by frequency/mentions
        keywords.sort((a, b) => b.frequency - a.frequency);
        topics.sort((a, b) => b.mentions - a.mentions);
        
        return {
            topics: topics.slice(0, 10), // Top 10 topics
            keywords: keywords.slice(0, 20), // Top 20 keywords
            entities: entities
        };
    }
    
    /**
     * Analyze sentiment of conversation
     */
    analyzeSentiment(messages) {
        const positiveWords = ['thanks', 'thank you', 'great', 'awesome', 'excellent', 'perfect', 'helpful', 'appreciate', 'love', 'amazing', 'wonderful'];
        const negativeWords = ['error', 'problem', 'issue', 'wrong', 'fail', 'failed', 'broken', 'confused', 'frustrated', 'difficult'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        let thanksCount = 0;
        let frustrationCount = 0;
        let clarificationCount = 0;
        
        const progression = [];
        
        messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                const content = msg.content.toLowerCase();
                
                // Count sentiment words
                positiveWords.forEach(word => {
                    if (content.includes(word)) {
                        positiveCount++;
                        if (word.includes('thank')) thanksCount++;
                    }
                });
                
                negativeWords.forEach(word => {
                    if (content.includes(word)) {
                        negativeCount++;
                        if (['confused', 'frustrated', 'difficult'].includes(word)) {
                            frustrationCount++;
                        }
                    }
                });
                
                // Detect clarification requests
                if (content.includes('what do you mean') || 
                    content.includes('can you explain') || 
                    content.includes('i don\'t understand') ||
                    content.includes('clarify')) {
                    clarificationCount++;
                }
                
                // Calculate message sentiment
                const msgPositive = positiveWords.filter(w => content.includes(w)).length;
                const msgNegative = negativeWords.filter(w => content.includes(w)).length;
                const msgScore = (msgPositive - msgNegative) / Math.max(msgPositive + msgNegative, 1);
                
                progression.push({
                    messageIndex: index,
                    sentiment: msgScore > 0 ? 'positive' : msgScore < 0 ? 'negative' : 'neutral',
                    score: msgScore
                });
            }
        });
        
        // Calculate overall score
        const totalSentiment = positiveCount - negativeCount;
        const totalWords = positiveCount + negativeCount;
        const score = totalWords > 0 ? totalSentiment / totalWords : 0;
        
        let overall = 'neutral';
        if (score >= 0.6) overall = 'very-positive';
        else if (score >= 0.2) overall = 'positive';
        else if (score <= -0.6) overall = 'very-negative';
        else if (score <= -0.2) overall = 'negative';
        
        return {
            overall,
            score,
            progression,
            satisfactionIndicators: {
                thanksCount,
                appreciationWords: positiveCount,
                frustrationIndicators: frustrationCount,
                clarificationRequests: clarificationCount
            }
        };
    }
    
    /**
     * Calculate conversation metrics
     */
    calculateMetrics(messages) {
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');
        
        const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
        const averageMessageLength = totalLength / messages.length;
        
        // Calculate duration
        const firstMsg = messages[0];
        const lastMsg = messages[messages.length - 1];
        const duration = (new Date(lastMsg.timestamp) - new Date(firstMsg.timestamp)) / (1000 * 60); // minutes
        
        // Count follow-up questions (user messages with question marks)
        const followUpQuestions = userMessages.filter(m => m.content.includes('?')).length;
        
        // Count clarification requests
        const clarificationRequests = userMessages.filter(m => {
            const content = m.content.toLowerCase();
            return content.includes('what do you mean') || 
                   content.includes('can you explain') ||
                   content.includes('clarify');
        }).length;
        
        // Estimate conversation depth (complexity of discussion)
        const conversationDepth = Math.min(Math.floor(messages.length / 4), 10);
        
        return {
            totalMessages: messages.length,
            userMessages: userMessages.length,
            assistantMessages: assistantMessages.length,
            averageMessageLength: Math.round(averageMessageLength),
            duration: Math.round(duration * 10) / 10,
            followUpQuestions,
            clarificationRequests,
            conversationDepth,
            topicChanges: 0, // Could be improved with NLP
            engagementScore: 0 // Calculated separately
        };
    }
    
    /**
     * Detect conversation patterns
     */
    detectPatterns(messages) {
        const questionTypes = [];
        const flow = [];
        const behaviorPatterns = [];
        
        const questionTypeMap = {};
        
        messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                const content = msg.content.toLowerCase();
                
                // Detect question types
                if (content.includes('how to') || content.includes('how do') || content.includes('how can')) {
                    questionTypeMap['how-to'] = (questionTypeMap['how-to'] || 0) + 1;
                } else if (content.includes('what is') || content.includes('what are')) {
                    questionTypeMap['what-is'] = (questionTypeMap['what-is'] || 0) + 1;
                } else if (content.includes('why')) {
                    questionTypeMap['why'] = (questionTypeMap['why'] || 0) + 1;
                } else if (content.includes('vs') || content.includes('versus') || content.includes('compare')) {
                    questionTypeMap['comparison'] = (questionTypeMap['comparison'] || 0) + 1;
                } else if (content.includes('error') || content.includes('not working') || content.includes('problem')) {
                    questionTypeMap['troubleshooting'] = (questionTypeMap['troubleshooting'] || 0) + 1;
                }
            }
        });
        
        // Convert to array
        Object.entries(questionTypeMap).forEach(([type, count]) => {
            questionTypes.push({ type, count });
        });
        
        // Detect conversation flow stages
        if (messages.length > 0) {
            flow.push({
                stage: 'introduction',
                messageRange: { start: 0, end: Math.min(2, messages.length - 1) },
                topics: []
            });
        }
        if (messages.length > 4) {
            flow.push({
                stage: 'exploration',
                messageRange: { start: 2, end: Math.min(messages.length - 2, messages.length - 1) },
                topics: []
            });
        }
        if (messages.length > 6) {
            flow.push({
                stage: 'conclusion',
                messageRange: { start: Math.max(0, messages.length - 2), end: messages.length - 1 },
                topics: []
            });
        }
        
        return {
            questionTypes,
            flow,
            behaviorPatterns
        };
    }
    
    /**
     * Generate conversation summary
     */
    generateSummary(messages, topics) {
        const userMessages = messages.filter(m => m.role === 'user');
        const firstUserMessage = userMessages[0]?.content || '';
        
        // Extract main topic from topics array
        const mainTopic = topics[0]?.name || 'General discussion';
        const subTopics = topics.slice(1, 4).map(t => t.name);
        
        // Generate brief summary
        const brief = firstUserMessage.slice(0, 100) + (firstUserMessage.length > 100 ? '...' : '');
        
        // Generate detailed summary
        const topicList = subTopics.length > 0 ? ` Topics covered: ${subTopics.join(', ')}.` : '';
        const detailed = `Conversation about ${mainTopic}.${topicList} ${messages.length} messages exchanged.`;
        
        return {
            brief,
            detailed,
            mainTopic,
            subTopics,
            keyPoints: [],
            conclusions: []
        };
    }
    
    /**
     * Detect problem-solving in conversation
     */
    detectProblemSolving(messages) {
        const userMessages = messages.filter(m => m.role === 'user');
        const firstMessage = userMessages[0]?.content.toLowerCase() || '';
        const lastMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
        
        // Check if problem was identified
        const problemKeywords = ['error', 'issue', 'problem', 'not working', 'how to', 'help'];
        const problemIdentified = problemKeywords.some(kw => firstMessage.includes(kw));
        
        // Check if solution was acknowledged
        const solutionKeywords = ['thanks', 'thank you', 'worked', 'solved', 'fixed'];
        const wasSolved = solutionKeywords.some(kw => lastMessage.includes(kw));
        
        return {
            problemIdentified,
            problemDescription: problemIdentified ? firstMessage.slice(0, 200) : '',
            solutionProvided: messages.length > 2,
            solutionType: messages.length > 6 ? 'guided' : 'direct-answer',
            stepsToSolution: Math.floor(messages.length / 2),
            wasSolved,
            userFeedback: lastMessage.slice(0, 100)
        };
    }
    
    /**
     * Generate predictions based on conversation
     */
    generatePredictions(messages, topics, patterns) {
        const predictions = {
            likelyFollowUpTopics: [],
            predictedQuestions: [],
            nextActions: []
        };
        
        // Predict follow-up topics based on current topics
        topics.forEach(topic => {
            if (topic.mentions >= 2) {
                predictions.likelyFollowUpTopics.push({
                    topic: `Advanced ${topic.name}`,
                    probability: 0.7,
                    reason: 'User showed interest in this topic'
                });
            }
        });
        
        // Predict questions based on question patterns
        patterns.questionTypes?.forEach(qt => {
            if (qt.type === 'how-to') {
                predictions.predictedQuestions.push({
                    question: 'How can I implement this in my project?',
                    probability: 0.6,
                    category: 'implementation'
                });
            }
        });
        
        // Predict next actions
        predictions.nextActions.push({
            action: 'Continue learning about main topic',
            probability: 0.7
        });
        
        return predictions;
    }
    
    /**
     * Update user memory with insights from conversation
     */
    async updateUserMemory(userId, analytics, messages) {
        try {
            const memory = await this.getUserMemory(userId);
            
            // Update topic interests
            analytics.semanticData.topics?.forEach(topic => {
                memory.addTopicInterest(topic.name, topic.category);
            });
            
            // Update statistics
            memory.statistics.totalConversations += 1;
            memory.statistics.totalMessages += messages.length;
            
            // Add to recent context
            if (memory.recentContext.recentConversations.length >= 10) {
                memory.recentContext.recentConversations.shift(); // Remove oldest
            }
            
            memory.recentContext.recentConversations.push({
                conversationId: analytics.conversationId,
                summary: analytics.summary.brief,
                topics: analytics.semanticData.topics?.map(t => t.name) || [],
                sentiment: analytics.sentimentAnalysis.overall,
                importance: analytics.metrics.engagementScore / 100,
                timestamp: new Date()
            });
            
            // Update predictions
            memory.predictions.likelyQuestions = analytics.predictions.predictedQuestions || [];
            memory.predictions.suggestedTopics = analytics.predictions.likelyFollowUpTopics?.map(t => ({
                topic: t.topic,
                reason: t.reason,
                confidence: t.probability,
                category: 'suggested'
            })) || [];
            
            // Update behavioral patterns
            const hour = new Date().getHours();
            const hourPattern = memory.behavioralPatterns.activeHours?.find(h => h.hour === hour);
            if (hourPattern) {
                hourPattern.count += 1;
            } else {
                if (!memory.behavioralPatterns.activeHours) {
                    memory.behavioralPatterns.activeHours = [];
                }
                memory.behavioralPatterns.activeHours.push({ hour, count: 1 });
            }
            
            memory.lastAnalyzed = new Date();
            await memory.save();
            
            return memory;
            
        } catch (error) {
            console.error('Error updating user memory:', error);
            throw error;
        }
    }
    
    /**
     * Get personalized context for AI based on user memory
     */
    async getPersonalizedContext(userId, conversationId = null) {
        try {
            const memory = await this.getUserMemory(userId);
            
            // Build context string
            let context = '';
            
            // Add user preferences
            if (memory.preferences.communicationStyle) {
                const style = memory.preferences.communicationStyle;
                context += `User prefers ${style.preferredTone} tone, ${style.preferredLength} responses. `;
            }
            
            // Add topic interests
            const topInterests = memory.preferences.topicInterests
                ?.sort((a, b) => b.frequency - a.frequency)
                .slice(0, 5)
                .map(t => t.topic);
            
            if (topInterests && topInterests.length > 0) {
                context += `User frequently discusses: ${topInterests.join(', ')}. `;
            }
            
            // Add recent context
            const recentTopics = memory.recentContext.recentConversations
                ?.slice(-3)
                .flatMap(c => c.topics)
                .filter((t, i, arr) => arr.indexOf(t) === i); // unique
            
            if (recentTopics && recentTopics.length > 0) {
                context += `Recent topics: ${recentTopics.join(', ')}. `;
            }
            
            // Add active projects
            if (memory.recentContext.activeTopics && memory.recentContext.activeTopics.length > 0) {
                const activeProjects = memory.recentContext.activeTopics
                    .map(t => t.topic)
                    .join(', ');
                context += `Currently working on: ${activeProjects}. `;
            }
            
            // Add attachment context (images, files, documents)
            if (conversationId) {
                const attachmentContext = await attachmentMemoryService.buildAttachmentContext(userId, conversationId);
                context += attachmentContext;
            }
            
            return {
                contextText: context,
                preferences: memory.preferences,
                recentConversations: memory.recentContext.recentConversations,
                predictions: memory.predictions
            };
            
        } catch (error) {
            console.error('Error getting personalized context:', error);
            return {
                contextText: '',
                preferences: {},
                recentConversations: [],
                predictions: {}
            };
        }
    }
    
    /**
     * Record user feedback for learning
     */
    async recordFeedback(userId, messageId, feedbackType, reason = '') {
        try {
            const memory = await this.getUserMemory(userId);
            const message = await Message.findById(messageId);
            
            if (!message) {
                throw new Error('Message not found');
            }
            
            // Extract context
            const conversationMessages = await Message.find({ 
                conversationId: message.conversationId 
            }).limit(5);
            
            const topics = conversationMessages
                .map(m => m.content)
                .join(' ')
                .toLowerCase()
                .split(' ')
                .filter(w => w.length > 5)
                .slice(0, 5);
            
            memory.recordFeedback(
                feedbackType === 'positive' ? 'positive' : 'negative',
                messageId,
                message.content.slice(0, 200),
                topics
            );
            
            await memory.save();
            
            return { success: true };
            
        } catch (error) {
            console.error('Error recording feedback:', error);
            throw error;
        }
    }
    
    /**
     * Get user insights and statistics
     */
    async getUserInsights(userId) {
        try {
            const memory = await this.getUserMemory(userId);
            const analytics = await ConversationAnalytics.find({ userId })
                .sort({ analyzedAt: -1 })
                .limit(10);
            
            // Calculate insights
            const insights = {
                topTopics: memory.preferences.topicInterests
                    ?.sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 5)
                    .map(t => ({
                        topic: t.topic,
                        frequency: t.frequency,
                        category: t.category
                    })) || [],
                
                communicationStyle: memory.preferences.communicationStyle || {},
                
                recentActivity: {
                    totalConversations: memory.statistics.totalConversations,
                    totalMessages: memory.statistics.totalMessages,
                    averageEngagement: analytics.reduce((sum, a) => sum + (a.metrics.engagementScore || 0), 0) / Math.max(analytics.length, 1)
                },
                
                predictions: memory.predictions || {},
                
                activeTopics: memory.recentContext.activeTopics || [],
                
                sentimentTrend: analytics.map(a => ({
                    conversationId: a.conversationId,
                    sentiment: a.sentimentAnalysis.overall,
                    score: a.sentimentAnalysis.score
                }))
            };
            
            return insights;
            
        } catch (error) {
            console.error('Error getting user insights:', error);
            throw error;
        }
    }
}

module.exports = new MemoryService();
