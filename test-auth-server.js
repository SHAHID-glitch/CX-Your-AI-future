// Simple auth test without database
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// In-memory users for testing
const users = new Map();

// Test endpoints
app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    
    console.log('Registration attempt:', { username, email, password: '***' });
    
    if (!username || !email || !password) {
        console.log('Validation failed: missing fields');
        return res.status(400).json({
            success: false,
            error: 'Please provide username, email, and password'
        });
    }
    
    if (users.has(email)) {
        console.log('User already exists:', email);
        return res.status(400).json({
            success: false,
            error: 'User already exists'
        });
    }
    
    // Create user
    const user = { username, email, password, id: Date.now() };
    users.set(email, user);
    
    console.log('User registered successfully:', email);
    res.json({
        success: true,
        token: 'test-token-' + Date.now(),
        user: { username, email, id: user.id }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password: '***' });
    
    if (!email || !password) {
        console.log('Validation failed: missing fields');
        return res.status(400).json({
            success: false,
            error: 'Please provide email and password'
        });
    }
    
    const user = users.get(email);
    if (!user || user.password !== password) {
        console.log('Invalid credentials for:', email);
        return res.status(401).json({
            success: false,
            error: 'Invalid email or password'
        });
    }
    
    console.log('Login successful:', email);
    res.json({
        success: true,
        token: 'test-token-' + Date.now(),
        user: { username: user.username, email: user.email, id: user.id }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Test auth server running' });
});

app.listen(PORT, () => {
    console.log(`Test auth server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /api/auth/register');
    console.log('  POST /api/auth/login');
    console.log('  GET  /api/health');
});