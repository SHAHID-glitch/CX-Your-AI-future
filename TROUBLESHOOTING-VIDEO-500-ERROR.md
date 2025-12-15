# 🎬 Video Generation 500 Error - Troubleshooting Guide

## 🔴 Problem
Getting `500 Internal Server Error` when trying to generate videos:
```
api/ai/generate-video:1   Failed to load resource: the server responded with a status of 500
first.js:3422  Video generation error: Error: API error: 500
```

## 🔍 Root Cause (Most Likely)
**HuggingFace API is returning 410 Gone errors for all models**, which means:
1. **Quota Exhausted** ⚠️ (Most Common) - Free tier has limited API calls
2. **API Key Invalid/Expired** - Rare if key was working before
3. **Models Temporarily Unavailable** - Rare, usually recovers quickly

## ✅ Solutions (Try in Order)

### Solution 1: Check Your HuggingFace Quota
1. Go to https://huggingface.co/settings/tokens
2. Click on your API token to view details
3. Check for "Rate Limit" or "Quota" information
4. If free tier quota exhausted, either:
   - **Wait 24 hours** for quota reset (free tier resets daily)
   - **Upgrade to Pro** - Get higher limits
   - **Use a different HuggingFace account**

### Solution 2: Update HuggingFace API Key
If you have a new HuggingFace account:

1. Go to https://huggingface.co/settings/tokens
2. Create a new **Read** access token
4. Open `.env` file in the project root
5. Find this line:
   ```
   HUGGINGFACE_API_KEY=hf_your_old_token_here
   ```
5. Replace with your new token:
   ```
   HUGGINGFACE_API_KEY=hf_YOUR_NEW_TOKEN_HERE
   ```
6. Save file
7. Restart server: Press `Ctrl+C` in terminal, then `npm start`

### Solution 3: Use Alternative Service (OpenAI)
If you have OpenAI API credits:

1. Update `.env` to use OpenAI instead:
   ```env
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-your-key-here
   ```
2. Update `services/videoService.js` to use OpenAI DALL-E instead
3. Restart server

### Solution 4: Wait & Retry
Sometimes HuggingFace models are temporarily loading:
- **Wait 2-3 minutes**
- Try generating video again
- The model might be warming up

### Solution 5: Try Different Video Prompt
Some prompts work better than others:
- ✅ Better: "A cat jumping over a fence"
- ❌ Worse: "cat" or "jump"
- ✅ Better: "Ocean waves during sunset"
- ❌ Worse: "beach" alone

## 🔧 How to Check Server Logs

When you run `npm start`, watch for lines like:
```
🎬 Generating video with prompt: "YOUR PROMPT"
  Trying model: stabilityai/stable-diffusion-xl-base-1.0...
  ❌ stabilityai/stable-diffusion-xl-base-1.0 failed: 410 Gone
  ...
❌ Video generation error: All image models failed. Please check your HuggingFace API key and quota.
```

**Key indicators:**
- `410 Gone` = Quota exhausted or model unavailable
- `401 Unauthorized` = Invalid API key
- `429 Too Many Requests` = Rate limited, wait a bit
- `503 Service Unavailable` = Server overloaded, retry later

## 📊 Current Configuration

Your `.env` should have:
```
HUGGINGFACE_API_KEY=hf_your_actual_api_key_here
```

**Current models tried** (in order):
1. stabilityai/stable-diffusion-xl-base-1.0
2. runwayml/stable-diffusion-v1-5
3. prompthero/openjourney-v4
4. CompVis/stable-diffusion-v1-4
5. dreamlike-art/dreamlike-photoreal-2.0

## 🧪 Quick Test

You can test your API key validity here:
```
Visit: https://huggingface.co/api/whoami
Headers: Authorization: Bearer YOUR_TOKEN_HERE
```

If you get user info (name, plan, etc) = ✅ Key is valid
If you get 401/error = ❌ Key is invalid

## 📞 HuggingFace Free Tier Limits

- **Calls per minute**: 10
- **Calls per day**: 1,000
- **Reset**: Daily at midnight UTC

If you're hitting these limits, you need to either:
1. Wait for daily reset
2. Upgrade to Pro tier
3. Use a different service

## 🎯 Recommended Next Steps

1. **First**: Check HuggingFace quota at https://huggingface.co/settings/tokens
2. **If quota exhausted**: 
   - Option A: Wait 24 hours for free tier reset
   - Option B: Create new account and use new token
   - Option C: Upgrade to Pro tier
3. **If key valid**: Try again in 5 minutes (models might be loading)
4. **Still failing**: Contact HuggingFace support or use alternative service

## 💡 Pro Tip
For better success rate:
- Use descriptive prompts (3-5 words minimum)
- Avoid special characters in prompts
- Try during off-peak hours
- Keep prompts under 500 characters

---

**Questions?** Check your terminal for detailed error messages when you attempt to generate a video.
