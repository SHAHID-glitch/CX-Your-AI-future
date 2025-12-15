/**
 * Add Mobile Number to Existing User
 * This script updates an existing user to add a mobile number
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function addMobileToUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            tls: true
        });
        
        console.log('✅ Connected to MongoDB\n');
        
        // Update the SHAHID_MALIK user with a mobile number
        const username = 'SHAHID_MALIK';
        const mobileNumber = '+919876543210'; // Change this to your mobile number
        
        const user = await User.findOne({ username });
        
        if (!user) {
            console.log(`❌ User ${username} not found`);
            process.exit(1);
        }
        
        console.log(`Found user: ${user.username}`);
        console.log(`Current mobile: ${user.mobileNumber || 'Not set'}`);
        
        // Update mobile number
        user.mobileNumber = mobileNumber;
        user.isVerified = true; // Set as verified so you can login
        await user.save();
        
        console.log(`\n✅ Updated successfully!`);
        console.log(`Mobile number: ${user.mobileNumber}`);
        console.log(`\nYou can now use this mobile number to login.`);
        
        await mongoose.connection.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addMobileToUser();
