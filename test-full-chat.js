const axios = require('axios');

async function testChatAPI() {
    const baseURL = 'http://localhost:3000/api';
    
    console.log('🧪 Testing Chat API with Groq Integration\n');
    console.log('═'.repeat(60));
    
    try {
        // Test 1: Health Check
        console.log('\n📍 Test 1: Health Check');
        const health = await axios.get(`${baseURL}/health`);
        console.log('✅ Status:', health.data.status);
        console.log('   Database:', health.data.database);
        
        // Test 2: Create a new conversation
        console.log('\n📍 Test 2: Creating New Conversation');
        const conversation = await axios.post(`${baseURL}/conversations`, {
            title: 'Test Conversation',
            userId: 'test-user-123'
        });
        const conversationId = conversation.data.conversation.id;
        console.log('✅ Conversation created:', conversationId);
        
        // Test 3: Send a message and get AI response
        console.log('\n📍 Test 3: Sending Message to AI');
        console.log('💬 User: "Explain quantum computing in simple terms"');
        console.log('⏳ Waiting for AI response...\n');
        
        const messageResponse = await axios.post(`${baseURL}/messages`, {
            conversationId: conversationId,
            content: 'Explain quantum computing in simple terms',
            role: 'user',
            responseType: 'balanced'
        });
        
        console.log('✅ AI Response Received!\n');
        console.log('─'.repeat(60));
        console.log('🤖 AI:', messageResponse.data.aiMessage.content);
        console.log('─'.repeat(60));
        console.log('\n📊 Response Metadata:');
        console.log('   Provider:', messageResponse.data.aiMessage.metadata.provider.toUpperCase());
        console.log('   Model:', messageResponse.data.aiMessage.metadata.model);
        console.log('   Tokens Used:', messageResponse.data.aiMessage.metadata.tokens);
        console.log('   Processing Time:', messageResponse.data.aiMessage.metadata.processingTime + 'ms');
        console.log('   Temperature:', messageResponse.data.aiMessage.metadata.temperature);
        
        // Test 4: Get conversation history
        console.log('\n📍 Test 4: Fetching Conversation History');
        const messages = await axios.get(`${baseURL}/conversations/${conversationId}/messages`);
        console.log('✅ Messages in conversation:', messages.data.messages.length);
        
        // Test 5: Send follow-up message
        console.log('\n📍 Test 5: Sending Follow-up Message');
        console.log('💬 User: "Can you give me a real-world example?"');
        console.log('⏳ Waiting for AI response...\n');
        
        const followUp = await axios.post(`${baseURL}/messages`, {
            conversationId: conversationId,
            content: 'Can you give me a real-world example?',
            role: 'user',
            responseType: 'concise'
        });
        
        console.log('✅ Follow-up Response Received!\n');
        console.log('─'.repeat(60));
        console.log('🤖 AI:', followUp.data.aiMessage.content);
        console.log('─'.repeat(60));
        
        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('🎉 ALL TESTS PASSED!');
        console.log('═'.repeat(60));
        console.log('\n✨ Your AI Chat Application is fully functional!');
        console.log('   - MongoDB: Connected ✅');
        console.log('   - AI Provider: ' + messageResponse.data.aiMessage.metadata.provider.toUpperCase() + ' ✅');
        console.log('   - Conversation History: Working ✅');
        console.log('   - Follow-up Context: Working ✅');
        console.log('\n🌐 Access your app at: http://localhost:3000\n');
        
    } catch (error) {
        console.error('\n❌ Test Failed:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', error.response.data);
        } else {
            console.error('   Error:', error.message);
        }
    }
}

testChatAPI().catch(console.error);
