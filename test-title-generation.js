#!/usr/bin/env node
/**
 * Test Script - Title Generation
 * Tests the new direct title extraction (6-8 words from chat content)
 */

const aiService = require('./services/aiService');

// Test cases
const testMessages = [
    "How do I create a responsive design for mobile devices?",
    "Can you help me debug this JavaScript error in my React component?",
    "I want to learn machine learning and artificial intelligence",
    "What's the best way to optimize database queries for performance?",
    "Tell me about cloud computing and its benefits",
    "How to build a REST API with Node.js and Express",
    "asdfghjkl", // Random keyboard test
    "Hi", // Short message
    "I'm struggling with CSS flexbox layout and grid positioning",
    "Explain quantum computing concepts for beginners",
];

console.log('🧪 Testing New Title Generation (6-8 Words from Chat)\n');
console.log('═'.repeat(70));

async function runTests() {
    for (let index = 0; index < testMessages.length; index++) {
        const message = testMessages[index];
        const title = await aiService.generateConversationTitle(message);
        console.log(`\n${index + 1}. Input: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
        console.log(`   Title: "${title}"`);
        console.log(`   Words: ${title.split(' ').length}`);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ Title Generation Test Complete!');
}

runTests();
console.log('\n📝 Key Features:');
console.log('   • Extracts 6-8 meaningful words from chat');
console.log('   • Removes common stop words (the, a, and, etc.)');
console.log('   • Capitalizes first letter of each word');
console.log('   • Limits title length to 60 characters');
console.log('   • Detects random keyboard input');
