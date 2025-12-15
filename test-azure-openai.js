require('dotenv').config();
const { AzureOpenAI } = require('openai');

async function testAzureOpenAI() {
    console.log('🔍 Testing Azure OpenAI Configuration...\n');

    // Check environment variables
    const apiKey = process.env.AZURE_OPENAI_API_KEY?.replace(/^["']|["']$/g, ''); // Remove quotes
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';

    console.log('📋 Configuration Check:');
    console.log('  API Key:', apiKey ? `✓ Present (${apiKey.substring(0, 20)}...)` : '✗ Missing');
    console.log('  Endpoint:', endpoint || '✗ Missing (Required!)');
    console.log('  Deployment:', deploymentName);
    console.log();

    if (!apiKey) {
        console.error('❌ AZURE_OPENAI_API_KEY is missing in .env file');
        return;
    }

    if (!endpoint || endpoint.includes('YOUR-RESOURCE-NAME')) {
        console.error('❌ AZURE_OPENAI_ENDPOINT is not configured properly in .env file');
        console.log('\n💡 You need to update your .env file with your actual Azure endpoint:');
        console.log('   AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE-NAME.openai.azure.com/');
        console.log('   AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name');
        console.log('\n📚 Find your endpoint at: https://portal.azure.com');
        console.log('   1. Go to your Azure OpenAI resource');
        console.log('   2. Click "Keys and Endpoint" in the left menu');
        console.log('   3. Copy the endpoint URL and deployment name');
        console.log('\n⚠️  Please update .env file before running this test again.');
        return;
    }

    try {
        console.log('🚀 Attempting connection to Azure OpenAI...');
        
        // Create Azure OpenAI client using the OpenAI SDK
        const client = new AzureOpenAI({
            apiKey: apiKey,
            endpoint: endpoint,
            apiVersion: '2024-02-15-preview'
        });

        // Test with a simple completion request
        console.log('📤 Sending test request...');
        const startTime = Date.now();

        const result = await client.chat.completions.create({
            model: deploymentName,
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say "Hello! Azure OpenAI is working correctly!" if you can read this.' }
            ],
            max_tokens: 100,
            temperature: 0.7
        });

        const duration = Date.now() - startTime;

        console.log('\n✅ SUCCESS! Azure OpenAI is working correctly!\n');
        console.log('📊 Response Details:');
        console.log('  Response:', result.choices[0].message.content);
        console.log('  Model:', result.model);
        console.log('  Tokens Used:', result.usage.total_tokens);
        console.log('  Processing Time:', duration + 'ms');
        console.log('  Finish Reason:', result.choices[0].finish_reason);
        console.log('\n✨ Your Azure OpenAI API key is valid and working!\n');

    } catch (error) {
        console.error('\n❌ ERROR: Failed to connect to Azure OpenAI\n');
        console.error('Error Type:', error.name || 'Unknown');
        console.error('Error Message:', error.message);
        
        if (error.message?.includes('404') || error.message?.includes('does not exist')) {
            console.error('\n💡 The deployment name "' + deploymentName + '" was not found.');
            console.error('   This could mean:');
            console.error('   1. The deployment name is case-sensitive (try checking exact case)');
            console.error('   2. The deployment might use a different name (e.g., "gpt-4", "gpt-35-turbo")');
            console.error('   3. The deployment was recently created (wait a few minutes)');
            console.error('\n📚 To find your deployment name:');
            console.error('   1. Go to https://portal.azure.com');
            console.error('   2. Open your Azure OpenAI resource: "shahid"');
            console.error('   3. Go to "Model deployments" or click "Azure OpenAI Studio"');
            console.error('   4. Copy the exact deployment name from the list');
        } else if (error.message?.includes('401') || error.message?.includes('authentication')) {
            console.error('\n💡 The API key appears to be invalid or expired.');
            console.error('   Please check your Azure OpenAI resource and regenerate the key if needed.');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('\n💡 Cannot reach the endpoint. Check your AZURE_OPENAI_ENDPOINT value.');
        }
        
        console.error('\n📚 General Troubleshooting:');
        console.error('   1. Verify endpoint: https://portal.azure.com');
        console.error('   2. Check deployment name (case-sensitive!)');
        console.error('   3. Ensure API key is not expired');
        console.error('   4. Verify network connectivity');
    }
}

// Run the test
testAzureOpenAI().catch(console.error);
