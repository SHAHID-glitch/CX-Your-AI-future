/**
 * Quick .env Configuration Checker
 */

require('dotenv').config();

console.log('╔════════════════════════════════════════════╗');
console.log('║   .env Configuration Checker               ║');
console.log('╚════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;

function test(name, condition, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`✅ ${name}`);
        if (details) console.log(`   ${details}`);
    } else {
        console.log(`❌ ${name}`);
        if (details) console.log(`   ${details}`);
    }
}

// Test 1: NODE_ENV
test(
    'NODE_ENV', 
    process.env.NODE_ENV === 'development',
    `Value: ${process.env.NODE_ENV}`
);

// Test 2: PORT
test(
    'PORT',
    process.env.PORT === '3000',
    `Value: ${process.env.PORT}`
);

// Test 3: MONGODB_URI
const mongoUri = process.env.MONGODB_URI;
test(
    'MONGODB_URI',
    mongoUri && mongoUri.includes('mongodb'),
    `⚠️  Contains shell command - needs fixing!\n   Current: ${mongoUri?.substring(0, 50)}...\n   Should be: mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE`
);

// Test 4: OPENAI_API_KEY
const openaiKey = process.env.OPENAI_API_KEY;
test(
    'OPENAI_API_KEY',
    openaiKey && openaiKey.length > 20,
    `Length: ${openaiKey?.length} characters`
);

// Test 5: JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
test(
    'JWT_SECRET',
    jwtSecret && jwtSecret.length > 10,
    `⚠️  You put a JWT TOKEN, not a SECRET!\n   This should be a random string like: "my-super-secret-key-2024"\n   Current length: ${jwtSecret?.length} characters`
);

// Test 6: MAX_FILE_SIZE
const maxSize = process.env.MAX_FILE_SIZE;
test(
    'MAX_FILE_SIZE',
    maxSize === '52428800',
    `Value: ${(parseInt(maxSize) / 1024 / 1024).toFixed(0)}MB`
);

// Test 7: RATE_LIMIT_WINDOW_MS
const window = process.env.RATE_LIMIT_WINDOW_MS;
test(
    'RATE_LIMIT_WINDOW_MS',
    window === '900000',
    `Value: ${(parseInt(window) / 60000)} minutes`
);

// Test 8: RATE_LIMIT_MAX_REQUESTS
test(
    'RATE_LIMIT_MAX_REQUESTS',
    process.env.RATE_LIMIT_MAX_REQUESTS === '100',
    `Value: ${process.env.RATE_LIMIT_MAX_REQUESTS} requests`
);

// Test 9: CORS_ORIGIN
test(
    'CORS_ORIGIN',
    process.env.CORS_ORIGIN === '*',
    `Value: ${process.env.CORS_ORIGIN} (allows all origins)`
);

console.log('\n' + '═'.repeat(48));
console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`   Success Rate: ${Math.round((passedTests/totalTests)*100)}%\n`);

if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your .env is configured correctly!\n');
} else {
    console.log('⚠️  Some issues found. Please fix the items marked with ❌\n');
    console.log('🔧 Issues to fix:');
    console.log('   1. MONGODB_URI - Remove shell command, use connection string only');
    console.log('   2. JWT_SECRET - Use a simple secret key, not a JWT token\n');
}

console.log('💡 Recommended fixes:');
console.log('   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE');
console.log('   JWT_SECRET=copilot-secret-key-2024\n');
