const express = require('express');
const router = express.Router();
const multer = require('multer');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');

// Configure multer for audio uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/audio';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /wav|mp3|m4a|ogg|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'));
        }
    }
});

// POST /api/ai/speech-to-text - Transcribe audio using Whisper (requires authentication)
router.post('/speech-to-text', auth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const { spawn } = require('child_process');
        const audioPath = req.file.path;
        const outputPath = audioPath.replace(path.extname(audioPath), '');

        console.log('🎤 Transcribing audio:', audioPath);

        // Run Whisper using Python
        const whisper = spawn('python', ['-m', 'whisper', audioPath, '--model', 'tiny', '--output_dir', path.dirname(audioPath), '--output_format', 'json']);

        let output = '';
        let errorOutput = '';

        whisper.stdout.on('data', (data) => {
            output += data.toString();
            console.log(data.toString());
        });

        whisper.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        whisper.on('close', async (code) => {
            // Clean up audio file
            try {
                fs.unlinkSync(audioPath);
            } catch (err) {
                console.error('Error deleting audio file:', err);
            }

            if (code !== 0) {
                console.error('Whisper error:', errorOutput);
                return res.status(500).json({ 
                    error: 'Transcription failed', 
                    details: errorOutput 
                });
            }

            try {
                // Read the JSON output
                const jsonPath = `${outputPath}.json`;
                const transcriptionData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                
                // Clean up JSON file
                fs.unlinkSync(jsonPath);

                res.json({
                    success: true,
                    text: transcriptionData.text,
                    language: transcriptionData.language,
                    segments: transcriptionData.segments
                });
            } catch (err) {
                console.error('Error reading transcription:', err);
                res.status(500).json({ 
                    error: 'Failed to read transcription results',
                    details: err.message
                });
            }
        });

    } catch (error) {
        console.error('Speech-to-text error:', error);
        res.status(500).json({ 
            error: 'Transcription failed', 
            message: error.message 
        });
    }
});

// POST /api/ai/generate-image - Generate image using Hugging Face (requires authentication)
router.post('/generate-image', auth, async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('🎨 Generating image for prompt:', prompt);

        const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

        const imageBlob = await hf.textToImage({
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: prompt
        });

        const buffer = Buffer.from(await imageBlob.arrayBuffer());
        
        // Save image
        const imageDir = './uploads/images';
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        const filename = `${Date.now()}-generated.png`;
        const filepath = path.join(imageDir, filename);
        fs.writeFileSync(filepath, buffer);

        console.log('✅ Image generated:', filename);

        res.json({
            success: true,
            imageUrl: `/uploads/images/${filename}`,
            filename,
            prompt
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: 'Image generation failed', 
            message: error.message 
        });
    }
});

// POST /api/ai/voice-chat - Chat using the main AI service (Azure OpenAI/Groq) (requires authentication)
router.post('/voice-chat', auth, async (req, res) => {
    try {
        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'No input text provided' });
        }

        console.log('🎙️ Voice chat input:', input);

        // Use the main AI service instead of Hugging Face
        const aiService = require('../services/aiService');
        
        // Generate response using the same AI service as text chat
        const result = await aiService.generateResponse(input, [], 'balanced');
        
        console.log('✅ Voice chat reply:', result.content);

        res.json({
            success: true,
            reply: result.content
        });

    } catch (error) {
        console.error('Voice chat error:', error);
        res.status(500).json({ 
            error: 'Voice chat failed', 
            message: error.message,
            reply: 'Sorry, I encountered an error. Please try again.'
        });
    }
});

module.exports = router;
