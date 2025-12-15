const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id || user.id, 
            email: user.email,
            username: user.username
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );
};

// Register endpoint (local authentication)
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide username, email, and password'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        }).catch(err => {
            console.error('Database query error:', err);
            return null;
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email or username already exists'
            });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
            provider: 'local',
            isActive: true
        });

        // Generate JWT token
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: user.toPublicJSON()
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
            res.status(503).json({ success: false, error: 'Database temporarily unavailable. Please try again.' });
        } else if (error.code === 11000) {
            res.status(400).json({ success: false, error: 'User with this email or username already exists' });
        } else {
            res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
        }
    }
});

// Login endpoint (local authentication)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password'
            });
        }

        // Debug logging - remove or lower when resolved
        console.log('[LOGIN] Attempting login for email:', email);

        // Find user by email
        const user = await User.findOne({ email }).catch(err => {
            console.error('Database query error:', err);
            return null;
        });

        console.log('[LOGIN] User lookup result for', email, ':', !!user);
        if (user) {
            console.log('[LOGIN] User details - provider:', user.provider, 'hasPassword:', !!user.password, 'isActive:', user.isActive);
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if user registered with OAuth
        if (user.provider !== 'local' && !user.password) {
            return res.status(401).json({
                success: false,
                error: `This account is registered with ${user.provider}. Please use ${user.provider} to login.`
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);

        console.log('[LOGIN] Password match for', email, ':', isMatch);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Your account has been deactivated'
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: user.toPublicJSON()
        });
    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
            res.status(503).json({ success: false, error: 'Database temporarily unavailable. Please try again.' });
        } else {
            res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
        }
    }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user details
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        res.json({
            success: true,
            valid: true,
            user: user.toPublicJSON()
        });
    } catch (error) {
        res.status(401).json({ success: false, valid: false, error: 'Invalid token' });
    }
});

// ==================== GOOGLE OAUTH ROUTES ====================

// Google OAuth - Initiate authentication
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
}));

// Google OAuth - Callback
router.get('/google/callback', 
    passport.authenticate('google', { 
        session: false,
        failureRedirect: '/auth.html?error=google_auth_failed'
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user);
            
            // Redirect to frontend with token
            res.redirect(`/auth.html?token=${token}&provider=google`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect('/auth.html?error=token_generation_failed');
        }
    }
);

// ==================== GITHUB OAUTH ROUTES ====================

// GitHub OAuth - Initiate authentication
router.get('/github', passport.authenticate('github', { 
    scope: ['user:email'],
    session: false
}));

// GitHub OAuth - Callback
router.get('/github/callback',
    passport.authenticate('github', { 
        session: false,
        failureRedirect: '/auth.html?error=github_auth_failed'
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user);
            
            // Redirect to frontend with token
            res.redirect(`/auth.html?token=${token}&provider=github`);
        } catch (error) {
            console.error('GitHub callback error:', error);
            res.redirect('/auth.html?error=token_generation_failed');
        }
    }
);

// ==================== UTILITY ROUTES ====================

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: user.toPublicJSON()
        });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Authentication failed' });
    }
});

// Debug endpoint - only for development (remove in production)
router.get('/debug-user/:email', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.json({ found: false });
        }
        
        res.json({
            found: true,
            username: user.username,
            email: user.email,
            provider: user.provider,
            hasPassword: !!user.password,
            isActive: user.isActive,
            createdAt: user.createdAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Debug query failed' });
    }
});

// Account reset endpoint - only for development
router.delete('/reset-account/:email', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    
    try {
        const result = await User.deleteOne({ email: req.params.email });
        res.json({
            success: true,
            deleted: result.deletedCount > 0,
            message: result.deletedCount > 0 ? 'Account deleted' : 'Account not found'
        });
    } catch (error) {
        console.error('Account reset error:', error);
        res.status(500).json({ error: 'Reset failed' });
    }
});

// Logout endpoint (optional - mainly for session cleanup)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// ==================== FORGOT PASSWORD ROUTES ====================

// Forgot password - verify email and initiate reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Please provide your email address'
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() }).catch(err => {
            console.error('Database query error:', err);
            return null;
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'No account found with this email address'
            });
        }

        // Store reset session data (valid for 10 minutes)
        req.session.passwordReset = {
            userId: user._id.toString(),
            email: user.email,
            username: user.username,
            timestamp: Date.now(),
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        console.log(`🔐 Password reset initiated for: ${email}`);

        res.json({
            success: true,
            message: 'Email verified. You can now reset your password.',
            user: {
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process password reset request. Please try again.'
        });
    }
});

// Check if reset session is valid
router.get('/check-reset-session', (req, res) => {
    try {
        if (!req.session.passwordReset) {
            return res.status(400).json({
                success: false,
                error: 'No active password reset session'
            });
        }

        const resetSession = req.session.passwordReset;
        
        // Check if session has expired
        if (Date.now() > resetSession.expiresAt) {
            delete req.session.passwordReset;
            return res.status(400).json({
                success: false,
                error: 'Reset session has expired. Please start over.'
            });
        }

        res.json({
            success: true,
            message: 'Reset session is valid',
            user: {
                email: resetSession.email,
                username: resetSession.username
            },
            expiresIn: Math.floor((resetSession.expiresAt - Date.now()) / 1000) // seconds
        });
    } catch (error) {
        console.error('Session check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify reset session'
        });
    }
});

// Reset password (in-browser, no email)
router.post('/reset-password', async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        // Validate input
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Please provide new password and confirmation'
            });
        }

        // Check if reset session exists
        if (!req.session.passwordReset) {
            return res.status(400).json({
                success: false,
                error: 'No active password reset session. Please start over.'
            });
        }

        const resetSession = req.session.passwordReset;

        // Check if session has expired
        if (Date.now() > resetSession.expiresAt) {
            delete req.session.passwordReset;
            return res.status(400).json({
                success: false,
                error: 'Reset session has expired. Please start over.'
            });
        }

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match'
            });
        }

        // Validate password strength (minimum 6 characters)
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        // Find and update user
        const user = await User.findById(resetSession.userId);

        if (!user) {
            delete req.session.passwordReset;
            return res.status(400).json({
                success: false,
                error: 'User not found'
            });
        }

        // Update password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Clear reset session
        delete req.session.passwordReset;

        console.log(`✅ Password reset successful for: ${user.email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password. Please try again.'
        });
    }
});

module.exports = router;
