require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
try {
    require('./config/database');
} catch (error) {
    console.log('Database config not found, using direct connection');
}

// Passport config
try {
    require('./config/passport');
} catch (error) {
    console.log('Passport config not found');
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
try {
    const authRoutes = require('./routes/auth');
    app.use('/auth', authRoutes);
} catch (error) {
    console.log('Auth routes not available');
}

// OCR routes
try {
    const ocrRoutes = require('./routes/ocr');
    app.use('/api/ocr', ocrRoutes);
} catch (error) {
    console.log('OCR routes not available');
}

// AI routes
try {
    const aiRoutes = require('./routes/ai');
    app.use('/api', aiRoutes);
} catch (error) {
    console.log('AI routes not available');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Placeholder image generator
app.get('/placeholder/:size', (req, res) => {
    const size = req.params.size;
    const [w, h] = size.includes('x') ? size.split('x').map(Number) : [parseInt(size), parseInt(size)];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect width="${w}" height="${h}" fill="#f0f0f0"/>
        <text x="${w/2}" y="${h/2 + 5}" text-anchor="middle" fill="#999" font-size="14" font-family="Arial">${w}x${h}</text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   Copilot Backend Server Running! 🚀      ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'Development'}                 ║
║   API Base: http://localhost:${PORT}/api    ║
╚════════════════════════════════════════════╝

Available Endpoints:
  GET    /api/health
  Static Files: Serving from root directory
    `);
});

module.exports = app;