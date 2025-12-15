# Text-to-Video Generation - UI Integration Guide

## Overview
I've integrated AI video generation directly into your Copilot UI. Users can now generate videos from text descriptions through an intuitive modal interface.

## How to Use (User Perspective)

### Method 1: Using the Action Grid
1. Open Copilot (copilot-standalone.html)
2. Look for the **"Create a video"** button in the action grid at the bottom
3. Click it to open the video generation modal

### Method 2: Using the "More Options" Menu
1. Click the **"+"** button in the chat input area
2. Select **"Create a video"** from the dropdown menu
3. The video generation modal will open

### Method 3: Via Chat
(Available when integrated with chat commands)

## Video Generation Modal Features

### Input Form
- **Describe your video**: Text area for entering video descriptions (max 500 characters)
  - Real-time character counter
  - Example: "A golden sunset over mountains reflecting in a calm lake"

### Video Parameters
1. **Duration**: Choose video length
   - Short (5-10 seconds)
   - Medium (10-30 seconds) - Default
   - Long (30+ seconds)

2. **Art Style**: Select the visual style
   - Realistic (Default)
   - Cinematic
   - Animated
   - Stylized
   - 3D Render

### Video Preview
After generation, users can:
- **Preview** the video with playback controls
- **Download** the MP4 file to their computer
- **Share** the video via native sharing or clipboard

## Technical Implementation

### Frontend Files Modified

#### 1. `copilot-standalone.html`
**Added:**
- Video generation modal HTML structure
- "Create a video" button in the action grid
- "Create a video" option in the more options menu

**Key Elements:**
```html
- .video-modal-overlay: Modal container
- .video-modal: Main modal dialog
- #videoPrompt: Text input for description
- #videoDuration: Duration selector
- #videoStyle: Art style selector
- #generatedVideo: Video player
- Video action buttons (Download, Share)
```

#### 2. `first.js`
**New Functions:**
- `showVideoModal()`: Opens the video generation modal
- `closeVideoModal()`: Closes the modal and resets form
- `generateVideo()`: Handles API call and video generation
- `downloadVideo()`: Downloads generated MP4
- `shareVideo()`: Shares video via Web Share API or clipboard

**Modified Functions:**
- `selectAction('video')`: Triggers video modal from action grid
- `selectMoreOption('video')`: Triggers video modal from more options menu

**Event Handlers:**
- Real-time character counter for text input
- Modal open/close management
- Loading state handling

#### 3. `style.css`
**New CSS Classes:**
```css
.video-modal-overlay: Fixed overlay background
.video-modal: Modal dialog container
.video-modal-header: Header with title and close button
.video-modal-body: Form content area
.video-modal-footer: Action buttons (Cancel, Generate)
.video-form: Form styling
.form-group: Form field containers
.form-input: Input/select styling
.video-textarea: Textarea styling
.char-counter: Character count display
.video-preview: Video preview container
.video-loading: Loading indicator
.loading-spinner: Animated loading spinner
.settings-button: Action buttons (primary and secondary)
```

### Backend Endpoint

**Endpoint**: `POST /api/ai/generate-video`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {authToken}
```

**Request Body:**
```json
{
  "prompt": "Your video description",
  "duration": "medium",
  "style": "realistic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video generated successfully",
  "video": {
    "url": "/uploads/videos/user-123/video-1765126196563.mp4",
    "filename": "video-1765126196563.mp4",
    "prompt": "Your video description",
    "duration": 12.07,
    "size": 1257231
  }
}
```

### Video Service

**File**: `services/videoService.js`

**Features:**
- Multiple model fallback chain
- Automatic provider selection
- MP4 generation with proper format
- User-based file organization
- Error handling and logging

**Models Used:**
1. stabilityai/stable-diffusion-xl-base-1.0 (Primary)
2. runwayml/stable-diffusion-v1-5 (Fallback)
3. prompthero/openjourney-v4 (Fallback)

## User Experience Flow

### Typical Workflow

1. **User clicks "Create a video"** button or menu option
   ↓
2. **Modal opens** with empty form
   ↓
3. **User enters description** and selects parameters
   - Character counter updates in real-time
   - Max 500 characters enforced
   ↓
4. **User clicks "Generate Video"** button
   ↓
5. **Loading state displays**
   - Animated spinner
   - "Generating your video..." message
   - Estimated time (20-40 seconds)
   ↓
6. **Video ready** in preview player
   - Video displays with playback controls
   - Download button available
   - Share button available
   ↓
7. **User can**:
   - Watch the video
   - Download as MP4
   - Share with others
   - Generate another video
   - Close modal

### UI States

1. **Default State**: Form visible, Generate button enabled
2. **Loading State**: Spinner visible, form hidden, button disabled
3. **Success State**: Video preview visible, action buttons enabled
4. **Error State**: Error message shown, user can retry

## Styling & Theme Support

The video modal supports both light and dark themes through CSS variables:

```css
--bg-primary: Modal background
--bg-secondary: Form input backgrounds
--text-primary: Primary text
--text-secondary: Secondary text
--text-tertiary: Tertiary text (counters, descriptions)
--border: Border color
--primary: Button color
--primary-dark: Button hover color
--shadow-md: Modal shadow
```

## Integration with Chat

When a video is successfully generated:
1. A message is automatically added to the chat: "✨ Video generated! '{prompt}'"
2. User can continue chatting or generate more videos
3. Video metadata is stored in `window.lastGeneratedVideo` for easy access

## Accessibility Features

- **Keyboard Navigation**: Tab through form fields, Enter to submit
- **Focus Management**: Focus moves to textarea when modal opens
- **Labels**: All form fields have associated labels
- **Error Messages**: Clear, descriptive error messages
- **Loading Indicators**: Visual feedback during generation

## Browser Compatibility

- Chrome/Edge: Full support (Web Share API + clipboard fallback)
- Firefox: Full support (clipboard fallback)
- Safari: Full support (Web Share API on iOS)

**Requirements:**
- Modern browser with Fetch API support
- localStorage support for auth tokens
- HTML5 Video player support

## Security Considerations

1. **Authentication**: All requests require valid auth token
2. **Input Validation**: 
   - Prompt max 500 characters
   - XSS prevention through textContent/innerText
3. **API Authorization**: Bearer token in request headers
4. **User Isolation**: Videos stored in user-specific directories

## Performance Optimization

1. **Lazy Loading**: Modal only loads when needed
2. **Async Operations**: Non-blocking API calls
3. **Loading Indicators**: User knows generation is in progress
4. **Cached Tokens**: Auth tokens retrieved from localStorage
5. **Error Recovery**: Users can retry without page reload

## Future Enhancements

Potential features for future development:

1. **Video Presets**: Save favorite generation settings
2. **History**: View previously generated videos
3. **Batch Generation**: Generate multiple videos at once
4. **Advanced Options**: Fine-tune parameters (aspect ratio, fps, etc.)
5. **Video Editing**: Simple trim/crop functionality
6. **Collaboration**: Share generated videos with team members
7. **Templates**: Pre-built prompts for common scenarios

## Troubleshooting

### Modal doesn't open
- Check browser console for errors
- Verify auth token is in localStorage
- Ensure JavaScript is enabled

### Video generation fails
- Check HuggingFace API key in .env
- Verify API quota/rate limits
- Check network connection
- Try again after 30 seconds

### Video won't play
- Ensure MP4 codec support in browser
- Check if file is fully generated
- Try different browser if issue persists

### Download not working
- Check browser's download settings
- Verify CORS headers are correct
- Try right-click "Save video as"

## Testing Checklist

- [ ] Modal opens from action grid
- [ ] Modal opens from more options menu
- [ ] Character counter works correctly
- [ ] Max 500 character limit enforced
- [ ] Form fields populate correctly
- [ ] Generate button triggers API call
- [ ] Loading state displays
- [ ] Video displays in preview player
- [ ] Download button works
- [ ] Share button works
- [ ] Close button closes modal
- [ ] Modal theme changes with app theme
- [ ] Error messages display properly
- [ ] Works on mobile and desktop

## File Structure

```
c:\Users\sahid\OneDrive\PROJECTS\Practice\
├── copilot-standalone.html      (UI + Modal HTML)
├── first.js                      (Frontend logic)
├── style.css                     (Modal styles)
├── routes/ai.js                  (API endpoint)
├── services/videoService.js      (Video generation logic)
└── uploads/videos/               (Generated video storage)
    └── user-{id}/
        └── video-{timestamp}.mp4
```

---

## Quick Start

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Open in browser**:
   ```
   http://localhost:3000/copilot-standalone.html
   ```

3. **Generate a video**:
   - Click "Create a video" button
   - Describe what you want to see
   - Click "Generate Video"
   - Wait for generation (20-40 seconds)
   - Watch, download, or share!

---

## Support

For issues or questions:
1. Check the browser console for errors
2. Review network tab for API responses
3. Verify .env configuration
4. Check HuggingFace API status
5. Review error messages for guidance
