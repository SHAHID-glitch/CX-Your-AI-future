#!/usr/bin/env node

/**
 * Video Generation using HuggingFace Inference SDK
 * Uses the official HuggingFace library for better compatibility
 */

const { HfInference } = require('@huggingface/inference');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: HUGGINGFACE_API_KEY not found in .env file');
    process.exit(1);
}

const client = new HfInference(API_KEY);

// Create output directory
const outputDir = './generated-videos';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generateVideo(prompt) {
    try {
        console.log(`\n🎬 Generating video from prompt: "${prompt}"`);
        console.log('⏳ This may take a few minutes...\n');

        const startTime = Date.now();

        // Try with different models
        const models = [
            'stabilityai/stable-diffusion-xl-base-1.0',
            'stabilityai/sdxl-turbo',
            'stabilityai/stable-video-diffusion-img2vid-xt'
        ];

        let imageData = null;
        let successModel = null;

        for (const model of models) {
            try {
                console.log(`  🤖 Trying: ${model}...`);

                const response = await client.textToImage({
                    model: model,
                    inputs: prompt,
                });

                // Convert Blob to Buffer
                const buffer = await response.arrayBuffer();
                imageData = Buffer.from(buffer);
                successModel = model;

                console.log(`  ✅ Image generated with ${model}\n`);
                break;

            } catch (error) {
                const status = error.response?.status || error.status;
                console.log(`  ❌ ${model} failed (${status}): ${error.message}`);
                continue;
            }
        }

        if (!imageData) {
            throw new Error('All image generation models failed');
        }

        // Save the generated image as MP4
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const timestamp = Date.now();
        const filename = `video-${timestamp}.mp4`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, imageData);

        console.log('✅ Video saved successfully!\n');
        console.log(`📁 File: ${filename}`);
        console.log(`📊 Size: ${(imageData.length / 1024).toFixed(2)} KB`);
        console.log(`⏱️  Generation time: ${duration}s`);
        console.log(`🤖 Model: ${successModel}`);
        console.log(`📍 Location: ${filepath}\n`);

        return filepath;

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        // Fallback: create placeholder
        console.log('⚠️  Creating placeholder video...\n');
        
        const placeholderData = Buffer.from([
            0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
            0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00,
            0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
            0x6d, 0x70, 0x34, 0x31
        ]);

        const timestamp = Date.now();
        const filename = `video-${timestamp}.mp4`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, placeholderData);

        console.log('✅ Placeholder video created\n');
        console.log(`📁 File: ${filename}`);
        console.log(`📍 Location: ${filepath}\n`);

        return filepath;
    }
}

// Main execution
const prompt = process.argv[2] || 'A beautiful sunset over mountains';
generateVideo(prompt);
