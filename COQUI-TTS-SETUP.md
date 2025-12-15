# 🎙️ Local TTS Setup Guide - Coqui TTS (No API Keys!)

## Overview
This guide will help you install **Coqui TTS** - a completely **FREE** and **LOCAL** text-to-speech system. No API keys, no cloud services, no costs!

## ✨ Benefits
- ✅ **100% Free** - No API costs
- ✅ **Privacy** - Everything runs locally
- ✅ **Offline** - Works without internet
- ✅ **No API Keys** - Zero configuration needed
- ✅ **High Quality** - Natural-sounding voices

---

## 📦 Installation

### Windows

#### Step 1: Install Python (if not already installed)
1. Download Python from [python.org](https://www.python.org/downloads/)
2. **Important**: Check "Add Python to PATH" during installation
3. Verify installation:
```bash
python --version
```

#### Step 2: Install Coqui TTS
Open Command Prompt or PowerShell:
```bash
pip install TTS
```

Or if using Python 3 specifically:
```bash
pip3 install TTS
```

#### Step 3: Verify Installation
```bash
tts --help
```

You should see the TTS command help text.

### macOS/Linux

#### Step 1: Ensure Python 3 is installed
```bash
python3 --version
```

#### Step 2: Install Coqui TTS
```bash
pip3 install TTS
```

Or using sudo if needed:
```bash
sudo pip3 install TTS
```

#### Step 3: Verify Installation
```bash
tts --help
```

---

## 🚀 Quick Test

Test TTS from command line:
```bash
tts --text "Hello! This is a test podcast." --out_path test.wav
```

This will create `test.wav` in your current directory.

---

## 🎯 Using with Your App

Once installed, the podcast feature will automatically use Coqui TTS:

1. **Start your server**:
   ```bash
   node server.js
   ```

2. **Open browser**:
   ```
   http://localhost:3000/copilot-standalone.html
   ```

3. **Create a podcast**:
   - Click "Create a podcast"
   - Enter title and script
   - Click "Generate Podcast"
   - ✅ Audio generated locally!

---

## 🔧 Troubleshooting

### "tts: command not found"
**Solution**: Ensure Python Scripts folder is in PATH
- Windows: `C:\Users\YourName\AppData\Local\Programs\Python\Python3X\Scripts`
- Add to PATH in Environment Variables

### "pip is not recognized"
**Solution**: Reinstall Python and check "Add to PATH"

### Permission errors on macOS/Linux
**Solution**: Use `sudo` or install to user directory:
```bash
pip3 install --user TTS
```

### Import errors during installation
**Solution**: Update pip first:
```bash
python -m pip install --upgrade pip
pip install TTS
```

### "No module named '_ctypes'" error
**Solution** (Ubuntu/Debian):
```bash
sudo apt-get install libffi-dev
pip3 install TTS
```

---

## 📊 Available Models

Coqui TTS comes with multiple pre-trained models:

### Fast Models (Recommended for podcast)
- `tts_models/en/ljspeech/tacotron2-DDC` ⚡ (Default, very fast)
- `tts_models/en/ljspeech/fast_pitch`

### High Quality Models
- `tts_models/en/ljspeech/glow-tts`
- `tts_models/en/vctk/vits`

### Multi-language Support
- Over 20 languages available!
- List all models: `tts --list_models`

---

## 🎨 Advanced Usage (Optional)

### Change Voice Model
Edit `routes/ai.js` line ~665:
```javascript
const ttsCommand = `tts --text "${escapedText}" --out_path "${outputPath}" --model_name "tts_models/en/ljspeech/glow-tts"`;
```

### List All Available Models
```bash
tts --list_models
```

### Use Different Speaker (Multi-speaker models)
```bash
tts --text "Hello" --model_name "tts_models/en/vctk/vits" --speaker_idx "p225" --out_path output.wav
```

---

## 💡 Performance Tips

### First Run is Slow
- First podcast generation takes 20-60 seconds (downloading models)
- Subsequent generations are much faster (5-10 seconds)

### Speed Up Generation
1. Use faster models (tacotron2-DDC)
2. Keep scripts under 500 words
3. Model caching speeds up repeat uses

### Reduce Disk Usage
- Models are cached in `~/.local/share/tts/` (Linux/Mac)
- Or `C:\Users\YourName\.local\share\tts\` (Windows)
- You can delete unused models to save space

---

## 🌟 Alternative Local TTS Options

If Coqui TTS doesn't work for you:

### 1. **Piper TTS** (Lightest, Fastest)
```bash
# Download binary from: https://github.com/rhasspy/piper
# Very fast, minimal setup
```

### 2. **Bark** (Most Natural)
```bash
pip install git+https://github.com/suno-ai/bark.git
# Best quality but slower, needs GPU for speed
```

### 3. **Tortoise TTS** (High Quality)
```bash
pip install tortoise-tts
# Excellent quality, but very slow without GPU
```

---

## 📚 Resources

- **Coqui TTS GitHub**: https://github.com/coqui-ai/TTS
- **Documentation**: https://tts.readthedocs.io/
- **Model Zoo**: https://github.com/coqui-ai/TTS/wiki/Released-Models

---

## ✅ Installation Checklist

- [ ] Python installed and in PATH
- [ ] `pip` working correctly
- [ ] Coqui TTS installed (`pip install TTS`)
- [ ] `tts --help` command works
- [ ] Test audio generated successfully
- [ ] Server running (`node server.js`)
- [ ] Podcast feature tested

---

## 🎉 Success!

Once installed, you can:
- ✅ Generate unlimited podcasts for FREE
- ✅ No API keys or subscriptions needed
- ✅ Complete privacy - everything local
- ✅ Works offline
- ✅ High-quality natural voices

**Need Help?** Open an issue or check the Coqui TTS documentation!
