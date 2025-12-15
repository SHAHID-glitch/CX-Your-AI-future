/**
 * Test Image Generation with Fallback
 * 
 * This script tests the image generation service with both providers
 */

require('dotenv').config();
const imageService = require('./services/imageService');
const fs = require('fs');
const path = require('path');

async function testImageGeneration() {
    console.log('🧪 Testing Image Generation Service\n');
    
    // Check service status
    console.log('📊 Service Status:');
    const status = imageService.getStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log('');
    
    // Test parameters
    const testPrompt = 'a beautiful sunset over mountains, digital art';
    const testUserId = 'test-user-123';
    
    console.log(`🎨 Generating test image with prompt: "${testPrompt}"\n`);
    
    try {
        // Generate image
        const startTime = Date.now();
        const result = await imageService.generateImage(testPrompt, {
            width: 512,
            height: 512,
            steps: 20
        });
        
        console.log(`\n✅ Image generated successfully!`);
        console.log(`   Provider: ${result.provider}`);
        console.log(`   Model: ${result.model}`);
        console.log(`   Processing Time: ${result.processingTime}ms`);
        console.log(`   Buffer Size: ${result.buffer.length} bytes`);
        
        // Save the test image
        const savedImage = await imageService.saveImage(result.buffer, testUserId, 'test-image.png');
        
        console.log(`\n💾 Image saved:`);
        console.log(`   Filename: ${savedImage.filename}`);
        console.log(`   Path: ${savedImage.filepath}`);
        console.log(`   URL: ${savedImage.url}`);
        
        console.log('\n🎉 Test completed successfully!');
        
        // Show the path to open the image
        console.log(`\n🖼️  To view the image, open:`);
        console.log(`   ${savedImage.filepath}`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\nTroubleshooting:');
        
        if (!process.env.HUGGINGFACE_API_KEY) {
            console.error('   ✗ HUGGINGFACE_API_KEY is not set in .env');
        }
        
        if (process.env.SD_ENABLED !== 'false') {
            console.error('   ✗ Check if Stable Diffusion is running at:', process.env.SD_API_URL || 'http://127.0.0.1:7860');
            console.error('   ✗ Visit http://127.0.0.1:7860/docs to verify SD API');
        }
        
        console.error('\n   See IMAGE-GENERATION-FALLBACK-SETUP.md for detailed setup instructions.');
    }
}

// Run the test
testImageGeneration();
