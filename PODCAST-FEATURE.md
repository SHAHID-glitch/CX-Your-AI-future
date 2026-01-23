# 🎙️ Podcast Creation Feature

## Overview
The podcast creation feature allows users to generate AI-powered podcasts with customizable voices. Users can either write their own script or have AI generate one automatically. The feature uses Microsoft Edge TTS (Text-to-Speech) which is free and requires no API key!

## ⚙️ Setup Requirements

### Option 1: Full Podcast Features (Recommended)
To enable downloadable podcast generation with Microsoft Edge TTS:

1. **Install Python** (3.8 or higher)
   ```bash
   python --version  # Verify Python is installed
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv .venv
   ```

3. **Activate Virtual Environment**
   - Windows:
     ```bash
     .venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source .venv/bin/activate
     ```

4. **Install edge-tts**
   ```bash
   pip install edge-tts
   ```

5. **Verify Installation**
   ```bash
   edge-tts --help
   ```

For detailed setup instructions, see [EDGE-TTS-READY.md](./EDGE-TTS-READY.md)

### Option 2: Browser-Based TTS (Fallback)
If Python environment is not set up, the system will automatically offer to use your browser's built-in text-to-speech:
- ✅ Works immediately, no setup required
- ⚠️ Cannot download podcasts as audio files
- ⚠️ Quality depends on browser and OS

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
   - **Ava (Natural Female)**: Default voice, clear and professional
   - **Guy (Natural Male)**: Deep and authoritative
   - **Jenny (Friendly Female)**: Warm and conversational  
   - **Aria (Conversational)**: Natural and engaging
   - Powered by Microsoft Edge TTS - No API key required!
   - Free and unlimited usage

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
- Fallback to browser TTS when server TTS unavailable

### Backend (routes/ai.js)
- `/api/ai/text-to-speech` endpoint
- Microsoft Edge TTS via Python edge-tts package
- Returns audio as MP3
- Graceful error handling when Python environment not found

### Requirements
- **Python 3.8+** with edge-tts package (for downloadable podcasts)
- **OR** Modern web browser with Speech Synthesis API (for playback only)
- No API keys required!

### Audio Format
- **Output**: MP3 (audio/mpeg)
- **Quality**: High-quality natural speech
- **Engine**: Microsoft Edge TTS
- **Fallback**: Browser Speech Synthesis API

## Configuration

### Environment Variables
No API keys required! Just set up Python environment:

```env
# Optional: Adjust these if needed
MAX_FILE_SIZE=52428800  # 50MB for audio files
```

### Supported Text Length
- Maximum: 5000 characters per podcast
- For longer content, split into multiple podcasts

## Troubleshooting

### "Python environment not found"
**Solution 1: Set up Python (Recommended)**
1. Install Python 3.8 or higher
2. Create virtual environment: `python -m venv .venv`
3. Activate: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Linux/Mac)
4. Install edge-tts: `pip install edge-tts`
5. Restart the server

**Solution 2: Use Browser TTS (Immediate)**
- Click "Yes" when prompted to use browser text-to-speech
- You can listen to podcasts but cannot download them
- Works immediately without any setup

### "Failed to generate podcast audio"
- If using server TTS: Check Python environment is set up correctly
- If using browser TTS: Check browser audio permissions
- Check internet connection for AI script generation
- Try again after a few moments

### "openPodcastModal is not defined"  
- Ensure you're accessing via http://localhost:3000/copilot (not file://)
- Check browser console for JavaScript errors
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache and reload

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
- [ ] Cloud storage for podcasts

## Credits
- **Text-to-Speech**: Microsoft Edge TTS (Free, No API Key!)
- **AI Script Generation**: GPT-4 / Groq / OpenAI
- **UI Framework**: Custom CSS with Font Awesome icons
- **Fallback TTS**: Browser Speech Synthesis API

---

**Need Help?** 
- Check [EDGE-TTS-READY.md](./EDGE-TTS-READY.md) for Python setup
- See main documentation or contact support
- Report issues on GitHub
