const express = require('express');
const router = express.Router();
const multer = require('multer');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { auth, optionalAuth } = require('../middleware/auth');

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

// POST /api/ai/speech-to-text - Transcribe audio using Groq Whisper API (requires authentication)
router.post('/speech-to-text', auth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const audioPath = req.file.path;
        console.log('🎤 Transcribing audio:', audioPath);

        // Get the Groq client from services
        const Groq = require('groq-sdk');
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });

        try {
            // Transcribe using Groq Whisper API
            const transcription = await groq.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: "whisper-large-v3",
            });

            // Clean up audio file
            try {
                fs.unlinkSync(audioPath);
            } catch (err) {
                console.error('Error deleting audio file:', err);
            }

            console.log('✅ Transcription successful:', transcription.text);

            res.json({
                success: true,
                text: transcription.text,
                language: transcription.language || 'en',
                provider: 'groq'
            });

        } catch (groqError) {
            console.error('Groq transcription error:', groqError.message);
            
            // Fallback: Try Hugging Face API
            console.log('🔄 Falling back to Hugging Face API...');
            const hf = new (require('@huggingface/inference')).HfInference(process.env.HUGGINGFACE_API_KEY);
            
            try {
                const audioBuffer = fs.readFileSync(audioPath);
                const result = await hf.automaticSpeechRecognition({
                    model: "openai/whisper-small.en",
                    data: audioBuffer,
                });

                // Clean up audio file
                try {
                    fs.unlinkSync(audioPath);
                } catch (err) {
                    console.error('Error deleting audio file:', err);
                }

                console.log('✅ Hugging Face transcription successful:', result.text);

                res.json({
                    success: true,
                    text: result.text,
                    language: 'en',
                    provider: 'huggingface'
                });

            } catch (hfError) {
                console.error('Hugging Face fallback also failed:', hfError.message);
                
                // Clean up audio file
                try {
                    fs.unlinkSync(audioPath);
                } catch (err) {
                    console.error('Error deleting audio file:', err);
                }

                res.status(500).json({ 
                    error: 'Transcription failed', 
                    details: `Groq: ${groqError.message} | Hugging Face: ${hfError.message}`,
                    troubleshooting: [
                        '✓ Ensure GROQ_API_KEY is set in .env',
                        '✓ Ensure HUGGINGFACE_API_KEY is set in .env',
                        '✓ Check that audio file is valid WAV/MP3 format',
                        '✓ Try uploading a shorter audio file (< 5 minutes)'
                    ]
                });
            }
        }

    } catch (error) {
        console.error('Speech-to-text error:', error);
        
        // Clean up audio file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error deleting audio file:', err);
            }
        }
        
        res.status(500).json({ 
            error: 'Transcription failed', 
            message: error.message,
            troubleshooting: [
                '✓ Ensure audio file is provided',
                '✓ Check file format (WAV, MP3, M4A, OGG, WEBM)',
                '✓ Verify API keys are correct',
                '✓ Check audio file size (max 10MB)'
            ]
        });
    }
});

// POST /api/ai/generate-image - Generate image using Hugging Face with Stable Diffusion fallback (requires authentication)
router.post('/generate-image', auth, async (req, res) => {
    try {
        const { prompt, width, height, steps, negativePrompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Get user ID from authenticated request
        const userId = req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in request' });
        }

        console.log(`🎨 Generating image for user ${userId} with prompt:`, prompt);

        // Import image service
        const imageService = require('../services/imageService');

        // Generate image with automatic fallback
        const result = await imageService.generateImage(prompt, {
            width,
            height,
            steps,
            negativePrompt
        });

        // Save image to user's directory
        const savedImage = await imageService.saveImage(result.buffer, userId);

        console.log(`✅ Image generated for user ${userId} using ${result.provider}:`, savedImage.filename);
        console.log('📁 Image saved to:', savedImage.filepath);

        res.json({
            success: true,
            imageUrl: savedImage.url,
            filename: savedImage.filename,
            prompt,
            userId: userId.toString(),
            provider: result.provider,
            model: result.model,
            processingTime: result.processingTime
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            error: 'Image generation failed', 
            message: error.message 
        });
    }
});

// GET /api/ai/images/:userId/:filename - Serve user-specific generated image (requires authentication)
router.get('/images/:userId/:filename', auth, (req, res) => {
    try {
        const requestedUserId = req.params.userId;
        const filename = req.params.filename;
        const currentUserId = req.user?.id || req.user?._id;

        // Security: Only allow users to access their own images
        if (requestedUserId !== currentUserId?.toString()) {
            console.warn(`🚫 Access denied - User ${currentUserId} tried to access images of user ${requestedUserId}`);
            return res.status(403).json({ error: 'Access denied - you can only access your own images' });
        }

        const filepath = path.resolve(__dirname, `../uploads/images/user-${requestedUserId}`, filename);
        
        console.log(`🖼️  User ${currentUserId} requesting image:`, filename);
        console.log('📂 Full path:', filepath);
        
        // Security check - ensure file is in user's images directory
        const userImageDir = path.resolve(__dirname, `../uploads/images/user-${requestedUserId}`);
        if (!filepath.startsWith(userImageDir)) {
            console.warn('🚫 Access denied - path outside user directory');
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(filepath)) {
            console.warn('⚠️  Image file not found:', filepath);
            return res.status(404).json({ error: 'Image not found' });
        }
        
        console.log(`✅ Serving image for user ${currentUserId}:`, filename);
        res.type('image/png');
        res.sendFile(filepath);
    } catch (error) {
        console.error('❌ Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image', message: error.message });
    }
});

// Fallback: GET /api/ai/images/:filename - Legacy endpoint (kept for backward compatibility)
router.get('/images/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.resolve(__dirname, '../uploads/images', filename);
        
        console.log('🖼️  Requesting image (legacy):', filename);
        console.log('📂 Full path:', filepath);
        
        // Security check - ensure file is in uploads/images directory
        const uploadsDir = path.resolve(__dirname, '../uploads/images');
        if (!filepath.startsWith(uploadsDir)) {
            console.warn('🚫 Access denied - path outside uploads directory');
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(filepath)) {
            console.warn('⚠️  Image file not found:', filepath);
            return res.status(404).json({ error: 'Image not found' });
        }
        
        console.log('✅ Serving image:', filename);
        res.type('image/png');
        res.sendFile(filepath);
    } catch (error) {
        console.error('❌ Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image', message: error.message });
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

// POST /api/conversations/:id/generate-title - Generate a title for a conversation
router.post('/conversations/:id/generate-title', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const Conversation = require('../models/Conversation');
        const Message = require('../models/Message');

        const conversation = await Conversation.findById(id).populate('messages');
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const aiService = require('../services/aiService');
        const newTitle = await aiService.generateTitleForConversation(conversation.messages);

        conversation.title = newTitle;
        await conversation.save();

        res.json({ success: true, newTitle });
    } catch (error) {
        console.error('Error generating title:', error);
        res.status(500).json({ error: 'Failed to generate title' });
    }
});

// POST /api/ai/generate - Generate AI response without saving to conversations
// Used for modes like Imagine, Labs, Library where responses shouldn't be saved to sidebar
router.post('/generate', async (req, res) => {
    try {
        const { message, history, responseType } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const aiService = require('../services/aiService');
        
        // Get userId if available (from auth header)
        const userId = req.headers['user-id'] || (req.user ? req.user._id : null);
        
        // Generate response using AI service with personalized context
        // This doesn't save anything to the database - just returns the response
        const result = await aiService.generateResponse(
            message, 
            history || [], 
            responseType || 'balanced',
            userId
        );

        res.json({
            success: true,
            content: result.content,
            metadata: result.metadata
        });
    } catch (error) {
        console.error('Error generating AI response:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate response: ' + error.message
        });
    }
});

// POST /api/ai/chat - Simple chat endpoint for quick AI responses
router.post('/chat', optionalAuth, async (req, res) => {
    try {
        const { prompt, conversationHistory } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        const aiService = require('../services/aiService');
        
        // Get userId if available
        const userId = req.user ? req.user._id : null;
        
        // Generate response using AI service with personalized context
        const result = await aiService.generateResponse(
            prompt, 
            conversationHistory || [], 
            'balanced',
            userId
        );

        res.json({
            success: true,
            reply: result.content,
            message: result.content,
            metadata: result.metadata
        });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate response: ' + error.message
        });
    }
});

// POST /api/ai/generate-video - Generate video from text prompt
router.post('/generate-video', optionalAuth, async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || prompt.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        // Validate prompt length
        if (prompt.length > 500) {
            return res.status(400).json({
                success: false,
                error: 'Prompt must be 500 characters or less'
            });
        }

        const videoService = require('../services/videoService');
        const userId = req.user?.id || req.userId;
        
        // Generate video using HuggingFace model
        const result = await videoService.generateVideo(prompt, userId);

        res.json({
            success: true,
            message: result.message,
            video: {
                url: result.videoUrl,
                filename: result.filename,
                prompt: result.prompt,
                duration: result.duration,
                size: result.size
            }
        });

    } catch (error) {
        console.error('Error generating video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate video: ' + error.message
        });
    }
});

// POST /api/ai/generate-videos-batch - Generate multiple videos
router.post('/generate-videos-batch', auth, async (req, res) => {
    try {
        const { prompts } = req.body;
        
        if (!Array.isArray(prompts) || prompts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Prompts array is required'
            });
        }

        if (prompts.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 10 videos per batch'
            });
        }

        const videoService = require('../services/videoService');
        const userId = req.user?.id || req.userId;
        
        // Generate videos using HuggingFace model
        const results = await videoService.generateVideoBatch(prompts, userId);

        const successCount = results.filter(r => r.success).length;

        res.json({
            success: true,
            message: `Generated ${successCount}/${prompts.length} videos`,
            results: results
        });

    } catch (error) {
        console.error('Error generating video batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate videos: ' + error.message
        });
    }
});

// DELETE /api/ai/videos/:filename - Delete a generated video
router.delete('/videos/:filename', auth, async (req, res) => {
    try {
        const { filename } = req.params;
        
        if (!filename) {
            return res.status(400).json({
                success: false,
                error: 'Filename is required'
            });
        }

        const videoService = require('../services/videoService');
        const userId = req.user?.id || req.userId;
        
        const result = await videoService.deleteVideo(filename, userId);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete video: ' + error.message
        });
    }
});

// GET /api/ai/my-images - Get all images for the authenticated user (requires authentication)
router.get('/my-images', auth, (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in request' });
        }

        const userImageDir = path.resolve(__dirname, `../uploads/images/user-${userId}`);
        
        console.log(`📸 Fetching images for user ${userId}`);
        console.log(`📂 Image directory: ${userImageDir}`);
        
        // Check if directory exists
        if (!fs.existsSync(userImageDir)) {
            console.log(`ℹ️  No images found for user ${userId} - directory does not exist`);
            return res.json({
                success: true,
                images: [],
                message: 'No images generated yet'
            });
        }
        
        // Read all image files in user directory
        const files = fs.readdirSync(userImageDir);
        console.log(`📸 Found ${files.length} images for user ${userId}`);
        
        const images = files.map(filename => {
            const filepath = path.join(userImageDir, filename);
            const stats = fs.statSync(filepath);
            
            return {
                filename: filename,
                url: `/uploads/images/user-${userId}/${filename}`,
                timestamp: stats.mtime.toISOString(),
                size: stats.size
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first
        
        res.json({
            success: true,
            images: images,
            count: images.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching user images:', error);
        res.status(500).json({ 
            error: 'Failed to fetch images', 
            message: error.message 
        });
    }
});

// DELETE /api/ai/images/:filename - Delete an image from user's library (requires authentication)
router.delete('/images/:filename', auth, (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const filename = req.params.filename;
        
        if (!userId) {
            return res.status(401).json({ error: 'User ID not found in request' });
        }
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        const filepath = path.resolve(__dirname, `../uploads/images/user-${userId}`, filename);
        const userImageDir = path.resolve(__dirname, `../uploads/images/user-${userId}`);
        
        // Security check - ensure file is in user's directory
        if (!filepath.startsWith(userImageDir)) {
            console.warn(`🚫 Access denied - User ${userId} tried to delete file outside their directory`);
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // Delete the file
        fs.unlinkSync(filepath);
        console.log(`🗑️  Image deleted for user ${userId}:`, filename);
        
        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Error deleting image:', error);
        res.status(500).json({ 
            error: 'Failed to delete image', 
            message: error.message 
        });
    }
});

// POST /api/ai/text-to-speech - Convert text to speech using Microsoft Edge TTS (FREE, No API Key!)
router.post('/text-to-speech', optionalAuth, async (req, res) => {
    try {
        const { text, voice = 'default', speed = 1.0 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (text.length > 5000) {
            return res.status(400).json({ error: 'Text is too long (max 5000 characters)' });
        }

        console.log('🎙️  Generating speech with Microsoft Edge TTS (FREE)...');
        console.log('📝 Text length:', text.length, 'characters');

        // Create uploads directory for audio files
        const audioDir = path.join(__dirname, '..', 'uploads', 'podcasts');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `podcast_${timestamp}.mp3`;
        const outputPath = path.join(audioDir, filename);

        // Escape text for command line
        const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');

        // Voice mapping (choose from multiple voices)
        const voiceMap = {
            'default': 'en-US-AvaNeural',
            'male': 'en-US-GuyNeural',
            'female': 'en-US-JennyNeural',
            'friendly': 'en-US-AriaNeural'
        };
        const selectedVoice = voiceMap[voice] || voiceMap['default'];

        // Determine edge-tts path
        const edgeTtsPath = path.join(__dirname, '..', '.venv', 'Scripts', 'edge-tts.exe');
        const pythonPath = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
        
        console.log('🔍 Checking TTS paths...');
        console.log('edge-tts path:', edgeTtsPath);
        console.log('python path:', pythonPath);

        // Check if edge-tts is available
        let usePython = false;
        if (!fs.existsSync(edgeTtsPath)) {
            console.log('⚠️  edge-tts.exe not found, will use python -m edge_tts');
            if (!fs.existsSync(pythonPath)) {
                console.error('❌ Neither edge-tts.exe nor python found');
                return res.status(500).json({ 
                    error: 'Edge-TTS not installed or accessible',
                    message: 'Please install Edge-TTS: pip install edge-tts',
                    instructions: 'Run: pip install edge-tts in your virtual environment'
                });
            }
            usePython = true;
        }

        // Generate audio using Edge TTS
        let ttsCommand;
        if (usePython) {
            ttsCommand = `"${pythonPath}" -m edge_tts --text "${escapedText}" --write-media "${outputPath}" --voice "${selectedVoice}"`;
        } else {
            ttsCommand = `"${edgeTtsPath}" --text "${escapedText}" --write-media "${outputPath}" --voice "${selectedVoice}"`;
        }
        
        console.log('🔄 Running TTS command...');
        console.log('Command:', ttsCommand.substring(0, 100) + '...');
        
        try {
            const { stdout, stderr } = await execPromise(ttsCommand, {
                timeout: 90000, // 90 second timeout
                maxBuffer: 20 * 1024 * 1024 // 20MB buffer
            });
            
            if (stdout) {
                console.log('TTS stdout:', stdout.substring(0, 200));
            }
            if (stderr) {
                console.log('TTS stderr:', stderr.substring(0, 200));
            }
            
            console.log('✅ Audio generation command completed');
        } catch (execError) {
            console.error('❌ TTS execution error:', execError.message);
            console.error('❌ Error code:', execError.code);
            console.error('❌ stderr:', execError.stderr?.substring(0, 500));
            throw new Error('TTS generation failed: ' + execError.message);
        }

        // Check if file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('Audio file was not generated');
        }

        const audioBuffer = fs.readFileSync(outputPath);
        
        // Set proper headers for audio streaming
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Content-Disposition': `attachment; filename="podcast_${timestamp}.mp3"`
        });

        // Send the audio data
        res.send(audioBuffer);
        
        console.log('✅ Audio sent to client');

        // Clean up the file after a delay (give time for download)
        setTimeout(() => {
            try {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                    console.log('🗑️  Cleaned up temporary audio file');
                }
            } catch (cleanupError) {
                console.error('⚠️  Cleanup error:', cleanupError.message);
            }
        }, 5000); // 5 second delay

    } catch (error) {
        console.error('❌ Error generating speech:', error.message);
        console.error('❌ Full error:', error);
        res.status(500).json({ 
            error: 'Failed to generate speech',
            message: error.message,
            details: error.stack,
            tip: 'Make sure Edge-TTS is installed: pip install edge-tts'
        });
    }
});

module.exports = router;
