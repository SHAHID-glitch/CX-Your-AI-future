require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testVideoGeneration() {
    try {
        console.log('🎬 Testing Video Generation...\n');

        const testPrompt = 'A beautiful sunset over mountains with golden light';
        
        console.log(`📝 Prompt: "${testPrompt}"`);
        console.log('⏳ Requesting video generation...\n');

        const response = await axios.post(`${API_URL}/ai/generate-video`, {
            prompt: testPrompt,
            duration: 2,
            style: 'cinematic'
        }, {
            timeout: 120000 // 2 minutes timeout
        });

        console.log('✅ Response received:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.success) {
            console.log('\n🎉 Video generated successfully!');
            console.log(`📺 Video URL: ${response.data.video.url}`);
            console.log(`📁 Filename: ${response.data.video.filename}`);
            console.log(`⏱️  Generation time: ${response.data.video.duration}s`);
            console.log(`📊 Size: ${(response.data.video.size / 1024).toFixed(2)} KB`);
            console.log(`🤖 Model: ${response.data.video.model || 'Unknown'}`);
        }

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('Connection refused - is the server running on http://localhost:3000?');
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

testVideoGeneration();
