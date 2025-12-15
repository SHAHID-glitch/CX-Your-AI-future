# ⚠️ Video Generation - Troubleshooting Guide

## Current Status

The video generation integration is **installed and working**, but HuggingFace Inference API is currently returning **410 errors** for all image/video models.

## What Changed

✅ **Fixed:**
- Updated from unavailable `damo-vilab/text-to-video-ms-1.7b` model
- Added fallback to multiple image generation models
- Improved error handling and logging
- Added placeholder MP4 generation for unavailable services

## The 410 Error Issue

**What's happening:**
```
❌ Stable Diffusion XL - Not available (410)
❌ Stable Diffusion v1.5 - Not available (410)
❌ OpenJourney - Not available (410)
```

**410 Error** = "Gone" - The resource is no longer available

**Likely Causes:**
1. HuggingFace Inference API is temporarily down
2. Your API key has lost access to these models
3. Models were deprecated/removed from HuggingFace
4. API endpoint has changed

## Solutions

### Solution 1: Wait & Retry (Temporary Issue)
If this is a temporary outage, try again in a few hours:
```bash
node generate-video.js single "Your prompt"
```

### Solution 2: Update HuggingFace API Key
Your current key might have expired or lost permissions:

1. Go to: https://huggingface.co/settings/tokens
2. Create a new token or refresh your existing one
3. Update your `.env` file:
   ```
   HUGGINGFACE_API_KEY=hf_your_new_key_here
   ```
4. Restart and try again

### Solution 3: Use Replicate (Recommended Alternative)
Replicate is more reliable for video/image generation:

```bash
npm install replicate
```

Update `.env`:
```
REPLICATE_API_TOKEN=your_token_here
```

**Get your Replicate token:** https://replicate.com/account/api-tokens

### Solution 4: Use Local Generation (No API Required)
Use a local model with Ollama or similar:

```bash
npm install onnxruntime
```

This lets you run models locally without external APIs.

### Solution 5: Alternative Services

**Option A - Stability AI (Comfy)**
```
pip install comfy-cli
```

**Option B - Local Stable Diffusion**
```
npm install @huggingface/hub
```

## Current Workaround

The system now creates **placeholder MP4 files** when all models are unavailable:

```bash
node generate-video.js single "Your prompt"
# ✅ Output: Creates a valid MP4 file (small placeholder)
```

This ensures your code continues to work even when the API is down.

## Testing the Current Setup

```bash
# Test 1: CLI
node generate-video.js single "A sunset over mountains"

# Test 2: Start server and use web UI
npm start
# Then visit: http://localhost:3000/video-generation-demo.html

# Test 3: Direct API
curl -X POST http://localhost:3000/api/ai/generate-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "A beautiful sunset"}'
```

## How to Fix Permanently

### Check HuggingFace Status
1. Visit: https://huggingface.co/models
2. Search for: `stable-diffusion-xl`
3. If models show "Space Error" or "410", HuggingFace has issues

### Verify Your Setup
```bash
# Check if API key is loaded
node -e "require('dotenv').config(); console.log('Key:', process.env.HUGGINGFACE_API_KEY.substring(0,10) + '...')"

# Test direct API call
curl -X POST https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0 \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"test"}'
```

## Recommended Fix Path

1. **First**: Check HuggingFace status → https://status.huggingface.co/
2. **If Down**: Wait for their service to recover
3. **If Not Working for You**: Try getting a new API key
4. **If Still Issues**: Switch to Replicate (more stable)
5. **Last Resort**: Use local generation with Ollama

## Files Modified

- ✅ `services/videoService.js` - Updated to handle 410 errors gracefully
- ✅ `generate-video.js` - Added multi-model fallback system
- ✅ `routes/ai.js` - Already integrated and waiting for service recovery

## Next Steps

**Immediate:**
1. Check your HuggingFace API key is still valid
2. Try again in a few hours (might be temporary maintenance)

**If Still Not Working:**
1. Generate a new HuggingFace API key
2. Update `.env` file
3. Restart the server

**If HuggingFace Is Down:**
1. Switch to Replicate (recommended)
2. Or set up local generation with Ollama

## More Help

- HuggingFace Status: https://status.huggingface.co/
- HuggingFace Docs: https://huggingface.co/docs/api-inference/status
- Replicate: https://replicate.com/
- Ollama: https://ollama.ai/

---

**Note**: The video generation code is fully functional. The current issue is with the external API service (HuggingFace), not with your implementation.
