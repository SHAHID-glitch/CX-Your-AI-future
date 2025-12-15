require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

// Simple auth routes (no MongoDB required)
app.post('/api/auth/simple-login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email and password required'
        });
    }

    console.log('[SIMPLE-LOGIN] Login attempt for:', email);

    // Create simple user data (no database required)
    const userData = {
        id: 'temp-user-' + Date.now(),
        username: email.split('@')[0].toUpperCase(),
        email: email,
        provider: 'simple'
    };

    // Create simple token
    const token = Buffer.from(JSON.stringify(userData)).toString('base64');

    console.log('[SIMPLE-LOGIN] Success for:', email);

    res.json({
        success: true,
        token: token,
        user: userData
    });
});

// Simple auth verification
app.post('/api/auth/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
        const userData = JSON.parse(Buffer.from(token, 'base64').toString());
        res.json({
            success: true,
            valid: true,
            user: userData,
            email: userData.email,
            userId: userData.id
        });
    } catch (error) {
        res.status(401).json({ success: false, valid: false, error: 'Invalid token' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0-simple',
        database: 'none (simple mode)',
        services: {
            auth: 'active (simple)',
            conversations: 'memory-only',
            messages: 'memory-only'
        }
    });
});

// In-memory storage
let conversations = [];
let messages = [];

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Basic conversation endpoints (in-memory only)
app.get('/api/conversations', (req, res) => {
    const userId = req.headers['user-id'] || 'default-user';
    const userConversations = conversations
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    
    res.json({
        success: true,
        conversations: userConversations,
        count: userConversations.length
    });
});

app.post('/api/conversations', (req, res) => {
    const userId = req.headers['user-id'] || 'default-user';
    const { title } = req.body;
    
    const conversation = {
        id: generateId(),
        userId,
        title: title || 'New Chat',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0,
        isPinned: false,
        tags: []
    };
    
    conversations.push(conversation);
    
    res.json({
        success: true,
        conversation
    });
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Simple Copilot Server Running! 🚀       ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Mode: Simple (No Database)              ║
║   Auth: File at auth-simple.html          ║
╚════════════════════════════════════════════╝
`);
});

module.exports = app;