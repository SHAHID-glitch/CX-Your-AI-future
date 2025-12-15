const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const UserMemory = require('../models/UserMemory');

/**
 * Attachment Memory Service
 * Manages memory of all uploaded/generated content (images, files, documents)
 * Enables AI to reference and utilize past attachments in responses
 */
class AttachmentMemoryService {
    
    /**
     * Get all attachments from a user's conversation history
     */
    async getUserAttachmentHistory(userId, options = {}) {
        try {
            const {
                limit = 50,
                type = null, // Filter by type: 'image', 'file', etc.
                conversationId = null
            } = options;
            
            // Build query
            const query = {};
            
            // Get user's conversations
            const conversations = await Conversation.find({ userId }).select('_id');
            const conversationIds = conversations.map(c => c._id);
            
            query.conversationId = { $in: conversationIds };
            query['attachments.0'] = { $exists: true }; // Has at least one attachment
            
            if (conversationId) {
                query.conversationId = conversationId;
            }
            
            // Get messages with attachments
            const messages = await Message.find(query)
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();
            
            // Extract and flatten attachments
            let attachments = [];
            messages.forEach(msg => {
                if (msg.attachments && msg.attachments.length > 0) {
                    msg.attachments.forEach(att => {
                        attachments.push({
                            ...att,
                            messageId: msg._id,
                            conversationId: msg.conversationId,
                            messageContent: msg.content,
                            timestamp: msg.timestamp,
                            role: msg.role
                        });
                    });
                }
            });
            
            // Filter by type if specified
            if (type) {
                attachments = attachments.filter(att => att.type === type);
            }
            
            return attachments;
            
        } catch (error) {
            console.error('Error getting user attachment history:', error);
            return [];
        }
    }
    
    /**
     * Get attachments from current conversation
     */
    async getConversationAttachments(conversationId) {
        try {
            const messages = await Message.find({ 
                conversationId,
                'attachments.0': { $exists: true }
            }).sort({ timestamp: 1 }).lean();
            
            const attachments = [];
            messages.forEach(msg => {
                if (msg.attachments && msg.attachments.length > 0) {
                    msg.attachments.forEach(att => {
                        attachments.push({
                            ...att,
                            messageId: msg._id,
                            messageContent: msg.content,
                            timestamp: msg.timestamp
                        });
                    });
                }
            });
            
            return attachments;
            
        } catch (error) {
            console.error('Error getting conversation attachments:', error);
            return [];
        }
    }
    
    /**
     * Build context string with attachment history for AI
     */
    async buildAttachmentContext(userId, conversationId) {
        try {
            // Get current conversation attachments
            const currentAttachments = await this.getConversationAttachments(conversationId);
            
            // Get recent attachments from other conversations
            const recentAttachments = await this.getUserAttachmentHistory(userId, {
                limit: 10
            });
            
            let contextText = '';
            
            // Add current conversation attachments
            if (currentAttachments.length > 0) {
                contextText += '\n\n=== ATTACHMENTS IN THIS CONVERSATION ===\n';
                
                const images = currentAttachments.filter(a => a.type === 'image');
                const files = currentAttachments.filter(a => a.type === 'file' || a.type === 'document');
                
                if (images.length > 0) {
                    contextText += `\nImages (${images.length}):\n`;
                    images.forEach((img, idx) => {
                        contextText += `${idx + 1}. "${img.filename || 'Generated image'}"`;
                        if (img.prompt) contextText += ` - Generated from: "${img.prompt}"`;
                        if (img.description) contextText += ` - Description: ${img.description}`;
                        if (img.extractedText) contextText += ` - Text found: "${img.extractedText.slice(0, 100)}..."`;
                        contextText += '\n';
                    });
                }
                
                if (files.length > 0) {
                    contextText += `\nFiles/Documents (${files.length}):\n`;
                    files.forEach((file, idx) => {
                        contextText += `${idx + 1}. "${file.filename}"`;
                        if (file.extractedText) contextText += ` - Content: "${file.extractedText.slice(0, 150)}..."`;
                        contextText += '\n';
                    });
                }
            }
            
            // Add recent attachments from past conversations
            if (recentAttachments.length > 0) {
                const pastAttachments = recentAttachments.filter(a => 
                    !currentAttachments.find(ca => ca.url === a.url)
                );
                
                if (pastAttachments.length > 0) {
                    contextText += '\n\n=== RECENT ATTACHMENTS FROM PAST CONVERSATIONS ===\n';
                    contextText += '(The user has uploaded/generated these recently)\n';
                    
                    pastAttachments.slice(0, 5).forEach((att, idx) => {
                        contextText += `${idx + 1}. ${att.type}: "${att.filename || 'Unnamed'}"`;
                        if (att.prompt) contextText += ` (generated from: "${att.prompt.slice(0, 50)}...")`;
                        contextText += '\n';
                    });
                }
            }
            
            return contextText;
            
        } catch (error) {
            console.error('Error building attachment context:', error);
            return '';
        }
    }
    
    /**
     * Analyze and describe an attachment
     */
    async analyzeAttachment(attachment, messageContent = '') {
        try {
            const analysis = {
                description: '',
                tags: [],
                extractedText: attachment.extractedText || ''
            };
            
            // Basic analysis based on type and filename
            if (attachment.type === 'image') {
                analysis.description = `Image file: ${attachment.filename}`;
                analysis.tags.push('image', 'visual');
                
                if (attachment.prompt) {
                    analysis.description += ` (AI-generated from prompt)`;
                    analysis.tags.push('ai-generated');
                }
            } else if (attachment.type === 'document' || attachment.type === 'file') {
                analysis.description = `Document: ${attachment.filename}`;
                analysis.tags.push('document', 'file');
                
                // Extract file type from extension
                const ext = attachment.filename.split('.').pop().toLowerCase();
                analysis.tags.push(ext);
                
                if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
                    analysis.tags.push('text-document');
                }
            }
            
            // Extract tags from message content
            if (messageContent) {
                const words = messageContent.toLowerCase().split(/\s+/);
                const relevantWords = words.filter(w => w.length > 4 && !['image', 'file', 'upload'].includes(w));
                analysis.tags.push(...relevantWords.slice(0, 3));
            }
            
            return analysis;
            
        } catch (error) {
            console.error('Error analyzing attachment:', error);
            return { description: '', tags: [], extractedText: '' };
        }
    }
    
    /**
     * Get attachment statistics for a user
     */
    async getAttachmentStats(userId) {
        try {
            const attachments = await this.getUserAttachmentHistory(userId, { limit: 1000 });
            
            const stats = {
                total: attachments.length,
                byType: {},
                recentCount: 0,
                totalSize: 0
            };
            
            // Count by type
            attachments.forEach(att => {
                stats.byType[att.type] = (stats.byType[att.type] || 0) + 1;
                stats.totalSize += att.size || 0;
                
                // Count recent (last 7 days)
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                if (new Date(att.timestamp) > weekAgo) {
                    stats.recentCount++;
                }
            });
            
            return stats;
            
        } catch (error) {
            console.error('Error getting attachment stats:', error);
            return { total: 0, byType: {}, recentCount: 0, totalSize: 0 };
        }
    }
    
    /**
     * Search attachments by content or description
     */
    async searchAttachments(userId, searchQuery, options = {}) {
        try {
            const attachments = await this.getUserAttachmentHistory(userId, {
                limit: options.limit || 100
            });
            
            const query = searchQuery.toLowerCase();
            
            // Filter attachments that match the search query
            const results = attachments.filter(att => {
                // Search in filename
                if (att.filename && att.filename.toLowerCase().includes(query)) {
                    return true;
                }
                
                // Search in description
                if (att.description && att.description.toLowerCase().includes(query)) {
                    return true;
                }
                
                // Search in extracted text
                if (att.extractedText && att.extractedText.toLowerCase().includes(query)) {
                    return true;
                }
                
                // Search in prompt (for generated images)
                if (att.prompt && att.prompt.toLowerCase().includes(query)) {
                    return true;
                }
                
                // Search in associated message content
                if (att.messageContent && att.messageContent.toLowerCase().includes(query)) {
                    return true;
                }
                
                return false;
            });
            
            return results;
            
        } catch (error) {
            console.error('Error searching attachments:', error);
            return [];
        }
    }
    
    /**
     * Get similar attachments based on content or context
     */
    async getSimilarAttachments(attachmentId, userId, limit = 5) {
        try {
            // Get the target attachment
            const message = await Message.findOne({
                'attachments._id': attachmentId
            }).lean();
            
            if (!message) return [];
            
            const targetAttachment = message.attachments.find(a => a._id.toString() === attachmentId);
            if (!targetAttachment) return [];
            
            // Get all user attachments
            const allAttachments = await this.getUserAttachmentHistory(userId, { limit: 100 });
            
            // Calculate similarity scores
            const scoredAttachments = allAttachments
                .filter(a => a.messageId.toString() !== message._id.toString())
                .map(att => {
                    let score = 0;
                    
                    // Same type
                    if (att.type === targetAttachment.type) score += 3;
                    
                    // Similar tags
                    if (targetAttachment.tags && att.tags) {
                        const commonTags = targetAttachment.tags.filter(t => att.tags.includes(t));
                        score += commonTags.length * 2;
                    }
                    
                    // Similar filename
                    if (targetAttachment.filename && att.filename) {
                        const targetWords = targetAttachment.filename.toLowerCase().split(/\W+/);
                        const attWords = att.filename.toLowerCase().split(/\W+/);
                        const commonWords = targetWords.filter(w => attWords.includes(w));
                        score += commonWords.length;
                    }
                    
                    return { ...att, similarityScore: score };
                })
                .filter(a => a.similarityScore > 0)
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, limit);
            
            return scoredAttachments;
            
        } catch (error) {
            console.error('Error getting similar attachments:', error);
            return [];
        }
    }
    
    /**
     * Update user memory with attachment insights
     */
    async updateUserMemoryWithAttachments(userId) {
        try {
            const memory = await UserMemory.findOne({ userId });
            if (!memory) return;
            
            const stats = await this.getAttachmentStats(userId);
            
            // Update memory with attachment statistics
            if (!memory.statistics.attachmentStats) {
                memory.statistics.attachmentStats = {};
            }
            
            memory.statistics.attachmentStats = {
                totalAttachments: stats.total,
                byType: stats.byType,
                totalSize: stats.totalSize,
                lastUpdated: new Date()
            };
            
            // Identify frequently used attachment types as user preference
            const mostUsedType = Object.entries(stats.byType)
                .sort((a, b) => b[1] - a[1])[0];
            
            if (mostUsedType && mostUsedType[1] > 5) {
                // User frequently uses this type
                const [type, count] = mostUsedType;
                
                if (!memory.preferences.contentPreferences) {
                    memory.preferences.contentPreferences = {};
                }
                
                memory.preferences.contentPreferences.preferredAttachmentType = type;
                memory.preferences.contentPreferences.attachmentUsageFrequency = count;
            }
            
            await memory.save();
            
        } catch (error) {
            console.error('Error updating user memory with attachments:', error);
        }
    }
}

module.exports = new AttachmentMemoryService();
