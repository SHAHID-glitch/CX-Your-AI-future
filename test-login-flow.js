/**
 * Test Authentication Flow
 * This simulates what happens when you try to login
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testAuth() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            tls: true
        });
        
        console.log('✅ Connected to MongoDB\n');
        console.log('=' .repeat(50));
        console.log('🔐 Testing Authentication Flow');
        console.log('='.repeat(50) + '\n');
        
        // Test 1: Find user by email
        const testEmail = 'sdfgh@gmai.com';
        console.log(`1️⃣  Testing LOGIN with email: ${testEmail}`);
        
        const user = await User.findOne({ email: testEmail });
        
        if (!user) {
            console.log('   ❌ User not found - This would show "Invalid email or password"');
        } else {
            console.log('   ✅ User found!');
            console.log(`      Username: ${user.username}`);
            console.log(`      Provider: ${user.provider}`);
            console.log(`      Has password: ${user.password ? 'Yes' : 'No'}`);
            console.log(`      Active: ${user.isActive}`);
            
            // Test password comparison
            console.log('\n   Testing password verification...');
            const testPassword = 'test123'; // Replace with actual password
            
            try {
                const isMatch = await user.comparePassword(testPassword);
                console.log(`      Password 'test123': ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
            } catch (err) {
                console.log(`      ❌ Error comparing password: ${err.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        
        // Test 2: Check for duplicate registration attempt
        console.log('\n2️⃣  Testing REGISTER with same email: ' + testEmail);
        
        const existingUser = await User.findOne({ 
            $or: [{ email: testEmail }, { username: 'SHAHID_MALIK' }] 
        });
        
        if (existingUser) {
            console.log('   ❌ User already exists!');
            console.log('   This would show: "User with this email or username already exists"');
            console.log('\n   💡 Solution: Use the LOGIN form, not REGISTER');
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('\n📋 Summary:');
        console.log('   • Your users are in the database');
        console.log('   • If you see "user already exists" during LOGIN, check:');
        console.log('     1. Are you clicking the "Sign In" button or "Register"?');
        console.log('     2. Is the frontend calling /auth/login or /auth/register?');
        console.log('     3. Check browser console for the actual API call');
        console.log('\n   • To login, use:');
        console.log(`     Email: ${testEmail}`);
        console.log('     Password: [the password you used when registering]');
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        await mongoose.connection.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testAuth();
