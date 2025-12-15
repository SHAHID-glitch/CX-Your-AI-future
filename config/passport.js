const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy - Only configure if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
    
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // User exists, return user
                return done(null, user);
            }

            // Check if user exists with the same email
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
                user.provider = 'google';
                user.profile.avatar = user.profile.avatar || profile.photos[0]?.value;
                await user.save();
                return done(null, user);
            }

            // Create new user
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                username: profile.emails[0].value.split('@')[0] + '_' + Date.now(),
                provider: 'google',
                profile: {
                    firstName: profile.name?.givenName,
                    lastName: profile.name?.familyName,
                    avatar: profile.photos[0]?.value
                },
                isVerified: true,
                isActive: true
            });

            done(null, user);
        } catch (error) {
            console.error('Google OAuth error:', error);
            done(error, null);
        }
    }));
    
    console.log('✅ Google OAuth strategy configured');
} else {
    console.log('⚠️  Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// GitHub OAuth Strategy - Only configure if credentials are provided
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET &&
    process.env.GITHUB_CLIENT_ID !== 'your-github-client-id') {
    
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
        scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this GitHub ID
            let user = await User.findOne({ githubId: profile.id });

            if (user) {
                // User exists, return user
                return done(null, user);
            }

            // Get primary email from GitHub
            const email = profile.emails && profile.emails.length > 0 
                ? profile.emails.find(e => e.primary)?.value || profile.emails[0].value
                : `${profile.username}@github.user`;

            // Check if user exists with the same email
            user = await User.findOne({ email: email });

            if (user) {
                // Link GitHub account to existing user
                user.githubId = profile.id;
                user.provider = 'github';
                user.profile.avatar = user.profile.avatar || profile.photos[0]?.value;
                await user.save();
                return done(null, user);
            }

            // Create new user
            user = await User.create({
                githubId: profile.id,
                email: email,
                username: profile.username || profile.displayName || 'github_' + Date.now(),
                provider: 'github',
                profile: {
                    firstName: profile.displayName?.split(' ')[0],
                    lastName: profile.displayName?.split(' ').slice(1).join(' '),
                    avatar: profile.photos[0]?.value,
                    bio: profile._json?.bio
                },
                isVerified: true,
                isActive: true
            });

            done(null, user);
        } catch (error) {
            console.error('GitHub OAuth error:', error);
            done(error, null);
        }
    }));
    
    console.log('✅ GitHub OAuth strategy configured');
} else {
    console.log('⚠️  GitHub OAuth not configured - set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env');
}

module.exports = passport;
