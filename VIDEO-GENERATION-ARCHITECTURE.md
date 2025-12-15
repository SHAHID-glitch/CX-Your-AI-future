# Video Generation Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ copilot-standalone.html                                      │  │
│  │ ┌────────────────────────────────────────────────────────┐   │  │
│  │ │ Video Generation Modal                                 │   │  │
│  │ │ • Description textarea (max 500 chars)                │   │  │
│  │ │ • Duration selector                                   │   │  │
│  │ │ • Art style selector                                  │   │  │
│  │ │ • Video preview player                                │   │  │
│  │ │ • Download button                                     │   │  │
│  │ │ • Share button                                        │   │  │
│  │ └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │ ┌────────────────────────────────────────────────────────┐   │  │
│  │ │ Action Grid & More Options Menu                       │   │  │
│  │ │ ┌──────────────────────────────────────────────────┐   │   │  │
│  │ │ │ [Create image] [Recommend] [Improve]           │   │   │  │
│  │ │ │ [Logo] [Simplify] [Draft] [Advice]             │   │   │  │
│  │ │ │ [Email] [✨ CREATE VIDEO] ← Entry point        │   │   │  │
│  │ │ └──────────────────────────────────────────────────┘   │   │  │
│  │ │                                                          │   │  │
│  │ │ [+] Menu:                                              │   │  │
│  │ │ • Add files  • Add photos  • Create image              │   │  │
│  │ │ • Thinking  • Deep research  • Study & learn           │   │  │
│  │ │ • Web search  • Canvas  • [✨ CREATE VIDEO]            │   │  │
│  │ └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ first.js (JavaScript Logic)                                  │  │
│  │                                                               │  │
│  │ Event Handlers:                                              │  │
│  │ • selectAction('video') → showVideoModal()                  │  │
│  │ • selectMoreOption('video') → showVideoModal()              │  │
│  │                                                               │  │
│  │ Modal Functions:                                             │  │
│  │ • showVideoModal() - Opens modal, focuses input             │  │
│  │ • closeVideoModal() - Closes, resets form                   │  │
│  │ • generateVideo() - Calls API endpoint                      │  │
│  │ • downloadVideo() - Downloads MP4 file                      │  │
│  │ • shareVideo() - Shares via Web Share API                   │  │
│  │                                                               │  │
│  │ Helper Functions:                                            │  │
│  │ • Character counter update                                  │  │
│  │ • Loading state management                                  │  │
│  │ • Video preview display                                     │  │
│  │ • Error handling & user feedback                            │  │
│  │                                                               │  │
│  │ Global Exports:                                              │  │
│  │ • window.showVideoModal                                     │  │
│  │ • window.closeVideoModal                                    │  │
│  │ • window.generateVideo                                      │  │
│  │ • window.downloadVideo                                      │  │
│  │ • window.shareVideo                                         │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ style.css (Styling)                                          │  │
│  │                                                               │  │
│  │ • .video-modal-overlay - Fixed overlay                      │  │
│  │ • .video-modal - Main dialog                                │  │
│  │ • .video-modal-header - Title area                          │  │
│  │ • .video-modal-body - Content area                          │  │
│  │ • .video-modal-footer - Buttons area                        │  │
│  │ • .form-group - Field containers                            │  │
│  │ • .form-input - Input styling                               │  │
│  │ • .video-textarea - Textarea styling                        │  │
│  │ • .char-counter - Character count display                   │  │
│  │ • .video-preview - Video player container                   │  │
│  │ • .video-loading - Loading indicator                        │  │
│  │ • .loading-spinner - Animated spinner                       │  │
│  │ • .settings-button - Button styling                         │  │
│  │                                                               │  │
│  │ Features:                                                    │  │
│  │ • Theme support (light/dark)                                │  │
│  │ • Responsive layout                                         │  │
│  │ • Smooth animations                                         │  │
│  │ • Accessibility features                                    │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ fetch() with JSON
                                  │ Authorization header
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER (Node.js)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ routes/ai.js                                                 │  │
│  │                                                               │  │
│  │ POST /api/ai/generate-video                                 │  │
│  │ ├── Requires: authentication middleware                     │  │
│  │ ├── Input validation:                                       │  │
│  │ │   • prompt required                                       │  │
│  │ │   • max 500 characters                                    │  │
│  │ ├── Calls: videoService.generateVideo(prompt, userId)      │  │
│  │ └── Returns: { success, video: { url, filename, ... } }    │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ services/videoService.js                                     │  │
│  │                                                               │  │
│  │ generateVideo(prompt, userId):                              │  │
│  │ │                                                             │  │
│  │ ├─→ Validate HuggingFace API key                           │  │
│  │ │                                                             │  │
│  │ ├─→ Model Fallback Chain:                                  │  │
│  │ │   ├── Try stabilityai/stable-diffusion-xl-base-1.0        │  │
│  │ │   ├── Try runwayml/stable-diffusion-v1-5                  │  │
│  │ │   └── Try prompthero/openjourney-v4                       │  │
│  │ │                                                             │  │
│  │ ├─→ API Call to HuggingFace:                                │  │
│  │ │   Method: POST                                            │  │
│  │ │   URL: https://router.huggingface.co/models/{model}       │  │
│  │ │   OR use @huggingface/inference SDK                       │  │
│  │ │                                                             │  │
│  │ ├─→ Response Processing:                                    │  │
│  │ │   • Convert blob to buffer                                │  │
│  │ │   • Generate filename (video-{timestamp}.mp4)             │  │
│  │ │                                                             │  │
│  │ ├─→ File Storage:                                           │  │
│  │ │   Path: uploads/videos/user-{userId}/video-{timestamp}.mp4│  │
│  │ │                                                             │  │
│  │ └─→ Return video URL: /uploads/videos/user-{userId}/...     │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ middleware/auth.js                                           │  │
│  │                                                               │  │
│  │ Protects video endpoint:                                    │  │
│  │ • Verifies auth token                                       │  │
│  │ • Extracts user ID                                          │  │
│  │ • Attaches user info to request                             │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ axios HTTP request
                                  │ Bearer token
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      HUGGINGFACE API                                 │
│                                                                      │
│  Inference Endpoints:                                               │
│  • https://router.huggingface.co/models/                            │
│  OR                                                                  │
│  • @huggingface/inference SDK                                       │
│                                                                      │
│  Models:                                                            │
│  ├── stabilityai/stable-diffusion-xl-base-1.0 (Primary)           │
│  ├── runwayml/stable-diffusion-v1-5 (Fallback 1)                  │
│  └── prompthero/openjourney-v4 (Fallback 2)                        │
│                                                                      │
│  Process:                                                           │
│  • Receive: { inputs: "User description" }                         │
│  • Generate: AI image/video from description                       │
│  • Return: Binary MP4/image data                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ MP4 binary data
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      FILE SYSTEM                                     │
│                                                                      │
│  uploads/videos/                                                    │
│  └── user-{userId}/                                                 │
│      ├── video-1765126196563.mp4  (1257 KB)                        │
│      ├── video-1765126291552.mp4  (1495 KB)                        │
│      └── ... more videos ...                                       │
│                                                                      │
│  Static serving:                                                    │
│  • /uploads/videos/{userId}/{filename}                             │
│  • Accessible to authenticated users                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
User Action → Event Handler → Modal Opens → Form Ready
                                                ↓
                                    User enters description
                                    Selects options
                                    Clicks "Generate"
                                                ↓
                                    Validation Check
                                    ├── Prompt required?
                                    ├── Max 500 chars?
                                    └── Auth token valid?
                                                ↓
                                    API Call Initiated
                                    POST /api/ai/generate-video
                                    ├── Prompt
                                    ├── Duration
                                    └── Style
                                                ↓
                                    Backend Processing
                                    ├── Validate input
                                    ├── Generate video
                                    ├── Save to disk
                                    └── Return URL
                                                ↓
                                    Video URL Received
                                    ├── Preview in player
                                    ├── Show download btn
                                    └── Show share btn
                                                ↓
                                    User Actions
                                    ├── Watch video
                                    ├── Download MP4
                                    ├── Share link
                                    └── Generate another
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   User Interface Layer                                           │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Action Grid              More Options Menu              │  │
│   │  [Create Video] ←→ ← ← → [+ Create Video]               │  │
│   │        ↓                          ↓                       │  │
│   │   Both trigger                                           │  │
│   │   showVideoModal()                                       │  │
│   │        ↓                                                  │  │
│   │   ┌──────────────────────────────────────────────────┐   │  │
│   │   │  Video Generation Modal                          │   │  │
│   │   │  ├── Textarea input                             │   │  │
│   │   │  ├── Duration selector                          │   │  │
│   │   │  ├── Style selector                             │   │  │
│   │   │  └── [Generate] [Cancel]                        │   │  │
│   │   │          ↓                                        │   │  │
│   │   │    generateVideo()                               │   │  │
│   │   └──────────────────────────────────────────────────┘   │  │
│   │                                                            │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│   Logic Layer (first.js)                                        │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  • Form validation                                       │  │
│   │  • Character counter                                     │  │
│   │  • Loading state management                             │  │
│   │  • Error handling                                        │  │
│   │  • API communication                                     │  │
│   │  • Video preview management                             │  │
│   │  • Download/share functionality                         │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│   Styling Layer (style.css)                                     │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  • Modal appearance                                      │  │
│   │  • Form styling                                          │  │
│   │  • Button styling                                        │  │
│   │  • Loading animation                                     │  │
│   │  • Theme support                                         │  │
│   │  • Responsive design                                     │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                   │
│                                                                   │
│   fetch('/api/ai/generate-video', {                             │
│     method: 'POST',                                             │
│     headers: { Authorization: `Bearer ${token}` },              │
│     body: { prompt, duration, style }                           │
│   })                                                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                   Backend Layer (Node.js)                        │
│                                                                   │
│   Route Handler (routes/ai.js)                                  │
│   ├─ Validate input                                             │
│   ├─ Check auth                                                 │
│   └─ Call service                                               │
│         ↓                                                        │
│   Service Layer (services/videoService.js)                      │
│   ├─ Call HuggingFace API                                       │
│   ├─ Try model fallback chain                                   │
│   ├─ Process response                                           │
│   ├─ Save to file system                                        │
│   └─ Return video URL                                           │
│         ↓                                                        │
│   File System (uploads/videos/)                                 │
│   └─ Store user-{id}/video-{timestamp}.mp4                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                External AI Service                               │
│                                                                   │
│   HuggingFace Inference API                                     │
│   ├─ Model: stable-diffusion-xl-base-1.0                       │
│   ├─ Model: stable-diffusion-v1-5                              │
│   └─ Model: openjourney-v4                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

```
┌─ Modal State ──────────────────────────────────────┐
│                                                     │
│  closed → open → formFilled → generating           │
│                                                     │
│  States:                                           │
│  • closed: Modal hidden, form reset               │
│  • open: Modal visible, form ready                │
│  • formFilled: User entered data                  │
│  • generating: Waiting for API response           │
│  • success: Video ready to display                │
│  • error: Error message displayed                 │
│                                                     │
│  Transitions:                                      │
│  • Click button → open                            │
│  • Type text → formFilled                         │
│  • Click Generate → generating                    │
│  • Response → success or error                    │
│  • Click Close → closed                           │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─ UI Element State ─────────────────────────────────┐
│                                                     │
│  Generate Button:                                  │
│  • default: enabled, visible                      │
│  • loading: disabled, "Generating..."              │
│  • success: enabled, "Generate Video"              │
│  • error: enabled, "Generate Video"                │
│                                                     │
│  Form Fields:                                      │
│  • default: visible, enabled                      │
│  • loading: hidden                                │
│  • success: hidden                                │
│                                                     │
│  Video Preview:                                    │
│  • default: hidden                                │
│  • loading: hidden                                │
│  • success: visible                               │
│                                                    │
│  Error Message:                                    │
│  • default: hidden                                │
│  • error: visible                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Input Validation Error
↓
├─ Empty prompt → alert('Please describe your video')
├─ Prompt > 500 chars → Auto-truncate to 500
└─ Invalid options → Use defaults

API Error
↓
├─ Network error → alert('Error generating video: {msg}')
├─ Auth error → Prompt sign in
├─ Server error → Show user-friendly message
└─ HuggingFace error → Retry with fallback model

Recovery
↓
├─ Show error message
├─ Re-enable form
├─ Allow user to retry
└─ Can generate new video
```

---

This architecture provides a **scalable, maintainable, and user-friendly** video generation experience integrated directly into your Copilot UI.
