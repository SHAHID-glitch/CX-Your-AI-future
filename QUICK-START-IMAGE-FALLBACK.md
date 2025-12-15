# 🚀 Quick Start - Image Generation with Fallback

## ⚡ 3-Step Setup

### 1️⃣ Update .env
```env
HUGGINGFACE_API_KEY=hf_your_key_here
SD_ENABLED=true
SD_API_URL=http://127.0.0.1:7860
```

### 2️⃣ Start Stable Diffusion
```powershell
cd C:\Users\sahid\OneDrive\PROJECTS\Practice\stable-diffusion-webui-master\stable-diffusion-webui-master
.\webui-user.bat
```

### 3️⃣ Start Your Backend
```powershell
cd C:\Users\sahid\OneDrive\PROJECTS\Practice
node server.js
```

---

## 🧪 Test It

### Quick Test (Backend Only)
```powershell
node test-image-generation.js
```

### Test from Frontend
```javascript
fetch('/api/ai/generate-image', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
        prompt: 'a futuristic robot'
    })
})
.then(r => r.json())
.then(data => {
    console.log('Provider:', data.provider);
    document.getElementById('img').src = data.imageUrl;
});
```

---

## 🎯 How It Works

```
Request → Try HuggingFace ✅ Success? Return image
                          ❌ Failed? Try Stable Diffusion ✅ Return image
                                                        ❌ Return error
```

---

## 🔧 Configuration Presets

### Preset 1: Production (HF Primary)
```env
HUGGINGFACE_API_KEY=hf_...
SD_ENABLED=true
```
**Use Case**: Reliable cloud API with local fallback

### Preset 2: Development (SD Only)
```env
# HUGGINGFACE_API_KEY=  (comment out)
SD_ENABLED=true
```
**Use Case**: Free unlimited testing locally

### Preset 3: Cloud Only (HF Only)
```env
HUGGINGFACE_API_KEY=hf_...
SD_ENABLED=false
```
**Use Case**: No local server needed

---

## 📊 Monitor Which Provider is Used

Check your backend logs:
```
✅ Hugging Face image generated successfully in 4523ms
```
OR
```
🔄 Falling back to Stable Diffusion local API...
✅ Stable Diffusion image generated successfully in 8234ms
```

---

## 🆘 Quick Troubleshooting

### "Stable Diffusion API is not accessible"
```powershell
# 1. Check if SD is running
http://127.0.0.1:7860

# 2. Check if API is enabled
Get-Content webui-user.bat | Select-String "api"
# Should show: --api
```

### "Image generation failed with all providers"
```powershell
# Check your .env
cat .env | Select-String "HUGGING"
cat .env | Select-String "SD_"
```

---

## 🎨 Advanced Options

### Custom Image Size (SD Only)
```javascript
{
    prompt: "your prompt",
    width: 768,
    height: 768,
    steps: 30,
    negativePrompt: "blurry, low quality"
}
```

### Check Service Status
```javascript
// Add to your backend:
router.get('/image-status', (req, res) => {
    const imageService = require('../services/imageService');
    res.json(imageService.getStatus());
});
```

---

## 📚 Full Documentation
See [IMAGE-GENERATION-FALLBACK-SETUP.md](./IMAGE-GENERATION-FALLBACK-SETUP.md) for complete details.

---

## ✅ Checklist

- [ ] `.env` configured with API keys
- [ ] Stable Diffusion running with `--api` flag
- [ ] Backend server started
- [ ] Test image generation works
- [ ] Check logs to verify provider

---

## 🎉 You're Ready!

Your AI project now has **automatic fallback** between Hugging Face and Stable Diffusion APIs!
