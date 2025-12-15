/**
 * Node.js Backend Example for Stable Diffusion API Integration
 * 
 * Setup:
 * 1. npm init -y
 * 2. npm install express node-fetch@2 cors
 * 3. node node_backend_example.js
 */

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SD_API_URL = "http://127.0.0.1:7860";

// Middleware
app.use(cors());
app.use(express.json());
app.use('/images', express.static('generated_images'));

// Create images directory if it doesn't exist
if (!fs.existsSync('generated_images')) {
    fs.mkdirSync('generated_images');
}

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
    try {
        const response = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`);
        if (response.ok) {
            res.json({ status: 'ok', message: 'Stable Diffusion API is running' });
        } else {
            res.status(500).json({ status: 'error', message: 'SD API not responding' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Cannot connect to SD API' });
    }
});

/**
 * Generate image endpoint
 * POST /api/generate
 * Body: { prompt: string, negative_prompt?: string, steps?: number, width?: number, height?: number }
 */
app.post('/api/generate', async (req, res) => {
    const { 
        prompt, 
        negative_prompt = "blurry, low quality, distorted",
        steps = 20,
        width = 512,
        height = 512,
        cfg_scale = 7,
        sampler_name = "Euler a"
    } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`🎨 Generating image: "${prompt}"`);

    try {
        // Call Stable Diffusion API
        const response = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                negative_prompt,
                steps,
                width,
                height,
                cfg_scale,
                sampler_name,
                seed: -1
            })
        });

        if (!response.ok) {
            throw new Error(`SD API returned ${response.status}`);
        }

        const data = await response.json();
        const imageBase64 = data.images[0];

        // Save image to file
        const filename = `image_${Date.now()}.png`;
        const filepath = path.join('generated_images', filename);
        
        fs.writeFileSync(filepath, Buffer.from(imageBase64, 'base64'));

        console.log(`✅ Image saved: ${filename}`);

        // Return image URL
        res.json({
            success: true,
            imageUrl: `/images/${filename}`,
            filename: filename,
            info: JSON.parse(data.info || '{}')
        });

    } catch (error) {
        console.error('❌ Generation error:', error);
        res.status(500).json({ 
            error: 'Image generation failed', 
            details: error.message 
        });
    }
});

/**
 * Get available models
 */
app.get('/api/models', async (req, res) => {
    try {
        const response = await fetch(`${SD_API_URL}/sdapi/v1/sd-models`);
        const models = await response.json();
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

/**
 * Get generation progress (useful for long generations)
 */
app.get('/api/progress', async (req, res) => {
    try {
        const response = await fetch(`${SD_API_URL}/sdapi/v1/progress`);
        const progress = await response.json();
        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('=' .repeat(60));
    console.log(`🚀 Node.js Backend Server running on http://localhost:${PORT}`);
    console.log('=' .repeat(60));
    console.log('');
    console.log('📡 Endpoints:');
    console.log(`   Health Check: GET  http://localhost:${PORT}/api/health`);
    console.log(`   Generate:     POST http://localhost:${PORT}/api/generate`);
    console.log(`   Models:       GET  http://localhost:${PORT}/api/models`);
    console.log(`   Progress:     GET  http://localhost:${PORT}/api/progress`);
    console.log('');
    console.log('📝 Example request:');
    console.log('   curl -X POST http://localhost:3000/api/generate \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"prompt": "a futuristic city"}\'');
    console.log('');
    console.log('⚠️  Make sure Stable Diffusion WebUI is running on port 7860');
});
