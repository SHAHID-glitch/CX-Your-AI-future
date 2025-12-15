# Attachment Memory System

## Overview

The Attachment Memory System extends the base memory system to remember and reference all uploaded content (images, files, documents) in conversations. The AI can now recall past uploads and use them to provide more contextual responses.

## Features

### 1. **Full Attachment History**
- Tracks all images, files, and documents uploaded by users
- Stores metadata: filename, type, size, prompt (for generated images), description, extracted text
- Maintains temporal context of when content was uploaded

### 2. **Intelligent Context Building**
- Current conversation attachments are prioritized
- Recent attachments from past conversations are included for reference
- AI receives structured context about all relevant uploads

### 3. **Content Analysis**
- Extracts text from documents (OCR integration ready)
- Analyzes image prompts for generated images
- Auto-generates tags for categorization
- Tracks file types and usage patterns

### 4. **Search & Discovery**
- Search attachments by filename, content, or description
- Find similar attachments based on type, tags, and context
- Filter by type (image, file, document) or conversation

### 5. **Usage Analytics**
- Track attachment statistics by type
- Identify user preferences (preferred attachment types)
- Monitor upload patterns and frequency

## How It Works

### Automatic Memory Integration

When a user sends a message:

1. **User uploads image/file** → Saved with enhanced metadata
2. **AI generates response** → Memory service loads attachment context
3. **Context includes**:
   - All attachments in current conversation
   - Recent attachments from past 10 conversations
   - Extracted text from documents
   - Image generation prompts
4. **AI uses context** → References past uploads in responses

### Example Flow

```
User uploads image.png with prompt "Create a landscape"
↓
System saves: {
  filename: "image.png",
  type: "image",
  prompt: "Create a landscape",
  url: "...",
  uploadedAt: timestamp
}
↓
Later in conversation...
User: "Can you make another similar image?"
↓
AI sees context:
"=== ATTACHMENTS IN THIS CONVERSATION ===
Images (1):
1. 'image.png' - Generated from: 'Create a landscape'"
↓
AI responds: "I'll create another landscape image similar to 
the one I generated earlier. Would you like the same style?"
```

## API Endpoints

### Get Attachment History
```http
GET /api/memory/attachments?limit=50&type=image
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Max results (default: 50)
- `type` (optional): Filter by type: 'image', 'file', 'document'
- `conversationId` (optional): Filter by conversation

**Response:**
```json
{
  "success": true,
  "attachments": [
    {
      "filename": "report.pdf",
      "type": "document",
      "url": "...",
      "extractedText": "Document content...",
      "messageContent": "Here's the report",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### Get Attachment Statistics
```http
GET /api/memory/attachments/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "byType": {
      "image": 30,
      "document": 10,
      "file": 5
    },
    "recentCount": 8,
    "totalSize": 15728640
  }
}
```

### Search Attachments
```http
GET /api/memory/attachments/search?q=landscape&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filename": "landscape.png",
      "type": "image",
      "prompt": "Create a landscape",
      "messageContent": "Generate an image...",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### Get Conversation Attachments
```http
GET /api/memory/attachments/:conversationId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "attachments": [
    {
      "filename": "image.png",
      "type": "image",
      "url": "...",
      "prompt": "Create a landscape",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

## Database Schema Updates

### Message Model Enhancement

```javascript
attachments: [{
    filename: String,           // Original filename
    url: String,               // Storage URL
    type: String,              // 'image', 'file', 'document'
    size: Number,              // File size in bytes
    mimeType: String,          // MIME type (e.g., 'image/png')
    prompt: String,            // For AI-generated images
    description: String,       // User-provided description
    extractedText: String,     // OCR or document text
    tags: [String],           // Auto-generated tags
    uploadedAt: Date          // Upload timestamp
}]
```

### UserMemory Model Updates

```javascript
statistics: {
    attachmentStats: {
        totalAttachments: Number,
        byType: {
            image: Number,
            document: Number,
            file: Number
        },
        totalSize: Number,
        lastUpdated: Date
    }
},
preferences: {
    contentPreferences: {
        preferredAttachmentType: String,
        attachmentUsageFrequency: Number
    }
}
```

## Services

### AttachmentMemoryService

**Location:** `services/attachmentMemoryService.js`

**Key Methods:**

| Method | Description |
|--------|-------------|
| `getUserAttachmentHistory(userId, options)` | Get all attachments for a user |
| `getConversationAttachments(conversationId)` | Get attachments for specific conversation |
| `buildAttachmentContext(userId, conversationId)` | Build AI context string |
| `analyzeAttachment(attachment, messageContent)` | Extract metadata and tags |
| `getAttachmentStats(userId)` | Get usage statistics |
| `searchAttachments(userId, query, options)` | Search by content |
| `getSimilarAttachments(attachmentId, userId, limit)` | Find similar uploads |
| `updateUserMemoryWithAttachments(userId)` | Update user preferences |

### MemoryService Enhancement

**Enhanced Method:**
```javascript
async getPersonalizedContext(userId, conversationId)
```

Now includes:
- User preferences and patterns (existing)
- Recent conversation topics (existing)
- **NEW:** Attachment context from current and past conversations

## Integration

### In AI Responses

The AI service automatically receives attachment context:

```javascript
// In aiService.generateResponse()
const memoryContext = await memoryService.getPersonalizedContext(
    userId, 
    conversationId  // Now includes attachment context
);
```

### In Server Routes

```javascript
// In server.js message endpoint
const aiResponse = await generateAIResponse(
    content, 
    conversationMessages, 
    responseType, 
    userId,           // For memory personalization
    conversationId    // For attachment context
);
```

## Usage Examples

### Example 1: Referencing Past Images

**User uploads:** `vacation-beach.jpg`
**User later asks:** "Can you edit that beach photo I showed you?"

**AI receives context:**
```
=== ATTACHMENTS IN THIS CONVERSATION ===
Images (1):
1. "vacation-beach.jpg" - Uploaded 5 minutes ago
```

**AI responds:** "I can help edit the beach photo you uploaded. What changes would you like to make?"

### Example 2: Document Reference

**User uploads:** `project-proposal.pdf` with extracted text
**User asks:** "What were the main points?"

**AI receives context:**
```
=== ATTACHMENTS IN THIS CONVERSATION ===
Files/Documents (1):
1. "project-proposal.pdf" - Content: "Project Overview: We propose to build..."
```

**AI responds:** "Based on your project proposal, the main points are..."

### Example 3: Cross-Conversation Reference

**User generated images in past conversation**
**User starts new conversation:** "Create something similar to before"

**AI receives context:**
```
=== RECENT ATTACHMENTS FROM PAST CONVERSATIONS ===
(The user has uploaded/generated these recently)
1. image: "landscape.png" (generated from: "Create a mountain landscape...")
2. image: "sunset.png" (generated from: "Sunset over ocean...")
```

**AI responds:** "I see you've previously generated landscape and sunset images. Which style would you like me to emulate?"

## Configuration

### Options for Attachment Context

```javascript
// Get recent attachments (limit)
const attachments = await attachmentMemoryService.getUserAttachmentHistory(userId, {
    limit: 50  // Get last 50 attachments
});

// Filter by type
const images = await attachmentMemoryService.getUserAttachmentHistory(userId, {
    type: 'image'
});

// Filter by conversation
const chatAttachments = await attachmentMemoryService.getUserAttachmentHistory(userId, {
    conversationId: '507f1f77bcf86cd799439011'
});
```

## Performance Considerations

1. **Context Size**: Attachment context is added to AI prompts
   - Current conversation attachments: All included
   - Past conversations: Limited to 5 most recent
   - Extracted text: Truncated to 150 characters per file

2. **Query Optimization**: 
   - Attachments are loaded only when conversationId is provided
   - Use MongoDB indexes on `conversationId` and `timestamp`
   - Lazy loading in memory service

3. **Storage**: 
   - Actual files stored separately (URLs only in database)
   - Extracted text stored in database for quick access
   - Tags and metadata for efficient searching

## Best Practices

### For Frontend Integration

1. **Display Attachment References**
```javascript
// Show which attachments AI is aware of
const attachments = await fetch('/api/memory/attachments/:conversationId');
// Display: "AI remembers: 3 images, 2 documents"
```

2. **Search Before Upload**
```javascript
// Check if similar content already uploaded
const similar = await fetch('/api/memory/attachments/search?q=landscape');
// Suggest: "You already have similar images..."
```

3. **Visualize Usage**
```javascript
const stats = await fetch('/api/memory/attachments/stats');
// Show: "You've uploaded 30 images, 10 documents this month"
```

### For Backend Enhancement

1. **Add OCR Integration**
```javascript
// In message save handler
if (attachment.type === 'image' || attachment.type === 'document') {
    attachment.extractedText = await ocrService.extract(attachment.url);
}
```

2. **Generate Smart Tags**
```javascript
// Use AI to auto-tag attachments
const tags = await aiService.generateTags(attachment.filename, extractedText);
```

3. **Update Memory Periodically**
```javascript
// Background job to update attachment statistics
setInterval(async () => {
    await attachmentMemoryService.updateUserMemoryWithAttachments(userId);
}, 3600000); // Every hour
```

## Troubleshooting

### AI Not Referencing Attachments

**Check:**
1. Is `conversationId` being passed to `aiService.generateResponse()`?
2. Are attachments saved with correct structure in database?
3. Is attachment context being built? (Check logs)

**Debug:**
```javascript
// In memoryService.getPersonalizedContext()
console.log('Attachment context:', attachmentContext);
```

### Empty Attachment History

**Check:**
1. Are messages being saved with attachments array?
2. Is `uploadedAt` timestamp being set?
3. Check MongoDB query for user's conversations

**Verify:**
```javascript
const messages = await Message.find({ 'attachments.0': { $exists: true } });
console.log('Messages with attachments:', messages.length);
```

### Search Not Finding Results

**Check:**
1. Search query is case-insensitive
2. Searches in: filename, description, extractedText, prompt, messageContent
3. Verify extracted text is populated

**Test:**
```javascript
const allAttachments = await attachmentMemoryService.getUserAttachmentHistory(userId);
console.log('Total attachments:', allAttachments.length);
```

## Future Enhancements

1. **Visual Similarity Search**
   - Use image embeddings to find visually similar images
   - Vector database integration (Pinecone, Weaviate)

2. **Smart Summaries**
   - AI-generated descriptions for all attachments
   - Automatic content categorization

3. **Content Relationships**
   - Link related attachments across conversations
   - Build knowledge graph of user's content

4. **Advanced Analytics**
   - Track attachment engagement (which get referenced most)
   - Predict needed attachments based on conversation

5. **Collaborative Memory**
   - Share attachment memories across team members
   - Organizational knowledge base

## Complete Integration Checklist

- ✅ Enhanced Message model with rich attachment metadata
- ✅ Created AttachmentMemoryService with 8 core methods
- ✅ Updated MemoryService to include attachment context
- ✅ Modified AI service to accept conversationId
- ✅ Updated server routes to pass userId and conversationId
- ✅ Added 4 new API endpoints for attachment memory
- ✅ Documentation created

**System is ready to use!** The AI will now automatically remember and reference all uploaded content.
