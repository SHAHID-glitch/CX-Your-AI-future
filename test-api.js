/**
 * API Test Script
 * Run this to test all backend endpoints
 * Usage: node test-api.js
 */

const API_BASE = 'http://localhost:3000/api';

let testToken = null;
let testConversationId = null;
let testMessageId = null;

// Helper function for API requests
async function request(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (testToken) {
        headers['Authorization'] = `Bearer ${testToken}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { status: 500, error: error.message };
    }
}

// Test functions
const tests = {
    // 1. Health Check
    async healthCheck() {
        console.log('\n🧪 Test 1: Health Check');
        const result = await request('/health');
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log(result.data);
        return result.status === 200;
    },

    // 2. Register User
    async register() {
        console.log('\n🧪 Test 2: Register User');
        const timestamp = Date.now();
        const result = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                username: `testuser_${timestamp}`,
                email: `test_${timestamp}@example.com`,
                password: 'password123'
            })
        });
        
        if (result.data.token) {
            testToken = result.data.token;
        }
        
        console.log(result.status === 201 ? '✅ PASSED' : '❌ FAILED');
        console.log('Token:', testToken ? '✅ Received' : '❌ Not received');
        return result.status === 201;
    },

    // 3. Verify Token
    async verifyToken() {
        console.log('\n🧪 Test 3: Verify Token');
        const result = await request('/auth/verify');
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('User:', result.data.user?.username);
        return result.status === 200;
    },

    // 4. Create Conversation
    async createConversation() {
        console.log('\n🧪 Test 4: Create Conversation');
        const result = await request('/conversations', {
            method: 'POST',
            body: JSON.stringify({ title: 'Test Chat' })
        });
        
        if (result.data.conversation) {
            testConversationId = result.data.conversation.id;
        }
        
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('Conversation ID:', testConversationId);
        return result.status === 200;
    },

    // 5. Send Message
    async sendMessage() {
        console.log('\n🧪 Test 5: Send Message');
        const result = await request('/messages', {
            method: 'POST',
            body: JSON.stringify({
                conversationId: testConversationId,
                content: 'Hello, this is a test message!',
                responseType: 'balanced'
            })
        });
        
        if (result.data.aiMessage) {
            testMessageId = result.data.aiMessage.id;
        }
        
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('User Message:', result.data.userMessage?.content?.slice(0, 50));
        console.log('AI Response:', result.data.aiMessage?.content?.slice(0, 100) + '...');
        return result.status === 200;
    },

    // 6. Get Conversations
    async getConversations() {
        console.log('\n🧪 Test 6: Get All Conversations');
        const result = await request('/conversations');
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('Total Conversations:', result.data.count);
        return result.status === 200;
    },

    // 7. Get Messages
    async getMessages() {
        console.log('\n🧪 Test 7: Get Messages');
        const result = await request(`/conversations/${testConversationId}/messages`);
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('Total Messages:', result.data.count);
        return result.status === 200;
    },

    // 8. Add Reaction
    async addReaction() {
        console.log('\n🧪 Test 8: Add Reaction');
        const result = await request(`/messages/${testMessageId}/reactions`, {
            method: 'POST',
            body: JSON.stringify({ type: 'like' })
        });
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        return result.status === 200;
    },

    // 9. Search
    async search() {
        console.log('\n🧪 Test 9: Search Conversations');
        const result = await request('/search?q=test');
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('Search Results:', result.data.totalResults);
        return result.status === 200;
    },

    // 10. Get Settings
    async getSettings() {
        console.log('\n🧪 Test 10: Get Settings');
        const result = await request('/settings');
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('Settings:', result.data.settings);
        return result.status === 200;
    },

    // 11. Update Settings
    async updateSettings() {
        console.log('\n🧪 Test 11: Update Settings');
        const result = await request('/settings', {
            method: 'PUT',
            body: JSON.stringify({
                theme: 'dark',
                responseType: 'creative'
            })
        });
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        return result.status === 200;
    },

    // 12. Get Analytics
    async getAnalytics() {
        console.log('\n🧪 Test 12: Get Analytics');
        const result = await request('/analytics');
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('Analytics:', result.data.analytics);
        return result.status === 200;
    },

    // 13. Update Conversation
    async updateConversation() {
        console.log('\n🧪 Test 13: Update Conversation');
        const result = await request(`/conversations/${testConversationId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: 'Updated Test Chat',
                isPinned: true
            })
        });
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        return result.status === 200;
    },

    // 14. Regenerate Response
    async regenerateResponse() {
        console.log('\n🧪 Test 14: Regenerate AI Response');
        const result = await request(`/messages/${testMessageId}/regenerate`, {
            method: 'POST',
            body: JSON.stringify({ responseType: 'creative' })
        });
        console.log(result.status === 200 ? '✅ PASSED' : '❌ FAILED');
        console.log('New Response:', result.data.message?.content?.slice(0, 100) + '...');
        return result.status === 200;
    }
};

// Run all tests
async function runAllTests() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Copilot Backend API Test Suite      ║');
    console.log('╚════════════════════════════════════════╝');
    
    const results = [];
    
    try {
        // Run tests in sequence
        results.push(await tests.healthCheck());
        results.push(await tests.register());
        results.push(await tests.verifyToken());
        results.push(await tests.createConversation());
        results.push(await tests.sendMessage());
        results.push(await tests.getConversations());
        results.push(await tests.getMessages());
        results.push(await tests.addReaction());
        results.push(await tests.search());
        results.push(await tests.getSettings());
        results.push(await tests.updateSettings());
        results.push(await tests.getAnalytics());
        results.push(await tests.updateConversation());
        results.push(await tests.regenerateResponse());
        
    } catch (error) {
        console.error('\n❌ Test suite error:', error.message);
    }
    
    // Summary
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           Test Summary                 ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${total - passed} ❌`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log('\n' + (passed === total ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('❌ This script requires Node.js 18+ for fetch support');
    console.log('Please upgrade Node.js or install node-fetch package');
    process.exit(1);
}

// Run tests
runAllTests().catch(console.error);
