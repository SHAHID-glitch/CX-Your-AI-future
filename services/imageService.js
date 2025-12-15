const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ImageService {
    constructor() {
        // Initialize Hugging Face client
        this.hfClient = null;
        if (process.env.HUGGINGFACE_API_KEY) {
            try {
                this.hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
                console.log('🎨 Hugging Face Image Service initialized');
            } catch (error) {
                console.warn('⚠️  Hugging Face initialization failed:', error.message);
            }
        }

        // Stable Diffusion local API configuration
        this.sdApiUrl = process.env.SD_API_URL || 'http://127.0.0.1:7860';
        this.sdEnabled = process.env.SD_ENABLED !== 'false'; // Enabled by default
        
        // Default models
        this.hfModel = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
        
        console.log(`🖼️  Image Service initialized:`);
        console.log(`   ✓ Primary: Hugging Face ${this.hfClient ? '✅' : '❌'}`);
        console.log(`   ✓ Fallback: Stable Diffusion (${this.sdApiUrl}) ${this.sdEnabled ? '✅' : '⚠️  Disabled'}`);
    }

    /**
     * Generate image with automatic fallback
     * Tries Hugging Face first, falls back to Stable Diffusion if it fails
     */
    async generateImage(prompt, options = {}) {
        const startTime = Date.now();
        let lastError = null;

        // Try Hugging Face first
        if (this.hfClient) {
            try {
                console.log('🎨 Attempting image generation with Hugging Face...');
                const result = await this.generateWithHuggingFace(prompt, options);
                const processingTime = Date.now() - startTime;
                
                console.log(`✅ Hugging Face image generated successfully in ${processingTime}ms`);
                
                return {
                    ...result,
                    provider: 'huggingface',
                    model: this.hfModel,
                    processingTime
                };
            } catch (error) {
                console.error('❌ Hugging Face image generation failed:', error.message);
                lastError = error;
            }
        } else {
            console.log('⚠️  Hugging Face client not available');
        }

        // Fallback to Stable Diffusion
        if (this.sdEnabled) {
            try {
                console.log('🔄 Falling back to Stable Diffusion local API...');
                const result = await this.generateWithStableDiffusion(prompt, options);
                const processingTime = Date.now() - startTime;
                
                console.log(`✅ Stable Diffusion image generated successfully in ${processingTime}ms`);
                
                return {
                    ...result,
                    provider: 'stable-diffusion',
                    model: 'stable-diffusion-local',
                    processingTime
                };
            } catch (error) {
                console.error('❌ Stable Diffusion image generation failed:', error.message);
                lastError = error;
            }
        } else {
            console.log('⚠️  Stable Diffusion fallback is disabled');
        }

        // Both failed
        throw new Error(
            `Image generation failed with all providers. ` +
            `Last error: ${lastError?.message || 'Unknown error'}. ` +
            `Troubleshooting: ` +
            (this.hfClient ? '' : '✗ HUGGINGFACE_API_KEY not set. ') +
            (this.sdEnabled ? `✗ Check if Stable Diffusion is running at ${this.sdApiUrl}. ` : '✗ SD_ENABLED is false. ')
        );
    }

    /**
     * Generate image using Hugging Face API
     */
    async generateWithHuggingFace(prompt, options = {}) {
        const imageBlob = await this.hfClient.textToImage({
            model: options.model || this.hfModel,
            inputs: prompt
        });

        const buffer = Buffer.from(await imageBlob.arrayBuffer());
        
        return {
            buffer,
            format: 'png',
            metadata: {
                prompt,
                model: options.model || this.hfModel
            }
        };
    }

    /**
     * Generate image using Stable Diffusion local API
     */
    async generateWithStableDiffusion(prompt, options = {}) {
        // First, check if SD API is accessible
        await this.checkStableDiffusionHealth();

        const payload = {
            prompt: prompt,
            negative_prompt: options.negativePrompt || "",
            steps: options.steps || 20,
            width: options.width || 512,
            height: options.height || 512,
            cfg_scale: options.cfgScale || 7,
            sampler_name: options.sampler || "Euler a",
            seed: options.seed || -1
        };

        console.log('📤 Sending request to Stable Diffusion API...');
        
        const response = await axios.post(
            `${this.sdApiUrl}/sdapi/v1/txt2img`,
            payload,
            {
                timeout: 120000, // 2 minutes timeout
                headers: { 'Content-Type': 'application/json' }
            }
        );

        if (!response.data || !response.data.images || response.data.images.length === 0) {
            throw new Error('Stable Diffusion API returned no images');
        }

        // SD returns base64 encoded image
        const imageBase64 = response.data.images[0];
        const buffer = Buffer.from(imageBase64, 'base64');

        return {
            buffer,
            format: 'png',
            metadata: {
                prompt,
                parameters: response.data.parameters || payload,
                info: response.data.info
            }
        };
    }

    /**
     * Check if Stable Diffusion API is running and accessible
     */
    async checkStableDiffusionHealth() {
        try {
            const response = await axios.get(`${this.sdApiUrl}/sdapi/v1/sd-models`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            throw new Error(
                `Stable Diffusion API is not accessible at ${this.sdApiUrl}. ` +
                `Make sure Stable Diffusion WebUI is running with --api flag. ` +
                `Error: ${error.message}`
            );
        }
    }

    /**
     * Save generated image to user's directory
     */
    async saveImage(buffer, userId, filename = null) {
        const userImageDir = path.resolve(__dirname, `../uploads/images/user-${userId}`);
        
        if (!fs.existsSync(userImageDir)) {
            fs.mkdirSync(userImageDir, { recursive: true });
        }

        const imageFilename = filename || `${Date.now()}-generated.png`;
        const filepath = path.join(userImageDir, imageFilename);
        
        fs.writeFileSync(filepath, buffer);
        
        console.log(`💾 Image saved: ${filepath}`);
        
        return {
            filename: imageFilename,
            filepath,
            url: `/uploads/images/user-${userId}/${imageFilename}`
        };
    }

    /**
     * Get service status for diagnostics
     */
    getStatus() {
        return {
            huggingface: {
                available: !!this.hfClient,
                model: this.hfModel
            },
            stableDiffusion: {
                enabled: this.sdEnabled,
                url: this.sdApiUrl
            }
        };
    }
}

module.exports = new ImageService();
