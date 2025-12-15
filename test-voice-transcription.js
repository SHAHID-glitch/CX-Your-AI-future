require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');

/**
 * Test voice transcription with Groq and Hugging Face fallback
 * Usage: node test-voice-transcription.js <audio-file-path>
 */

async function transcribeAudio(audioPath) {
    try {
        // Check if file exists
        if (!fs.existsSync(audioPath)) {
            console.error('❌ Audio file not found:', audioPath);
            console.log('\n📝 Usage: node test-voice-transcription.js <audio-file-path>');
            console.log('   Example: node test-voice-transcription.js voice.wav');
            return;
        }

        const filename = path.basename(audioPath);
        const fileSize = fs.statSync(audioPath).size / 1024 / 1024; // MB
        
        console.log('\n🎤 Voice Transcription Test');
        console.log('════════════════════════════════');
        console.log(`📁 File: ${filename}`);
        console.log(`📊 Size: ${fileSize.toFixed(2)} MB`);
        
        // Verify API keys
        const hasGroqKey = !!process.env.GROQ_API_KEY;
        const hasHFKey = !!process.env.HUGGINGFACE_API_KEY;
        
        console.log(`\n🔑 API Keys:`);
        console.log(`   Groq: ${hasGroqKey ? '✅ Found' : '❌ Missing'}`);
        console.log(`   Hugging Face: ${hasHFKey ? '✅ Found' : '❌ Missing'}`);
        
        if (!hasGroqKey && !hasHFKey) {
            console.error('\n❌ No API keys configured!');
            console.log('💡 Add to .env file:');
            console.log('   GROQ_API_KEY=your_key_here');
            console.log('   HUGGINGFACE_API_KEY=your_key_here');
            return;
        }

        // Try Groq first
        if (hasGroqKey) {
            await transcribeWithGroq(audioPath);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function transcribeWithGroq(audioPath) {
    try {
        console.log('\n📡 Attempting Groq Whisper transcription...');
        console.log('   Model: whisper-large-v3');
        
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });

        const startTime = Date.now();
        
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-large-v3",
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n✅ Groq transcription successful! (${duration}s)`);
        console.log('\n📝 Transcribed Text:');
        console.log('────────────────────');
        console.log(transcription.text);
        console.log('────────────────────');
        
        // Save to file
        const outputFile = audioPath.replace(/\.[^.]+$/, '_transcription.txt');
        fs.writeFileSync(outputFile, transcription.text);
        console.log(`\n💾 Saved to: ${outputFile}`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Groq error: ${error.message}`);
        
        // Try fallback
        if (process.env.HUGGINGFACE_API_KEY) {
            console.log('\n🔄 Trying Hugging Face fallback...');
            return await transcribeWithHuggingFace(audioPath);
        }
        return false;
    }
}

async function transcribeWithHuggingFace(audioPath) {
    try {
        console.log('📡 Attempting Hugging Face transcription...');
        console.log('   Model: openai/whisper-small.en');
        
        const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
        const audioBuffer = fs.readFileSync(audioPath);
        
        const startTime = Date.now();
        
        const result = await hf.automaticSpeechRecognition({
            model: "openai/whisper-small.en",
            data: audioBuffer,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n✅ Hugging Face transcription successful! (${duration}s)`);
        console.log('\n📝 Transcribed Text:');
        console.log('────────────────────');
        console.log(result.text);
        console.log('────────────────────');
        
        // Save to file
        const outputFile = audioPath.replace(/\.[^.]+$/, '_transcription.txt');
        fs.writeFileSync(outputFile, result.text);
        console.log(`\n💾 Saved to: ${outputFile}`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Hugging Face error: ${error.message}`);
        return false;
    }
}

// Get audio file from command line or use default
const audioFile = process.argv[2] || 'voice.wav';
transcribeAudio(audioFile);
