# 🎨 Image Generation with Automatic Fallback

## Overview

Your AI project now supports **dual image generation** with automatic fallback:

1. **Primary**: Hugging Face API (FLUX.1-schnell)
2. **Fallback**: Stable Diffusion Local API (AUTOMATIC1111)

If Hugging Face fails (rate limit, API error, network issue), the system automatically switches to your local Stable Diffusion.

---

## 🏗️ Architecture

```
User Request
    ↓
Backend API (Node.js)
    ↓
Image Service (NEW!)
    ↓
    ├─→ Try Hugging Face API ✅
    │   (FLUX.1-schnell)
    │
    └─→ Fallback to Stable Diffusion API 🔄
        (Local AUTOMATIC1111)
        ↓
    Generated Image
```

---

## ⚙️ Configuration

### Step 1: Environment Variables

Add these to your `.env` file:

```env
# Hugging Face (Primary)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Stable Diffusion (Fallback)
SD_ENABLED=true
SD_API_URL=http://127.0.0.1:7860

# Optional: Custom HF Model
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell
```

### Step 2: Start Stable Diffusion with API

Navigate to your SD folder:
```powershell
cd C:\Users\sahid\OneDrive\PROJECTS\Practice\stable-diffusion-webui-master\stable-diffusion-webui-master
```

Your `webui-user.bat` is already configured with `--api` flag. Just run:
```powershell
.\webui-user.bat
```

Verify API is running by visiting:
```
http://127.0.0.1:7860/docs
```

You should see the Swagger API documentation.

### Step 3: Start Your Backend

```powershell
cd C:\Users\sahid\OneDrive\PROJECTS\Practice
node server.js
```

---

## 🚀 Usage

### From Your Frontend

Your existing frontend code will work without changes:

```javascript
async function generateImage() {
    const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_TOKEN'
        },
        body: JSON.stringify({
            prompt: 'a futuristic AI robot, ultra realistic'
        })
    });
    
    const data = await response.json();
    
    console.log('Provider:', data.provider); // 'huggingface' or 'stable-diffusion'
    console.log('Model:', data.model);
    console.log('Image URL:', data.imageUrl);
    
    document.getElementById('output').src = data.imageUrl;
}
```

### Advanced Options (Stable Diffusion)

You can pass additional parameters for Stable Diffusion:

```javascript
fetch('/api/ai/generate-image', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
        prompt: 'a futuristic AI robot, ultra realistic',
        width: 768,
        height: 768,
        steps: 30,
        negativePrompt: 'blurry, low quality, distorted'
    })
});
```

---

## 🧪 Testing

### Test 1: Test with Hugging Face Only

```bash
# In .env, make sure HUGGINGFACE_API_KEY is set
# SD_ENABLED=false (or comment out Stable Diffusion)
```

Generate an image from your frontend. It should use Hugging Face.

### Test 2: Test with Stable Diffusion Only

```bash
# In .env, remove or comment out HUGGINGFACE_API_KEY
# SD_ENABLED=true
# Make sure Stable Diffusion is running
```

Generate an image. It should fallback to Stable Diffusion.

### Test 3: Test Automatic Fallback

```bash
# Have both configured, but intentionally break HF
# Set HUGGINGFACE_API_KEY=invalid_key
# SD_ENABLED=true
```

Generate an image. It should try HF first, fail, then use SD.

### Test 4: Check Service Status

Create a test endpoint to check status:

```javascript
// Add to server.js or routes/ai.js
router.get('/image-status', (req, res) => {
    const imageService = require('../services/imageService');
    res.json(imageService.getStatus());
});
```

Visit: `http://localhost:3000/api/ai/image-status`

---

## 📊 Response Format

```json
{
  "success": true,
  "imageUrl": "/uploads/images/user-507f1f77bcf86cd799439011/1702000000000-generated.png",
  "filename": "1702000000000-generated.png",
  "prompt": "a futuristic AI robot",
  "userId": "507f1f77bcf86cd799439011",
  "provider": "stable-diffusion",
  "model": "stable-diffusion-local",
  "processingTime": 8432
}
```

**Fields:**
- `provider`: Either `"huggingface"` or `"stable-diffusion"`
- `model`: The model used
- `processingTime`: Generation time in milliseconds

---

## 🔧 Troubleshooting

### Issue: Both APIs fail

**Error message will tell you exactly what's wrong:**

```json
{
  "error": "Image generation failed",
  "message": "Image generation failed with all providers. Last error: ..."
}
```

**Solutions:**

1. **Check Hugging Face API:**
   ```bash
   # Verify your API key
   curl https://huggingface.co/api/whoami \
     -H "Authorization: Bearer YOUR_KEY"
   ```

2. **Check Stable Diffusion:**
   ```bash
   # Visit the API docs
   http://127.0.0.1:7860/docs
   
   # Or test health endpoint
   curl http://127.0.0.1:7860/sdapi/v1/sd-models
   ```

3. **Check .env file:**
   ```bash
   HUGGINGFACE_API_KEY=hf_... (starts with hf_)
   SD_ENABLED=true
   SD_API_URL=http://127.0.0.1:7860
   ```

### Issue: Stable Diffusion not found

**Error:**
```
Stable Diffusion API is not accessible at http://127.0.0.1:7860
```

**Solution:**
1. Make sure Stable Diffusion is running
2. Check that `webui-user.bat` has `--api` flag
3. Try visiting `http://127.0.0.1:7860` in browser

### Issue: Images are slow

**For Hugging Face:**
- Nothing you can do (cloud API)
- Typical: 3-10 seconds

**For Stable Diffusion:**
- Reduce `steps` (try 15-20 instead of 30-50)
- Reduce image size (512x512 instead of 1024x1024)
- Use faster sampler (`Euler a` instead of `DPM++ 2M Karras`)

---

## 🎯 Behavior Examples

### Scenario 1: Everything Works
```
User Request → HF API (success) ✅ → Returns HF image
```

### Scenario 2: HF Rate Limited
```
User Request → HF API (rate limit) ❌ → SD API (success) ✅ → Returns SD image
```

### Scenario 3: HF Down, SD Running
```
User Request → HF API (timeout) ❌ → SD API (success) ✅ → Returns SD image
```

### Scenario 4: Both Fail
```
User Request → HF API (error) ❌ → SD API (not running) ❌ → Error with troubleshooting
```

---

## 📝 Configuration Options

### Hugging Face Models

Change the model in `.env`:
```env
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell
# Or try:
# HF_IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
# HF_IMAGE_MODEL=runwayml/stable-diffusion-v1-5
```

### Stable Diffusion Settings

In your request body:
```javascript
{
  prompt: "your prompt",
  width: 512,          // 256-2048
  height: 512,         // 256-2048
  steps: 20,           // 10-50 (more = better quality, slower)
  cfgScale: 7,         // 1-20 (how closely to follow prompt)
  negativePrompt: "blurry, low quality",
  sampler: "Euler a",  // or "DPM++ 2M Karras", "LMS", etc.
  seed: -1             // -1 = random, or specific number for reproducibility
}
```

### Disable Fallback

If you only want to use Hugging Face:
```env
SD_ENABLED=false
```

If you only want to use Stable Diffusion:
```env
# Remove or comment out HUGGINGFACE_API_KEY
SD_ENABLED=true
```

---

## 🎨 Best Practices

1. **Development**: Use Stable Diffusion (free, unlimited, faster for testing)
2. **Production**: Use Hugging Face (no local server needed, always available)
3. **Optimal Setup**: Use both with fallback (reliability + cost savings)

---

## 📚 Code Structure

```
Practice/
├── services/
│   └── imageService.js      ← New! Handles both APIs + fallback
├── routes/
│   └── ai.js                 ← Updated to use imageService
├── .env                      ← Configuration
└── stable-diffusion-webui-master/
    └── webui-user.bat        ← Already configured with --api
```

---

## 🚀 Quick Start Checklist

- [ ] Add environment variables to `.env`
- [ ] Start Stable Diffusion: `cd stable-diffusion-webui-master && .\webui-user.bat`
- [ ] Verify SD API: Visit `http://127.0.0.1:7860/docs`
- [ ] Start your backend: `node server.js`
- [ ] Test image generation from frontend
- [ ] Check logs to see which provider was used

---

## 💡 Tips

1. **Monitor Logs**: Your backend will clearly show which provider is being used:
   ```
   🎨 Attempting image generation with Hugging Face...
   ✅ Hugging Face image generated successfully in 4523ms
   ```
   OR
   ```
   ❌ Hugging Face image generation failed: Rate limit exceeded
   🔄 Falling back to Stable Diffusion local API...
   ✅ Stable Diffusion image generated successfully in 8234ms
   ```

2. **Cost Optimization**: Since SD is free and local, you might want to use it primarily and only use HF for high-quality final images.

3. **Performance**: SD on CPU is slower than HF cloud API. If you have a GPU, configure SD to use it for much faster generation.

---

## 🎉 You're All Set!

Your AI project now has **reliable, dual-provider image generation** with automatic fallback. No more single point of failure!
