# 🎨 Stable Diffusion API Integration Guide

Complete setup for using Stable Diffusion WebUI in your personal AI projects.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Options](#architecture-options)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Testing](#testing)
5. [Integration Examples](#integration-examples)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- ✅ Python 3.10.6 installed
- ✅ Stable Diffusion WebUI installed (AUTOMATIC1111)
- ✅ API enabled in `webui-user.bat`

### Start Stable Diffusion with API
```bash
.\webui-user.bat
```

The API will be available at: `http://127.0.0.1:7860`

### Test API is Working
Open browser: `http://127.0.0.1:7860/docs`

You should see Swagger API documentation.

---

## 🏗️ Architecture Options

### Option 1: Direct Frontend → SD API (Simple)
```
Frontend (HTML/JS)
    ↓
Stable Diffusion API (localhost:7860)
```
**Best for:** Learning, prototypes, local projects  
**Example:** `frontend_example.html`

### Option 2: Frontend → Backend → SD API (Production)
```
Frontend (React/HTML)
    ↓
Backend (Node.js/Python/Java)
    ↓
Stable Diffusion API (localhost:7860 or remote)
```
**Best for:** Real projects, authentication, file management  
**Example:** `node_backend_example.js`

### Option 3: Cloud Deployment
```
Frontend (Vercel/Netlify)
    ↓
Backend (AWS/Azure/Railway)
    ↓
Stable Diffusion (Cloud GPU Server)
```
**Best for:** Production apps with many users

---

## 🔧 Step-by-Step Setup

### Step 1: Enable API in Stable Diffusion

✅ **Already configured!** Your `webui-user.bat` has `--api` flag enabled.

Verify by checking the file:
```batch
set COMMANDLINE_ARGS=--skip-torch-cuda-test --no-half --precision full --use-cpu all --api
```

### Step 2: Start Stable Diffusion
```bash
.\webui-user.bat
```

Wait for:
```
Running on local URL: http://127.0.0.1:7860
```

### Step 3: Test Connection

#### Python Test:
```bash
python test_sd_api.py
```

Expected output:
```
✅ API Connection: SUCCESS
✅ Available Models: 1
🎨 Generating image...
✅ Image saved: test_output_20231213_170530.png
🎉 All tests passed!
```

#### Manual Browser Test:
Open: `http://127.0.0.1:7860/docs`

---

## 🧪 Testing

### Test 1: Python API Test
```bash
python test_sd_api.py
```

This script:
- Checks API connection
- Generates a test image
- Saves it to your folder

### Test 2: Frontend Demo (No Backend Required)
```bash
# Just open the file in browser:
start frontend_example.html
```

This will:
- Connect directly to SD API
- Show a beautiful UI
- Generate images in real-time

### Test 3: Node.js Backend (Optional)
```bash
# First install dependencies:
npm init -y
npm install express node-fetch@2 cors

# Run the backend:
node node_backend_example.js
```

Open: `http://localhost:3000/api/health`

---

## 📚 Integration Examples

### Python Integration
```python
import requests
import base64

url = "http://127.0.0.1:7860/sdapi/v1/txt2img"

payload = {
    "prompt": "a futuristic AI robot",
    "steps": 20,
    "width": 512,
    "height": 512
}

response = requests.post(url, json=payload)
result = response.json()

# Save image
image_base64 = result["images"][0]
with open("output.png", "wb") as f:
    f.write(base64.b64decode(image_base64))
```

### JavaScript/Node.js Integration
```javascript
const fetch = require('node-fetch');
const fs = require('fs');

const response = await fetch("http://127.0.0.1:7860/sdapi/v1/txt2img", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "cyberpunk city",
    steps: 20,
    width: 512,
    height: 512
  })
});

const data = await response.json();
fs.writeFileSync("image.png", Buffer.from(data.images[0], "base64"));
```

### Frontend (React/HTML) Integration
```javascript
async function generateImage(prompt) {
  const response = await fetch("http://127.0.0.1:7860/sdapi/v1/txt2img", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt,
      steps: 20,
      width: 512,
      height: 512
    })
  });

  const data = await response.json();
  const imageBase64 = data.images[0];
  
  // Display in <img> tag
  document.getElementById("myImage").src = "data:image/png;base64," + imageBase64;
}
```

---

## 🔥 Common API Endpoints

### Text-to-Image (Generate Image)
```
POST http://127.0.0.1:7860/sdapi/v1/txt2img
```

Body:
```json
{
  "prompt": "your text here",
  "negative_prompt": "blurry, low quality",
  "steps": 20,
  "width": 512,
  "height": 512,
  "cfg_scale": 7,
  "sampler_name": "Euler a",
  "seed": -1
}
```

### Get Available Models
```
GET http://127.0.0.1:7860/sdapi/v1/sd-models
```

### Get Generation Progress
```
GET http://127.0.0.1:7860/sdapi/v1/progress
```

### Image-to-Image
```
POST http://127.0.0.1:7860/sdapi/v1/img2img
```

---

## 🎯 Real-World Project Ideas

### 1. Discord Bot
Generate images from Discord commands:
```
!generate a cute cat wearing a wizard hat
```

### 2. Website Image Generator
Add AI image generation to your portfolio/blog:
- User enters prompt
- Backend calls SD API
- Display generated image

### 3. Mobile App Backend
- Flutter/React Native frontend
- Node.js/Python backend with SD API
- Save images to cloud storage

### 4. Social Media Content Creator
- Bulk generate images
- Apply styles/filters
- Auto-post to Instagram/Twitter

### 5. Game Asset Generator
- Generate textures
- Create character portraits
- Design environment concepts

---

## ⚙️ Performance Tips

### For CPU (Your Current Setup)
- **Steps:** 15-25 (lower = faster)
- **Size:** 512×512 (smaller = faster)
- **Sampler:** Euler a or DPM++ 2M (fastest)
- **Batch:** Generate 1 at a time

Expected time: **2-5 minutes per image**

### If You Get an NVIDIA GPU
Update `webui-user.bat`:
```batch
set COMMANDLINE_ARGS=--api --xformers --opt-sdp-attention
```

Expected time: **5-10 seconds per image** 🚀

---

## 🛠️ Troubleshooting

### API Connection Failed
**Problem:** Cannot connect to `http://127.0.0.1:7860`

**Solution:**
1. Make sure WebUI is running: `.\webui-user.bat`
2. Check for "Running on local URL: http://127.0.0.1:7860"
3. Verify `--api` flag is in COMMANDLINE_ARGS

### CORS Errors (Browser)
**Problem:** Frontend can't call API due to CORS

**Solution:**
Add `--cors-allow-origins=*` to COMMANDLINE_ARGS:
```batch
set COMMANDLINE_ARGS=--api --cors-allow-origins=*
```

### Slow Generation
**Problem:** Images take 5+ minutes

**Solution:**
- ✅ Normal for CPU mode
- Reduce steps to 15-20
- Use 512×512 size
- Close other applications
- Consider getting NVIDIA GPU

### Out of Memory
**Problem:** Generation crashes

**Solution:**
Add `--lowvram` or `--medvram`:
```batch
set COMMANDLINE_ARGS=--api --lowvram
```

---

## 📖 API Documentation

Full API docs: `http://127.0.0.1:7860/docs`

Key parameters:
- `prompt` - What you want to generate
- `negative_prompt` - What to avoid
- `steps` - Quality (15-30 recommended)
- `width/height` - Image size (512, 768, 1024)
- `cfg_scale` - Prompt strength (7-12)
- `sampler_name` - Algorithm (Euler a, DPM++ 2M)
- `seed` - Reproducibility (-1 for random)

---

## 🎓 Next Steps

1. ✅ Test `python test_sd_api.py`
2. ✅ Open `frontend_example.html` in browser
3. ✅ Generate your first AI image
4. 📚 Read API docs at `/docs` endpoint
5. 🚀 Integrate into your project
6. 🎨 Experiment with prompts

---

## 📞 Support

- **API Docs:** http://127.0.0.1:7860/docs
- **AUTOMATIC1111 Wiki:** https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki
- **Prompt Guide:** https://prompthero.com/stable-diffusion-prompt-guide

---

## 🎉 You're Ready!

Your Stable Diffusion API is configured and ready to use in your personal AI projects.

**Quick test:**
```bash
python test_sd_api.py
```

Enjoy creating! 🚀
