/**
 * Check Specific User Details
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            tls: true
        });
        
        console.log('✅ Connected to MongoDB\n');
        
        const user = await User.findOne({ username: 'SHAHID' });
        
        if (user) {
            console.log('User Details:');
            console.log('Username:', user.username);
            console.log('Mobile:', user.mobileNumber || 'NOT SET ❌');
            console.log('Email:', user.email);
            console.log('Verified:', user.isVerified);
            console.log('Provider:', user.provider);
            console.log('Has Password:', !!user.password);
        } else {
            console.log('User SHAHID not found');
        }
        
        await mongoose.connection.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUser();
