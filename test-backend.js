/**
 * Backend Health Check and Test Script
 * Run this to verify your backend is working correctly
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Backend Configuration Test\n');
console.log('='.repeat(50));

// Test 1: Environment Variables
console.log('\n✓ Environment Variables:');
console.log(`  PORT: ${process.env.PORT || '3000'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  MONGODB_URI: ${process.env.MONGODB_URI ? '✓ Set' : '✗ Missing'}`);
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
console.log(`  SESSION_SECRET: ${process.env.SESSION_SECRET ? '✓ Set' : '✗ Missing'}`);
console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' ? '✓ Configured' : '⚠ Not configured'}`);
console.log(`  GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== 'your-github-client-id' ? '✓ Configured' : '⚠ Not configured'}`);

// Test 2: MongoDB Connection
console.log('\n✓ Testing MongoDB Connection...');

async function testMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('  ✅ MongoDB Connection: SUCCESS');
        console.log(`  📍 Connected to: ${mongoose.connection.host}`);
        console.log(`  💾 Database: ${mongoose.connection.name}`);
        
        // Test database operations
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`  📚 Collections: ${collections.map(c => c.name).join(', ') || 'None yet'}`);
        
        await mongoose.connection.close();
        console.log('  ✅ Connection closed successfully');
        
    } catch (error) {
        console.log('  ❌ MongoDB Connection: FAILED');
        console.log(`  Error: ${error.message}`);
        console.log('\n  💡 Troubleshooting:');
        console.log('     1. Check if MONGODB_URI is correct in .env file');
        console.log('     2. Verify your MongoDB Atlas cluster is running');
        console.log('     3. Check if your IP is whitelisted in MongoDB Atlas');
        console.log('     4. Verify username and password are correct');
    }
}

// Test 3: Required Dependencies
console.log('\n✓ Checking Required Dependencies:');
const requiredDeps = [
    'express',
    'mongoose',
    'bcryptjs',
    'jsonwebtoken',
    'passport',
    'passport-google-oauth20',
    'passport-github2',
    'cors',
    'dotenv',
    'express-session'
];

let missingDeps = [];
requiredDeps.forEach(dep => {
    try {
        require.resolve(dep);
        console.log(`  ✓ ${dep}`);
    } catch (e) {
        console.log(`  ✗ ${dep} - MISSING`);
        missingDeps.push(dep);
    }
});

if (missingDeps.length > 0) {
    console.log(`\n  ⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
    console.log(`  Run: npm install ${missingDeps.join(' ')}`);
}

// Test 4: File Structure
console.log('\n✓ Checking File Structure:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'server.js',
    'package.json',
    '.env',
    'config/database.js',
    'config/passport.js',
    'models/User.js',
    'routes/auth.js',
    'middleware/auth.js'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

// Test 5: Configuration Warnings
console.log('\n✓ Configuration Warnings:');
const warnings = [];

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    warnings.push('JWT_SECRET should be changed from default value');
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('change-in-production')) {
    warnings.push('SESSION_SECRET should be changed for production');
}

if (!process.env.MONGODB_URI) {
    warnings.push('MONGODB_URI is not set');
}

if (warnings.length === 0) {
    console.log('  ✅ No warnings');
} else {
    warnings.forEach(w => console.log(`  ⚠️  ${w}`));
}

// Run tests
console.log('\n' + '='.repeat(50));
console.log('\n🧪 Running Database Test...\n');

testMongoDB().then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Backend Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Fix any issues shown above');
    console.log('   2. Start the server: npm start');
    console.log('   3. Test the API: http://localhost:3000/api/health');
    console.log('\n' + '='.repeat(50) + '\n');
    process.exit(0);
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
