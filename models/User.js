const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function() {
            // Password is only required if no OAuth provider is used
            return !this.googleId && !this.githubId;
        },
        minlength: 6
    },
    // OAuth fields
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    githubId: {
        type: String,
        sparse: true,
        unique: true
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    profile: {
        firstName: String,
        lastName: String,
        avatar: String,
        bio: String
    },
    settings: {
        theme: {
            type: String,
            enum: ['dark', 'light', 'curious'],
            default: 'dark'
        },
        responseType: {
            type: String,
            enum: ['concise', 'balanced', 'detailed', 'creative'],
            default: 'balanced'
        },
        notifications: {
            type: Boolean,
            default: true
        },
        soundEffects: {
            type: Boolean,
            default: true
        },
        language: {
            type: String,
            default: 'en'
        },
        autoSave: {
            type: Boolean,
            default: true
        }
    },
    apiKeys: [{
        service: String,
        key: String,
        isActive: Boolean
    }],
    usage: {
        totalMessages: {
            type: Number,
            default: 0
        },
        totalConversations: {
            type: Number,
            default: 0
        },
        lastActive: Date
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free'
        },
        startDate: Date,
        endDate: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        if (!this.password) {
            return false;
        }
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};

// Method to get public profile
userSchema.methods.toPublicJSON = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        profile: this.profile,
        settings: this.settings,
        subscription: this.subscription,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);
