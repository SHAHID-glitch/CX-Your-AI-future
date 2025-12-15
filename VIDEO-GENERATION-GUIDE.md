# 🎬 Video Generation Integration Guide

This document explains how to use the integrated HuggingFace video generation feature.

## Overview

The video generation feature integrates the `damo-vilab/text-to-video-ms-1.7b` model from HuggingFace, allowing users to generate videos from text prompts.

## Setup

### 1. Install Dependencies
Ensure `axios` is already installed (it's in your package.json):
```bash
npm install axios
```

### 2. Configure Environment Variables
Add your HuggingFace API key to your `.env` file:
```env
HUGGINGFACE_API_KEY=your_api_key_here
```

Get your API key from: https://huggingface.co/settings/tokens

### 3. Files Added/Modified

#### New Files:
- `services/videoService.js` - Video generation service
- `test-video-generation.js` - Node.js test script
- `video-generation-demo.html` - Browser UI demo

#### Modified Files:
- `routes/ai.js` - Added video generation endpoints

## API Endpoints

### 1. Generate Single Video
**POST** `/api/ai/generate-video`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "prompt": "A man riding a bike on a mountain road, cinematic, realistic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video generated successfully",
  "video": {
    "url": "/uploads/videos/user-123/video-1702000000000.mp4",
    "filename": "video-1702000000000.mp4",
    "prompt": "A man riding a bike...",
    "duration": 45.23,
    "size": 5242880
  }
}
```

### 2. Generate Multiple Videos (Batch)
**POST** `/api/ai/generate-videos-batch`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "prompts": [
    "A car driving through a city street",
    "A person running on a beach at sunset"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 2/2 videos",
  "results": [
    {
      "success": true,
      "videoUrl": "/uploads/videos/user-123/video-1702000000000.mp4",
      "filename": "video-1702000000000.mp4",
      "prompt": "A car driving...",
      "duration": 42.5,
      "size": 4895321
    },
    {
      "success": true,
      "videoUrl": "/uploads/videos/user-123/video-1702000000001.mp4",
      "filename": "video-1702000000001.mp4",
      "prompt": "A person running...",
      "duration": 40.1,
      "size": 4612800
    }
  ]
}
```

### 3. Delete Video
**DELETE** `/api/ai/videos/:filename`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

## Usage Examples

### Using the HTML Demo
1. Open `video-generation-demo.html` in your browser
2. Make sure you're logged in to your account
3. Enter a prompt in the text area
4. Click "Generate Video"
5. Wait for the video to be generated (may take 1-5 minutes)

### Using cURL
```bash
# Generate a video
curl -X POST http://localhost:3000/api/ai/generate-video \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "prompt": "A sunset over mountains"
  }'

# Generate batch
curl -X POST http://localhost:3000/api/ai/generate-videos-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "prompts": ["A sunset", "A sunrise"]
  }'

# Delete video
curl -X DELETE http://localhost:3000/api/ai/videos/video-1702000000000.mp4 \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Using Node.js/JavaScript
```javascript
const videoService = require('./services/videoService');

// Generate single video
const result = await videoService.generateVideo(
  'A man riding a bike on a mountain road'
);

// Generate multiple videos
const results = await videoService.generateVideoBatch([
  'A car driving through a city street',
  'A person running on a beach'
]);

// Delete video
await videoService.deleteVideo('video-1702000000000.mp4');
```

## Video Storage

Generated videos are stored in: `uploads/videos/user-{userId}/`

Example structure:
```
uploads/
├── videos/
│   ├── user-123/
│   │   ├── video-1702000000000.mp4
│   │   ├── video-1702000000001.mp4
│   │   └── ...
│   └── anonymous/
│       ├── video-1702000000002.mp4
│       └── ...
```

## Constraints & Limitations

### Rate Limiting
- The API uses a 2-second delay between batch requests to avoid rate limiting
- HuggingFace may rate limit rapid requests

### Prompt Limitations
- Maximum prompt length: 500 characters
- Prompt should be descriptive for better results

### Batch Limits
- Maximum 10 videos per batch request

### Timeout
- Generation timeout: 2 minutes per video
- Large/complex prompts may timeout

### Model Status
- If you get a 503 error, the model is loading. Try again in a moment.
- If you get a 429 error, you're rate limited. Wait before trying again.

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| HUGGINGFACE_API_KEY not configured | Missing API key | Add to .env file |
| Video model is loading | Model starting up | Wait and retry |
| Rate limited | Too many requests | Wait before retrying |
| Generation timeout | Prompt too complex | Try simpler prompt |
| File not found | Video already deleted | Check filename |

## Performance Notes

- **First generation**: May take 1-5 minutes (model warmup)
- **Subsequent generations**: Usually 1-3 minutes
- **Batch generation**: Expect longer total time (2s delay between each + generation time)
- **Video size**: Typically 5-10 MB per video

## Best Practices

### Prompt Writing
✅ DO:
- Be specific and descriptive
- Include style/mood (e.g., "cinematic", "realistic")
- Describe camera movements if desired
- Use clear, simple language

❌ DON'T:
- Use overly complex or vague descriptions
- Request extremely long videos
- Use special characters or emojis
- Ask for things the model doesn't support (e.g., "2 minute video")

### Examples of Good Prompts
- "A golden retriever playing fetch in a park, sunny day, slow motion"
- "Person walking through a forest with tall trees, mist, morning light"
- "Cars racing on a track, high speed, cinematic camera angle"
- "Beach waves crashing on shore, sunset, realistic"

## Monitoring

Check video generation in logs:
```bash
# In server terminal
🎬 Generating video with prompt: "..."
✅ Video generated successfully in 45.23s
📁 Saved to: ./uploads/videos/user-123/video-1702000000000.mp4
```

## Troubleshooting

### Model Loading Issues
```
Error: Video model is currently loading
```
Solution: Wait 30-60 seconds and try again. The model is warming up.

### API Key Issues
```
Error: Invalid API key
```
Solution: Check your HuggingFace API key in `.env` file

### Timeout Issues
```
Error: Video generation timeout
```
Solution: Try with a simpler prompt or wait before retrying

### Storage Issues
```
Error: ENOSPC: no space left on device
```
Solution: Delete old videos or ensure sufficient disk space

## Development

### Testing
```bash
# Run test script (requires server running)
node test-video-generation.js
```

### Adding Custom Models
Edit `services/videoService.js` and change `this.modelUrl`:
```javascript
// Other available models:
// "https://api-inference.huggingface.co/models/model-name"
```

## Security Considerations

- ✅ Authentication required for all endpoints
- ✅ Videos stored per-user to prevent cross-user access
- ✅ API key stored securely in .env
- ✅ Prompt length validated (500 chars max)
- ⚠️ Consider adding virus scanning for production
- ⚠️ Consider adding abuse prevention/content filtering

## References

- HuggingFace Models: https://huggingface.co/models
- Video Model: https://huggingface.co/damo-vilab/text-to-video-ms-1.7b
- Inference API Docs: https://huggingface.co/docs/api-inference
- Axios Documentation: https://axios-http.com/

---

**Last Updated:** December 7, 2025
**Version:** 1.0.0
