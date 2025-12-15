// Test script for PDF/DOCX content generation endpoint
const axios = require('axios');

async function testPdfContentGeneration() {
    try {
        console.log('🧪 Testing PDF/DOCX content generation endpoint...\n');
        
        const response = await axios.post('http://localhost:3000/api/generate-pdf-content', {
            prompt: 'Write a short paragraph about artificial intelligence and its impact on modern society.'
        });

        console.log('✅ SUCCESS! Endpoint is working correctly.\n');
        console.log('Response:');
        console.log('- Success:', response.data.success);
        console.log('- Content length:', response.data.text.length, 'characters');
        console.log('- Provider:', response.data.metadata.provider);
        console.log('- Model:', response.data.metadata.model);
        console.log('\nGenerated content preview:');
        console.log(response.data.text.substring(0, 200) + '...\n');
        
        return true;
    } catch (error) {
        console.error('❌ ERROR! Endpoint test failed:\n');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data.error);
        } else {
            console.error('Error:', error.message);
        }
        return false;
    }
}

// Run the test
testPdfContentGeneration().then(success => {
    if (success) {
        console.log('🎉 PDF/DOCX generation is now ready to use!');
        console.log('📝 You can now:');
        console.log('   1. Open http://localhost:3000/copilot in your browser');
        console.log('   2. Click the + button in the chat input area');
        console.log('   3. Select "Create AI PDF (default)" or "Create AI DOCX (default)"');
        console.log('   4. The file will be generated and automatically downloaded!');
    } else {
        console.log('⚠️  Please check your API keys and server configuration.');
    }
    process.exit(success ? 0 : 1);
});
