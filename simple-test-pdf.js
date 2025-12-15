// Simple test script for PDF/DOCX content generation endpoint
const https = require('https');
const http = require('http');

async function testEndpoint() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            prompt: 'Write a short paragraph about artificial intelligence.'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/generate-pdf-content',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (result.success) {
                        console.log('✅ SUCCESS! The endpoint is working!\n');
                        console.log('Content generated:', result.text.substring(0, 150) + '...\n');
                        console.log('Provider:', result.metadata.provider);
                        console.log('Model:', result.metadata.model);
                        resolve(true);
                    } else {
                        console.log('❌ Failed:', result.error);
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ Error parsing response:', error.message);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request error:', error.message);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

console.log('🧪 Testing PDF/DOCX content generation...\n');
testEndpoint().then(success => {
    if (success) {
        console.log('\n🎉 PDF and DOCX generation is ready!');
        console.log('📝 Open http://localhost:3000/copilot and try:');
        console.log('   - Click the + button');
        console.log('   - Select "Create AI PDF (default)" or "Create AI DOCX (default)"');
    }
}).catch(err => {
    console.log('Error:', err.message);
});
