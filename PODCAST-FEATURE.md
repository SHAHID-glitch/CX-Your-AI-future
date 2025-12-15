# 🎙️ Podcast Creation Feature

## Overview
The podcast creation feature allows users to generate AI-powered podcasts with customizable voices and speaking speeds. Users can either write their own script or have AI generate one automatically.

## Features

### 1. **Easy Podcast Creation**
   - Click the "Create a podcast" button in the action grid
   - Enter a title and script
   - Choose voice and speaking speed
   - Generate with one click

### 2. **AI Script Generation**
   - If script is empty or too short, AI can automatically generate engaging content
   - Just provide a title or topic, and AI will create a full podcast script
   - Toggle the "Generate script with AI" checkbox to enable/disable

### 3. **Voice Options**
   - **SpeechT5 (Microsoft)**: Natural, high-quality voice powered by Microsoft's SpeechT5 TTS model
   - Powered by HuggingFace 🤗 - No OpenAI API key required!

### 4. **Podcast Management**
   - Play directly in the browser
   - Download as MP3 file
   - Share with others
   - Create multiple podcasts

## How to Use

### Quick Start
1. Open the application
2. Click "Create a podcast" button in the main action grid
3. Enter a podcast title
4. Either:
   - Write your own script, OR
   - Leave it empty and let AI generate content
5. Select your preferred voice model (SpeechT5 by Microsoft)
6. Click "Generate Podcast"
7. Wait for generation (script creation + audio synthesis)
8. Play, download, or share your podcast!

### Example Use Cases

#### 1. Educational Content
```
Title: Introduction to Machine Learning
Script: Let AI generate or write:
"Welcome to today's episode on machine learning fundamentals..."
```

#### 2. News Briefing
```
Title: Daily Tech News - December 2025
Script: Provide your news summary or let AI generate trending topics
```

#### 3. Story Narration
```
Title: The Mystery of the Old Manor
Script: Paste your story or let AI create one
```

#### 4. Product Reviews
```
Title: Review of the Latest Smartphone
Script: Your review content or AI-generated review
```

## Technical Details

### Frontend (copilot-standalone.html)
- Modal UI with form inputs
- Real-time character counter
- Audio player for playback
- Download and share functionality

### Backend (routes/ai.js)
- `/api/ai/text-to-speech` endpoint
- HuggingFace API integration
- Uses Microsoft's SpeechT5 TTS model
- Returns audio as FLAC stream

### API Requirements
- HuggingFace API key required (`HUGGINGFACE_API_KEY` in `.env`)
- Uses `microsoft/speecht5_tts` model
- Maximum text length: 5000 characters

### Audio Format
- **Output**: FLAC (audio/flac)
- **Quality**: High-quality TTS
- **Model**: Microsoft SpeechT5

## Configuration

### Environment Variables
```env
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### Supported Text Length
- Maximum: 5000 characters per podcast
- For longer content, split into multiple podcasts

## Troubleshooting

### "HuggingFace API key not configured"
- Add `HUGGINGFACE_API_KEY` to your `.env` file
- Get your free key from https://huggingface.co/settings/tokens
- Restart the server

### "Failed to generate podcast audio"
- Check internet connection
- Verify HuggingFace API key is valid
- The model may be loading (first request can take 20-30 seconds)
- Try again after a few moments

### Audio not playing
- Check browser audio permissions
- Try a different browser
- Verify audio file was generated successfully

## Browser Compatibility
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Mobile browsers (limited share functionality)

## Future Enhancements
- [ ] Background music support
- [ ] Multi-speaker conversations
- [ ] Voice cloning
- [ ] Podcast library/history
- [ ] Export to different formats (WAV, OGG)
- [ ] Podcast episode scheduling
- [ ] RSS feed generation
- [ ] Integration with podcast platforms

## Credits
- **Text-to-Speech**: HuggingFace API (Microsoft SpeechT5)
- **AI Script Generation**: GPT-4 / Groq
- **UI Framework**: Custom CSS with Font Awesome icons

---

**Need Help?** Check the main documentation or contact support.
