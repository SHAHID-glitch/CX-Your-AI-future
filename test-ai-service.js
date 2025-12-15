require('dotenv').config();
const aiService = require('./services/aiService');

async function testAIService() {
    console.log('🧪 Testing AI Service Integration...\n');

    const testMessage = "What is artificial intelligence? Give me a brief explanation.";
    
    console.log('📤 Test Message:', testMessage);
    console.log('📋 Response Type: concise\n');
    console.log('⏳ Generating response...\n');

    try {
        const response = await aiService.generateResponse(testMessage, [], 'concise');
        
        console.log('✅ SUCCESS!\n');
        console.log('📊 Response:');
        console.log('─'.repeat(60));
        console.log(response.content);
        console.log('─'.repeat(60));
        console.log('\n📈 Metadata:');
        console.log('  Provider:', response.metadata.provider.toUpperCase());
        console.log('  Model:', response.metadata.model);
        console.log('  Tokens:', response.metadata.tokens);
        console.log('  Processing Time:', response.metadata.processingTime + 'ms');
        console.log('  Temperature:', response.metadata.temperature);
        
        console.log('\n✨ AI Service is working correctly!\n');

    } catch (error) {
        console.error('❌ Error testing AI service:', error.message);
        console.error(error);
    }
}

testAIService().catch(console.error);
