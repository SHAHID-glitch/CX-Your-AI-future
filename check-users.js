/**
 * Check Users in Database
 * This script will show all users in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            tls: true
        });
        
        console.log('✅ Connected to MongoDB\n');
        
        const users = await User.find({}).select('-password');
        
        if (users.length === 0) {
            console.log('📭 No users found in database\n');
            console.log('This is normal if you haven\'t registered any users yet.');
        } else {
            console.log(`👥 Found ${users.length} user(s) in database:\n`);
            
            users.forEach((user, index) => {
                console.log(`User ${index + 1}:`);
                console.log(`  ID: ${user._id}`);
                console.log(`  Username: ${user.username}`);
                console.log(`  Email: ${user.email}`);
                console.log(`  Provider: ${user.provider}`);
                console.log(`  Active: ${user.isActive}`);
                console.log(`  Created: ${user.createdAt}`);
                console.log('');
            });
        }
        
        await mongoose.connection.close();
        console.log('✅ Done');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUsers();
