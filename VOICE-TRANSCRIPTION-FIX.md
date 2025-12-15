# Voice Transcription Troubleshooting Guide

## ✅ Quick Fix Checklist

### 1. **API Keys Configuration**
```env
# Add these to .env file
GROQ_API_KEY=your_groq_api_key_here
HUGGINGFACE_API_KEY=hf_your_actual_huggingface_api_key_here
```
- ✓ Both keys are already in your `.env` file
- ✓ No additional configuration needed

### 2. **Dependencies Check**
```bash
npm ls groq-sdk
npm ls @huggingface/inference
```

### 3. **Audio File Requirements**
- ✓ Supported formats: WAV, MP3, M4A, OGG, WEBM
- ✓ Max file size: 10MB
- ✓ Sample rate: 16kHz preferred (auto-converted if needed)
- ✓ Duration: Up to 25 minutes for Groq

---

## 🔧 Common Issues & Solutions

### Issue 1: "No audio file provided" Error
**Cause**: Audio file is not being sent in the request

**Solution**:
```javascript
// Correct way to send audio
const formData = new FormData();
formData.append('audio', audioFile); // Must be File or Blob

fetch('/api/ai/speech-to-text', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    },
    body: formData  // Use FormData, not JSON
});
```

### Issue 2: "GROQ_API_KEY is missing" Error
**Cause**: Environment variable not loaded properly

**Solution**:
```bash
# Restart the server
npm start

# Or manually check
node -e "require('dotenv').config(); console.log(process.env.GROQ_API_KEY)"
```

### Issue 3: "Transcription failed" with Groq
**Cause**: 
- Invalid audio format
- File too large
- API rate limit exceeded

**Solution**:
- Convert audio to WAV: `ffmpeg -i voice.mp3 voice.wav`
- Check file size: `ls -lh voice.wav`
- Wait 60 seconds before retrying (rate limit)

### Issue 4: "Automatic Speech Recognition not available"
**Cause**: Hugging Face model is loading or not cached

**Solution**:
```bash
# Pre-download the model (first run only)
node test-voice-transcription.js voice.wav

# Or try again in a few seconds (API warming up)
```

---

## 🚀 Testing Steps

### Step 1: Create Test Audio File
```bash
# Using ffmpeg to create a test audio
ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -q:a 9 -acodec libmp3lame voice.mp3

# Convert to WAV if needed
ffmpeg -i voice.mp3 voice.wav
```

### Step 2: Test with CLI Script
```bash
# Test Groq and Hugging Face
node test-voice-transcription.js voice.wav

# Expected output:
# ✅ Groq transcription successful!
# 📝 Transcribed Text: [your transcribed text]
# 💾 Saved to: voice_transcription.txt
```

### Step 3: Test via API
```bash
# Create multipart form data
curl -X POST http://localhost:3000/api/ai/speech-to-text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@voice.wav"

# Expected response:
# {
#   "success": true,
#   "text": "your transcribed text",
#   "language": "en",
#   "provider": "groq"
# }
```

### Step 4: Test in Frontend
```html
<form id="transcriptionForm">
  <input type="file" id="audioFile" accept="audio/*" required>
  <button type="submit">Transcribe</button>
  <div id="result"></div>
</form>

<script>
document.getElementById('transcriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = document.getElementById('audioFile').files[0];
  const formData = new FormData();
  formData.append('audio', file);
  
  try {
    const response = await fetch('/api/ai/speech-to-text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    document.getElementById('result').textContent = result.text;
  } catch (error) {
    console.error('Error:', error);
  }
});
</script>
```

---

## 📊 API Response Reference

### Success Response (200)
```json
{
  "success": true,
  "text": "the transcribed audio content",
  "language": "en",
  "provider": "groq"
}
```

### Error Response (500)
```json
{
  "error": "Transcription failed",
  "details": "Groq: ... | Hugging Face: ...",
  "troubleshooting": [
    "✓ Ensure GROQ_API_KEY is set in .env",
    "✓ Check that audio file is valid WAV/MP3 format",
    "..."
  ]
}
```

### Missing File (400)
```json
{
  "error": "No audio file provided"
}
```

---

## 🔗 API Fallback Strategy

1. **Primary**: Groq Whisper API (faster, more reliable)
2. **Fallback**: Hugging Face Automatic Speech Recognition
3. **Error Handling**: Clear error messages with troubleshooting steps

The system automatically tries Groq first, then falls back to Hugging Face if Groq fails.

---

## 🛠️ Manual Testing Commands

```bash
# 1. Test Groq API directly
node test-groq-speech.js

# 2. Test Hugging Face directly
node test-speech-to-text.js

# 3. Test the complete flow
node test-voice-transcription.js voice.wav

# 4. Start the server
npm start

# 5. Test the endpoint with curl
curl -X POST http://localhost:3000/api/ai/speech-to-text \
  -H "Authorization: Bearer token" \
  -F "audio=@voice.wav"
```

---

## 📝 Updated Files

- ✅ `/routes/ai.js` - Now uses Groq with Hugging Face fallback
- ✅ `test-voice-transcription.js` - New comprehensive test script
- ✅ All dependencies already configured in `.env`

---

## 🎯 Next Steps

1. **Create/obtain** an audio file (`.wav` or `.mp3`)
2. **Run** `node test-voice-transcription.js voice.wav`
3. **Verify** the output shows transcribed text
4. **Test** via the API endpoint
5. **Integrate** into your frontend

---

## 💡 Tips

- **Best Results**: Use clear speech in a quiet environment
- **Audio Format**: WAV works best, MP3/M4A are also supported
- **File Size**: Keep under 10MB (usually 1-5 minutes of audio)
- **Language**: Default is English (en), but Groq auto-detects
- **Caching**: First request may take longer as models load

---

## ❓ Still Having Issues?

1. Check API keys in `.env` file are correct
2. Verify audio file exists and is valid format
3. Check internet connection (APIs need connectivity)
4. Look at server console for detailed error messages
5. Try with a shorter audio file first
6. Restart the server after updating `.env`

