// Test Authentication System
// Run with: node test-auth.js

const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET'
];

console.log('\n🔍 Checking Authentication Setup...\n');

// Load environment variables
require('dotenv').config();

let hasErrors = false;

// Check environment variables
console.log('📋 Environment Variables:');
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== `your-${varName.toLowerCase().replace(/_/g, '-')}`) {
        console.log(`  ✅ ${varName}: Configured`);
    } else {
        console.log(`  ❌ ${varName}: Not configured or using default value`);
        hasErrors = true;
    }
});

// Check required files
console.log('\n📁 Required Files:');
const requiredFiles = [
    'config/passport.js',
    'routes/auth.js',
    'models/User.js',
    'auth.html',
    '.env'
];

const fs = require('fs');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file}: Missing`);
        hasErrors = true;
    }
});

// Check required packages
console.log('\n📦 Required Packages:');
try {
    const packageJson = require('./package.json');
    const requiredPackages = [
        'passport',
        'passport-google-oauth20',
        'passport-github2',
        'express-session',
        'mongoose',
        'bcryptjs',
        'jsonwebtoken'
    ];

    requiredPackages.forEach(pkg => {
        if (packageJson.dependencies[pkg]) {
            console.log(`  ✅ ${pkg}`);
        } else {
            console.log(`  ❌ ${pkg}: Not installed`);
            hasErrors = true;
        }
    });
} catch (error) {
    console.log('  ❌ Error reading package.json');
    hasErrors = true;
}

// Test MongoDB connection
console.log('\n🗄️  MongoDB Connection:');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/copilot-chat', {
    serverSelectionTimeoutMS: 5000
})
    .then(() => {
        console.log('  ✅ MongoDB connected successfully');
        
        // Summary
        printSummary();
        
        mongoose.connection.close();
        process.exit(hasErrors ? 1 : 0);
    })
    .catch(err => {
        console.log(`  ❌ MongoDB connection failed: ${err.message}`);
        console.log('  💡 Make sure MongoDB is running on your system');
        hasErrors = true;
        
        // Summary
        printSummary();
        process.exit(1);
    });

function printSummary() {
    console.log('\n' + '='.repeat(50));
    if (!hasErrors) {
        console.log('✅ All checks passed! Authentication system is ready.');
        console.log('\n📝 Next steps:');
        console.log('  1. Update .env with your OAuth credentials');
        console.log('  2. Start the server: npm start');
        console.log('  3. Open http://localhost:3000/auth.html');
    } else {
        console.log('❌ Some checks failed. Please fix the issues above.');
        console.log('\n📚 See OAUTH-SETUP-GUIDE.md for detailed instructions');
    }
    console.log('='.repeat(50) + '\n');
}

// Handle timeout
setTimeout(() => {
    console.log('\n⏱️  Timeout: MongoDB connection test took too long');
    hasErrors = true;
    printSummary();
    process.exit(1);
}, 10000);
