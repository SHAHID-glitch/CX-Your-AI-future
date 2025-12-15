require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('./config/passport');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const connectDB = require('./config/database');

// Initialize database connection
connectDB().catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Server will continue without database. Some features may not work.');
    console.log('💡 Fix: Check MongoDB connection string and network access');
});

// Middleware
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session middleware (required for passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Import routes
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const ocrRoutes = require('./routes/ocr');
const memoryRoutes = require('./routes/memory');
const searchRoutes = require('./routes/search');

// Import MongoDB models
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const User = require('./models/User');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/search', searchRoutes);

// Import AI service
const aiService = require('./services/aiService');

// ==================== UTILITY FUNCTIONS ====================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTimestamp() {
    return new Date().toISOString();
}

// Generate AI response using real AI service
async function generateAIResponse(message, conversationHistory = [], responseType = 'balanced', userId = null, conversationId = null) {
    try {
        const response = await aiService.generateResponse(message, conversationHistory, responseType, userId, conversationId);
        return response; // Returns { content, metadata }
    } catch (error) {
        console.error('Error generating AI response:', error);
        // Fallback response
        return {
            content: `I apologize, but I encountered an error processing your message. Please try again.`,
            metadata: {
                provider: 'fallback',
                model: 'error',
                tokens: 0,
                processingTime: 0,
                temperature: 0
            }
        };
    }
}

// ==================== API ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
        status: 'ok', 
        timestamp: formatTimestamp(),
        version: '1.0.0',
        database: dbStatus,
        services: {
            auth: 'active',
            conversations: 'active',
            messages: 'active'
        }
    });
});

// Get all conversations
app.get('/api/conversations', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        const userConversations = await Conversation.find({ userId })
            .sort({ lastActivity: -1 })
            .lean();
        
        res.json({
            success: true,
            conversations: userConversations,
            count: userConversations.length
        });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
});

// Create new conversation
app.post('/api/conversations', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const { title } = req.body;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        const conversation = new Conversation({
            userId: new mongoose.Types.ObjectId(userId),
            title: title || 'New Chat',
            messageCount: 0,
            isPinned: false,
            tags: []
        });
        
        await conversation.save();
        
        res.json({
            success: true,
            conversation: conversation.toObject()
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create conversation'
        });
    }
});

// Get conversation by ID
app.get('/api/conversations/:id', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.headers['user-id'];
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conversation ID'
            });
        }
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: new mongoose.Types.ObjectId(userId)
        }).lean();
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        
        const conversationMessages = await Message.find({ conversationId })
            .sort({ timestamp: 1 })
            .lean();
        
        res.json({
            success: true,
            conversation,
            messages: conversationMessages
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation'
        });
    }
});

// Update conversation
app.put('/api/conversations/:id', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.headers['user-id'];
        const updates = req.body;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conversation ID'
            });
        }
        
        const conversation = await Conversation.findOneAndUpdate(
            { 
                _id: conversationId, 
                userId: new mongoose.Types.ObjectId(userId) 
            },
            { 
                ...updates, 
                lastActivity: new Date() 
            },
            { 
                new: true, 
                runValidators: true 
            }
        );
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        
        res.json({
            success: true,
            conversation: conversation.toObject()
        });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update conversation'
        });
    }
});

// Generate/regenerate conversation title
app.post('/api/conversations/:id/generate-title', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.headers['user-id'];
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conversation ID'
            });
        }
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: new mongoose.Types.ObjectId(userId)
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Get the conversation messages to generate title from
        const conversationMessages = await Message.find({ conversationId })
            .sort({ timestamp: 1 })
            .lean();

        if (conversationMessages.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot generate title for empty conversation'
            });
        }

        // Use first user message and first AI response (if available)
        const firstUserMessage = conversationMessages.find(m => m.role === 'user');
        const firstAiMessage = conversationMessages.find(m => m.role === 'assistant');

        if (!firstUserMessage) {
            return res.status(400).json({
                success: false,
                error: 'No user message found to generate title from'
            });
        }

        // Generate title using AI service
        const generatedTitle = await aiService.generateConversationTitle(
            firstUserMessage.content, 
            firstAiMessage ? firstAiMessage.content : null
        );

        // Update conversation title
        conversation.title = generatedTitle;
        conversation.lastActivity = new Date();
        await conversation.save();

        console.log(`🔄 Regenerated title: "${generatedTitle}" for conversation ${conversationId}`);

        res.json({
            success: true,
            conversation: conversation.toObject(),
            newTitle: generatedTitle
        });

    } catch (error) {
        console.error('Title generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate title: ' + error.message
        });
    }
});

// Delete conversation
app.delete('/api/conversations/:id', async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.headers['user-id'];
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conversation ID'
            });
        }
        
        // Delete conversation (only if owned by user)
        const deletedConversation = await Conversation.findOneAndDelete({
            _id: conversationId,
            userId: new mongoose.Types.ObjectId(userId)
        });
        
        if (!deletedConversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        
        // Delete all messages in the conversation
        await Message.deleteMany({ conversationId });
        
        res.json({
            success: true,
            message: 'Conversation deleted'
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete conversation'
        });
    }
});

// Clear all conversations (delete all chat history)
app.delete('/api/conversations/clear/all', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }

        // Find all conversations for the user
        const userConversations = await Conversation.find({
            userId: new mongoose.Types.ObjectId(userId)
        });

        if (userConversations.length === 0) {
            return res.json({
                success: true,
                message: 'No conversations to delete',
                deletedCount: 0,
                deletedMessages: 0
            });
        }

        const conversationIds = userConversations.map(c => c._id);

        // Delete all messages in these conversations
        const messagesResult = await Message.deleteMany({
            conversationId: { $in: conversationIds }
        });

        // Delete all conversations for the user
        const conversationsResult = await Conversation.deleteMany({
            userId: new mongoose.Types.ObjectId(userId)
        });

        console.log(`🗑️  Cleared all chats: ${conversationsResult.deletedCount} conversations, ${messagesResult.deletedCount} messages deleted for user ${userId}`);

        res.json({
            success: true,
            message: 'All conversations cleared successfully',
            deletedConversations: conversationsResult.deletedCount,
            deletedMessages: messagesResult.deletedCount
        });
    } catch (error) {
        console.error('Error clearing all conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear conversations'
        });
    }
});

// Send message and get AI response
app.post('/api/messages', async (req, res) => {
    try {
        const { conversationId, content, responseType } = req.body;
        const userId = req.headers['user-id'];
        
        if (!conversationId || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: conversationId and content'
            });
        }
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing user ID'
            });
        }
        
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid conversation ID'
            });
        }
        
        // Find conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: new mongoose.Types.ObjectId(userId)
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        
        // Save user message
        const userMessage = new Message({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            role: 'user',
            content,
            isEdited: false,
            reactions: []
        });
        
        await userMessage.save();
        
        // Get conversation history for context
        const conversationMessages = await Message.find({ conversationId })
            .sort({ timestamp: 1 })
            .select('role content')
            .lean();
        
        // Generate AI response with context (includes attachment memory)
        const aiResponse = await generateAIResponse(content, conversationMessages, responseType, userId, conversationId);
        
        const aiMessage = new Message({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            role: 'assistant',
            content: aiResponse.content,
            isEdited: false,
            reactions: [],
            metadata: aiResponse.metadata
        });
        
        await aiMessage.save();
        
        // Update conversation
        conversation.lastActivity = new Date();
        conversation.messageCount = await Message.countDocuments({ conversationId });
        
        // Auto-generate smart title if it's the first message exchange
        if (conversation.messageCount === 2 && conversation.title === 'New Chat') {
            try {
                // Generate title using AI service with both user message and AI response
                const generatedTitle = await aiService.generateConversationTitle(content, aiResponse.content);
                conversation.title = generatedTitle;
                console.log(`📝 Auto-generated title: "${generatedTitle}" for conversation ${conversationId}`);
            } catch (error) {
                console.warn('Title generation failed, using fallback:', error.message);
                // Fallback to simple truncation
                conversation.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
            }
        }
        
        await conversation.save();
        
        // Analyze conversation in background (don't wait for it)
        // This learns from the conversation and updates user memory
        const memoryService = require('./services/memoryService');
        memoryService.analyzeConversation(conversationId, userId)
            .then(() => console.log(`✅ Analyzed conversation ${conversationId}`))
            .catch(err => console.warn('⚠️ Conversation analysis failed:', err.message));
        
        res.json({
            success: true,
            userMessage: userMessage.toObject(),
            aiMessage: aiMessage.toObject(),
            conversation: conversation.toObject()
        });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message'
        });
    }
});

// Get messages for a conversation
app.get('/api/conversations/:id/messages', (req, res) => {
    const conversationMessages = messages
        .filter(m => m.conversationId === req.params.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
        success: true,
        messages: conversationMessages,
        count: conversationMessages.length
    });
});

// Update message (edit)
app.put('/api/messages/:id', (req, res) => {
    const index = messages.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Message not found'
        });
    }
    
    const { content } = req.body;
    messages[index] = {
        ...messages[index],
        content,
        isEdited: true,
        editedAt: formatTimestamp()
    };
    
    res.json({
        success: true,
        message: messages[index]
    });
});

// Delete message
app.delete('/api/messages/:id', (req, res) => {
    const index = messages.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Message not found'
        });
    }
    
    const message = messages[index];
    messages.splice(index, 1);
    
    // Update conversation message count
    const conversation = conversations.find(c => c.id === message.conversationId);
    if (conversation) {
        conversation.messageCount = messages.filter(m => m.conversationId === message.conversationId).length;
    }
    
    res.json({
        success: true,
        message: 'Message deleted'
    });
});

// Add reaction to message
app.post('/api/messages/:id/reactions', (req, res) => {
    const index = messages.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Message not found'
        });
    }
    
    const { type } = req.body; // 'like', 'dislike', etc.
    const userId = req.headers['user-id'] || 'default-user';
    
    if (!messages[index].reactions) {
        messages[index].reactions = [];
    }
    
    // Remove existing reaction from this user
    messages[index].reactions = messages[index].reactions.filter(r => r.userId !== userId);
    
    // Add new reaction
    messages[index].reactions.push({
        userId,
        type,
        timestamp: formatTimestamp()
    });
    
    res.json({
        success: true,
        message: messages[index]
    });
});

// Regenerate AI response
app.post('/api/messages/:id/regenerate', async (req, res) => {
    const message = messages.find(m => m.id === req.params.id);
    
    if (!message || message.role !== 'assistant') {
        return res.status(404).json({
            success: false,
            error: 'Assistant message not found'
        });
    }
    
    // Find the previous user message
    const messageIndex = messages.findIndex(m => m.id === req.params.id);
    const previousMessage = messages[messageIndex - 1];
    
    if (!previousMessage || previousMessage.role !== 'user') {
        return res.status(400).json({
            success: false,
            error: 'Cannot find user message to regenerate from'
        });
    }
    
    const { responseType } = req.body;
    const newContent = await generateAIResponse(previousMessage.content, responseType);
    
    messages[messageIndex] = {
        ...message,
        content: newContent,
        isRegenerated: true,
        regeneratedAt: formatTimestamp()
    };
    
    res.json({
        success: true,
        message: messages[messageIndex]
    });
});

// Search conversations
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    const userId = req.headers['user-id'] || 'default-user';
    
    if (!q) {
        return res.status(400).json({
            success: false,
            error: 'Search query required'
        });
    }
    
    const query = q.toLowerCase();
    
    // Search in conversations
    const matchedConversations = conversations.filter(c => 
        c.userId === userId && c.title.toLowerCase().includes(query)
    );
    
    // Search in messages
    const matchedMessages = messages.filter(m => {
        const conversation = conversations.find(c => c.id === m.conversationId && c.userId === userId);
        return conversation && m.content.toLowerCase().includes(query);
    });
    
    res.json({
        success: true,
        conversations: matchedConversations,
        messages: matchedMessages,
        totalResults: matchedConversations.length + matchedMessages.length
    });
});

// File upload endpoint
app.post('/api/upload', async (req, res) => {
    try {
        const { file, filename, type } = req.body;
        
        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }
        
        // In production, save to cloud storage (S3, Azure Blob, etc.)
        // For now, we'll just return metadata
        const fileData = {
            id: generateId(),
            filename: filename || 'uploaded-file',
            type: type || 'application/octet-stream',
            size: file.length,
            uploadedAt: formatTimestamp(),
            url: '#' // Replace with actual storage URL
        };
        
        res.json({
            success: true,
            file: fileData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'File upload failed'
        });
    }
});

// User settings
app.get('/api/settings', (req, res) => {
    const userId = req.headers['user-id'] || 'default-user';
    
    if (!users[userId]) {
        users[userId] = {
            theme: 'dark',
            responseType: 'balanced',
            notifications: true,
            soundEffects: true,
            language: 'en'
        };
    }
    
    res.json({
        success: true,
        settings: users[userId]
    });
});

// Update user settings
app.put('/api/settings', (req, res) => {
    const userId = req.headers['user-id'] || 'default-user';
    
    users[userId] = {
        ...users[userId],
        ...req.body
    };
    
    res.json({
        success: true,
        settings: users[userId]
    });
});

// Export conversation
app.get('/api/conversations/:id/export', (req, res) => {
    const conversation = conversations.find(c => c.id === req.params.id);
    
    if (!conversation) {
        return res.status(404).json({
            success: false,
            error: 'Conversation not found'
        });
    }
    
    const conversationMessages = messages.filter(m => m.conversationId === req.params.id);
    
    const exportData = {
        conversation,
        messages: conversationMessages,
        exportedAt: formatTimestamp()
    };
    
    res.json({
        success: true,
        data: exportData
    });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
    const userId = req.headers['user-id'] || 'default-user';
    
    const userConversations = conversations.filter(c => c.userId === userId);
    const userMessages = messages.filter(m => {
        const conv = conversations.find(c => c.id === m.conversationId);
        return conv && conv.userId === userId;
    });
    
    res.json({
        success: true,
        analytics: {
            totalConversations: userConversations.length,
            totalMessages: userMessages.length,
            averageMessagesPerConversation: userConversations.length > 0 
                ? (userMessages.length / userConversations.length).toFixed(2) 
                : 0,
            mostActiveDay: 'Monday', // Calculate based on actual data
            topTopics: ['General', 'Coding', 'Writing'] // Implement topic detection
        }
    });
});

// ==================== AI PDF GENERATION ====================

// Proxy endpoint for Hugging Face API (to avoid CORS)
app.post('/api/generate-pdf-content', async (req, res) => {
    try {
        const { prompt } = req.body;
        const userPrompt = prompt || 'Write a comprehensive paragraph about the Internet of Things (IoT) and its impact on modern technology.';
        
        console.log('📄 Generating PDF content for prompt:', userPrompt);
        
        const API_KEY = process.env.GROQ_API_KEY;
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
        }
        
        let retries = 3;
        let lastError;
        
        // Retry logic for model loading
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`🔄 Attempt ${i + 1}/${retries} - Calling Groq API...`);
                
                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: 'llama-3.3-70b-versatile',
                        messages: [
                            {
                                role: 'user',
                                content: userPrompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 500
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                
                console.log('✅ Response received from Groq API');
                console.log('Response data:', JSON.stringify(response.data).substring(0, 200));
                
                const data = response.data;
                
                // Extract text from Groq response
                let text = '';
                if (data.choices && data.choices[0]?.message?.content) {
                    text = data.choices[0].message.content;
                } else if (data.generated_text) {
                    text = data.generated_text;
                } else if (typeof data === 'string') {
                    text = data;
                } else {
                    console.warn('⚠️  Unexpected response format:', data);
                    text = JSON.stringify(data);
                }
                
                console.log('✅ AI content generated successfully, length:', text.length);
                
                return res.json({
                    success: true,
                    text: text,
                    prompt: userPrompt
                });
                
            } catch (error) {
                lastError = error;
                console.error(`❌ Attempt ${i + 1} failed:`, error.response?.status, error.response?.data || error.message);
                
                // If rate limited (429) or temporary error (503), wait and retry
                if ((error.response?.status === 429 || error.response?.status === 503) && i < retries - 1) {
                    const waitTime = 5000;
                    console.log(`⏳ Rate limited or temporary error, waiting ${waitTime/1000} seconds... (attempt ${i + 1}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                
                // Other errors, rethrow
                if (i === retries - 1) {
                    throw error;
                }
            }
        }
        
        throw lastError;
        
    } catch (error) {
        console.error('❌ Error generating PDF content:', error.message);
        console.error('Error details:', error.response?.data || error.stack);
        
        let errorMessage = error.message || 'Failed to generate content';
        
        if (error.response?.status === 410) {
            errorMessage = 'Model is loading. Please try again in 20 seconds.';
        } else if (error.response?.status === 503) {
            errorMessage = 'Model is currently unavailable. Please try again later.';
        } else if (error.response?.status === 401) {
            errorMessage = 'Invalid API key. Please check your Hugging Face API key.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout. The model took too long to respond.';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.response?.data || error.message
        });
    }
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ==================== PDF/DOCX GENERATION ENDPOINT ====================

// Generate content for PDF/DOCX using AI
app.post('/api/generate-pdf-content', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        console.log('📄 Generating content for PDF/DOCX with prompt:', prompt.substring(0, 100) + '...');

        // Generate content using AI service
        const response = await aiService.generateResponse(prompt, [], 'detailed');
        
        if (!response || !response.content) {
            throw new Error('AI service returned no content');
        }

        console.log('✅ Content generated successfully');
        
        res.json({
            success: true,
            text: response.content,
            metadata: response.metadata
        });

    } catch (error) {
        console.error('❌ Error generating PDF/DOCX content:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate content'
        });
    }
});

// ==================== STANDALONE ROUTES ====================

// Serve copilot-standalone.html
app.get('/copilot', (req, res) => {
    res.sendFile(path.join(__dirname, 'copilot-standalone.html'));
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Copilot Backend Server Running! 🚀      ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Environment: Development                 ║
║   API Base: http://localhost:${PORT}/api    ║
╚════════════════════════════════════════════╝

Available Endpoints:
  GET    /api/health
  GET    /api/conversations
  POST   /api/conversations
  GET    /api/conversations/:id
  PUT    /api/conversations/:id
  DELETE /api/conversations/:id
  POST   /api/messages
  GET    /api/conversations/:id/messages
  PUT    /api/messages/:id
  DELETE /api/messages/:id
  POST   /api/messages/:id/reactions
  POST   /api/messages/:id/regenerate
  GET    /api/search?q=query
  POST   /api/upload
  GET    /api/settings
  PUT    /api/settings
  GET    /api/conversations/:id/export
  GET    /api/analytics
    `);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// Express error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Express Error:', err.message);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

module.exports = app;
