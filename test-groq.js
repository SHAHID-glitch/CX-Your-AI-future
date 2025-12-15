require('dotenv').config();
const Groq = require('groq-sdk');

async function testGroq() {
    console.log('🔍 Testing Groq API Configuration...\n');

    const apiKey = process.env.GROQ_API_KEY;

    console.log('📋 Configuration Check:');
    console.log('  API Key:', apiKey ? `✓ Present (${apiKey.substring(0, 20)}...)` : '✗ Missing');
    console.log();

    if (!apiKey) {
        console.error('❌ GROQ_API_KEY is missing in .env file');
        return;
    }

    try {
        console.log('🚀 Attempting connection to Groq...');
        
        const groq = new Groq({
            apiKey: apiKey
        });

        console.log('📤 Sending test request...');
        const startTime = Date.now();

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say "Hello! Groq API is working correctly!" if you can read this.' }
            ],
            model: 'llama-3.3-70b-versatile', // Current Groq model
            temperature: 0.7,
            max_tokens: 100
        });

        const duration = Date.now() - startTime;

        console.log('\n✅ SUCCESS! Groq API is working correctly!\n');
        console.log('📊 Response Details:');
        console.log('  Response:', completion.choices[0].message.content);
        console.log('  Model:', completion.model);
        console.log('  Tokens Used:', completion.usage.total_tokens);
        console.log('  Processing Time:', duration + 'ms ⚡ (Groq is FAST!)');
        console.log('  Finish Reason:', completion.choices[0].finish_reason);
        console.log('\n✨ Your Groq API key is valid and working!\n');

    } catch (error) {
        console.error('\n❌ ERROR: Failed to connect to Groq\n');
        console.error('Error Type:', error.name || 'Unknown');
        console.error('Error Message:', error.message);
        
        if (error.message?.includes('401') || error.message?.includes('authentication')) {
            console.error('\n💡 The API key appears to be invalid or expired.');
            console.error('   Get a new key at: https://console.groq.com/keys');
        } else if (error.message?.includes('rate limit')) {
            console.error('\n💡 Rate limit exceeded. Wait a moment and try again.');
        }
        
        console.error('\n📚 Troubleshooting:');
        console.error('   1. Verify your API key at https://console.groq.com/keys');
        console.error('   2. Check if the key is active and not expired');
        console.error('   3. Ensure you have API credits available');
    }
}

testGroq().catch(console.error);
