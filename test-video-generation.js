const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// Mock user data for testing
const testUser = {
    email: 'test@example.com',
    password: 'Test123!'
};

async function login() {
    try {
        console.log('🔐 Logging in...');
        const response = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
        authToken = response.data.token;
        console.log('✅ Login successful');
        return authToken;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        throw error;
    }
}

async function generateSingleVideo(prompt) {
    try {
        console.log(`\n🎬 Generating video: "${prompt}"`);
        
        const response = await axios.post(
            `${API_BASE_URL}/ai/generate-video`,
            { prompt },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        if (response.data.success) {
            console.log('✅ Video generated successfully!');
            console.log('📊 Details:', {
                url: response.data.video.url,
                duration: response.data.video.duration + 's',
                size: (response.data.video.size / 1024 / 1024).toFixed(2) + 'MB'
            });
            return response.data.video;
        }
    } catch (error) {
        console.error('❌ Generation failed:', error.response?.data?.error || error.message);
        throw error;
    }
}

async function generateBatchVideos(prompts) {
    try {
        console.log(`\n🎬 Generating batch of ${prompts.length} videos...`);
        
        const response = await axios.post(
            `${API_BASE_URL}/ai/generate-videos-batch`,
            { prompts },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        if (response.data.success) {
            console.log('✅ Batch generation complete!');
            console.log('📊 Details:', response.data.message);
            response.data.results.forEach((result, i) => {
                if (result.success) {
                    console.log(`  [${i + 1}] ✅ ${result.prompt}`);
                } else {
                    console.log(`  [${i + 1}] ❌ ${result.prompt} - ${result.error}`);
                }
            });
            return response.data.results;
        }
    } catch (error) {
        console.error('❌ Batch generation failed:', error.response?.data?.error || error.message);
        throw error;
    }
}

async function deleteVideo(filename) {
    try {
        console.log(`\n🗑️  Deleting video: ${filename}`);
        
        const response = await axios.delete(
            `${API_BASE_URL}/ai/videos/${filename}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        if (response.data.success) {
            console.log('✅ Video deleted successfully');
            return response.data;
        }
    } catch (error) {
        console.error('❌ Delete failed:', error.response?.data?.error || error.message);
        throw error;
    }
}

async function runTests() {
    try {
        console.log('🚀 Starting Video Generation Tests\n');
        console.log('=' .repeat(50));

        // Login first
        await login();

        // Test 1: Single video generation
        console.log('\n📝 Test 1: Single Video Generation');
        console.log('-'.repeat(50));
        const video1 = await generateSingleVideo('A man riding a bike on a mountain road, cinematic, realistic');

        // Test 2: Another single video
        console.log('\n📝 Test 2: Another Single Video');
        console.log('-'.repeat(50));
        const video2 = await generateSingleVideo('A cat playing with a ball in a sunny garden');

        // Test 3: Batch generation
        console.log('\n📝 Test 3: Batch Video Generation');
        console.log('-'.repeat(50));
        const batchPrompts = [
            'A car driving through a city street',
            'A person running on a beach at sunset'
        ];
        const videos = await generateBatchVideos(batchPrompts);

        console.log('\n' + '='.repeat(50));
        console.log('✅ All tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    console.log('💡 Note: Make sure the server is running on http://localhost:3000');
    runTests();
}

module.exports = {
    login,
    generateSingleVideo,
    generateBatchVideos,
    deleteVideo
};
