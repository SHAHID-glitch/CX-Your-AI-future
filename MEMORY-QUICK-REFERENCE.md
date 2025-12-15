# Memory System - Quick Reference Card

## 🎯 What It Does
AI now remembers **everything**: past chats, user preferences, uploaded images/files, and uses this to give smarter, personalized responses.

## ⚡ Key Features (Auto-Enabled)

### 1. Conversation Memory
- Remembers past conversations
- Learns topics you discuss
- Detects patterns in questions
- Tracks sentiment and engagement

### 2. User Learning
- Learns your communication style
- Remembers your interests
- Tracks usage patterns
- Adapts to feedback

### 3. Attachment Memory
- Remembers all uploaded images
- Tracks documents and files
- Extracts text from documents
- References past uploads in responses

### 4. Predictions
- Predicts likely questions
- Suggests relevant topics
- Anticipates your needs

## 🔗 API Endpoints

### Memory APIs
```
GET  /api/memory/insights              - Get insights & patterns
GET  /api/memory/context               - Get personalized context
GET  /api/memory/predictions           - Get predictions
GET  /api/memory/topics                - Get frequent topics
GET  /api/memory/statistics            - Get stats
POST /api/memory/feedback              - Record like/dislike
GET  /api/memory/learning-progress     - Get learning score
```

### Attachment APIs
```
GET  /api/memory/attachments                - Get all attachments
GET  /api/memory/attachments/stats          - Get attachment stats
GET  /api/memory/attachments/search?q=...   - Search attachments
GET  /api/memory/attachments/:conversationId - Get chat attachments
```

## 💻 Quick Examples

### Get User Insights
```javascript
const response = await fetch('/api/memory/insights', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const { insights } = await response.json();
console.log(insights.topTopics);        // ["Python", "AI", "Web"]
console.log(insights.communicationStyle); // { tone: "casual", length: "brief" }
```

### Get Predictions
```javascript
const response = await fetch('/api/memory/predictions', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const { predictions } = await response.json();
console.log(predictions.likelyQuestions);  // ["How do I...", "Can you help with..."]
```

### Search Attachments
```javascript
const response = await fetch('/api/memory/attachments/search?q=landscape', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const { results } = await response.json();
// Returns: matching images, files, documents
```

### Get Attachment Stats
```javascript
const response = await fetch('/api/memory/attachments/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const { stats } = await response.json();
console.log(stats.total);           // 45
console.log(stats.byType.image);    // 30
console.log(stats.byType.document); // 10
```

## 📊 Data Models

### UserMemory
```javascript
{
  preferences: {
    communicationStyle: { preferredTone, preferredLength },
    topicInterests: [{ topic, frequency, lastDiscussed }],
    contentPreferences: { preferredAttachmentType }
  },
  behavioralPatterns: {
    typicalUsageTimes: [...],
    commonQuestionTypes: [...]
  },
  predictions: {
    likelyQuestions: [...],
    suggestedTopics: [...]
  },
  statistics: {
    totalConversations: Number,
    attachmentStats: { total, byType, totalSize }
  }
}
```

### Enhanced Message Attachments
```javascript
attachments: [{
  filename: "report.pdf",
  url: "...",
  type: "document",
  mimeType: "application/pdf",
  size: 204800,
  prompt: "Generate a report",      // For AI-generated content
  description: "Project report",    // User description
  extractedText: "Content...",     // From OCR
  tags: ["report", "project"],     // Auto-generated
  uploadedAt: Date
}]
```

## 🎬 Usage Examples

### Example 1: Basic Memory
```
Day 1:
User: "I'm learning Python"
AI: "Great! What aspect of Python?"
[Memory stores: topic="Python"]

Day 2:
User: "Can you help me?"
AI: "Of course! Are you working on your Python project?"
[AI recalls past topic]
```

### Example 2: Attachment Memory
```
User: [uploads vacation.jpg] "My vacation photo"
AI: "Beautiful photo! Where was this taken?"

Later...
User: "Can you edit that vacation photo?"
AI: "Sure! I see you uploaded vacation.jpg earlier. What edits?"
[AI remembers the upload]
```

### Example 3: Cross-Chat Memory
```
Chat 1:
User: [generates landscape.png] "Create mountain landscape"

Chat 2 (days later):
User: "Make another landscape like before"
AI: "I see you previously generated landscape.png with mountains. 
     Want the same style?"
[AI remembers past generation]
```

## 🔧 Configuration

### Adjust Context Size
In `attachmentMemoryService.js`:
```javascript
// Line 37: Number of recent attachments to fetch
limit: 10  // Change to 20, 50, etc.

// Line 135: Number shown in AI context
.slice(0, 5)  // Change to show more/less
```

### Filter Attachments
```javascript
// Get only images
GET /api/memory/attachments?type=image

// Limit results
GET /api/memory/attachments?limit=20

// Specific conversation
GET /api/memory/attachments?conversationId=abc123
```

## 🐛 Troubleshooting

### Issue: AI not using memory
**Fix:** Check userId is passed to AI service
```javascript
// In server.js, line 536
const aiResponse = await generateAIResponse(
    content, messages, responseType, 
    userId, conversationId  // Must include these
);
```

### Issue: No attachments found
**Fix:** Verify Message schema has enhanced fields
```javascript
// Check database
db.messages.findOne({ 'attachments.0': { $exists: true } })
// Should have: mimeType, tags, uploadedAt, etc.
```

### Issue: Empty predictions
**Fix:** Need more conversations for patterns
```javascript
// Check learning progress
GET /api/memory/learning-progress
// Score < 20 = needs more data
```

## 📈 Performance Tips

1. **Add Indexes**
```javascript
db.messages.createIndex({ conversationId: 1, timestamp: 1 })
db.messages.createIndex({ "attachments.type": 1 })
db.usermemories.createIndex({ userId: 1 })
```

2. **Limit Context Size**
- Current chat: all attachments included
- Past chats: only 5 most recent shown
- Text truncated to 150 chars

3. **Background Processing**
- Analysis runs after response sent
- Non-blocking operation
- Won't slow down chat

## 📁 Key Files

### Services
- `services/memoryService.js` - Core memory logic
- `services/attachmentMemoryService.js` - Attachment handling
- `services/aiService.js` - AI with memory integration

### Routes
- `routes/memory.js` - 14 memory endpoints

### Models
- `models/UserMemory.js` - User memory schema
- `models/ConversationAnalytics.js` - Analysis schema
- `models/Message.js` - Enhanced attachments

### Documentation
- `COMPLETE-MEMORY-IMPLEMENTATION-SUMMARY.md` - Full overview
- `ATTACHMENT-MEMORY-COMPLETE.md` - Attachment docs
- `ATTACHMENT-MEMORY-QUICKSTART.md` - Quick start
- `MEMORY-SYSTEM-GUIDE.md` - Technical guide

## ✅ Features Status

| Feature | Status | Auto-Enabled |
|---------|--------|--------------|
| Conversation memory | ✅ Done | ✅ Yes |
| User profiling | ✅ Done | ✅ Yes |
| Pattern detection | ✅ Done | ✅ Yes |
| Predictions | ✅ Done | ✅ Yes |
| Feedback learning | ✅ Done | ✅ Yes |
| Attachment memory | ✅ Done | ✅ Yes |
| Cross-chat memory | ✅ Done | ✅ Yes |
| Search attachments | ✅ Done | ❌ API call |
| Analytics | ✅ Done | ❌ API call |

## 🎓 How AI Uses Memory

### Context Injection
```javascript
// AI receives this context automatically:
`
User prefers casual tone, brief responses.
User frequently discusses: Python, AI, Web Development.
Recent topics: Django, React, APIs.
Currently working on: Full-stack project.

=== ATTACHMENTS IN THIS CONVERSATION ===
Images (2):
1. "logo.png" - Uploaded 10 minutes ago
2. "design.png" - Generated from: "Modern UI design"

=== RECENT ATTACHMENTS FROM PAST CONVERSATIONS ===
1. image: "banner.png" (generated from: "Hero banner design...")
2. document: "spec.pdf" (Content: "Technical specifications...")
`
```

### Result
AI can now:
- ✅ Reference past topics naturally
- ✅ Mention uploaded files by name
- ✅ Recall image generation prompts
- ✅ Adapt tone and length to preference
- ✅ Connect conversations logically

## 🚀 Quick Start

### 1. No Setup Needed!
System works automatically when:
- User is authenticated
- Messages are saved normally
- Attachments included in messages

### 2. Test It
```bash
# Send a message
POST /api/conversations/:id/messages
{ "content": "I love Python" }

# Check memory
GET /api/memory/insights

# Upload attachment
POST /api/conversations/:id/messages
{
  "content": "Here's my file",
  "attachments": [{ "filename": "test.py", "type": "file", "url": "..." }]
}

# Check attachments
GET /api/memory/attachments

# AI will remember both!
```

### 3. Verify
```javascript
// Get learning progress
GET /api/memory/learning-progress

// Response:
{
  "learningScore": 35,
  "patternsIdentified": 5,
  "conversationsAnalyzed": 3,
  "attachmentsTracked": 2
}
```

## 💡 Pro Tips

1. **More conversations = Better memory**
   - System learns patterns over time
   - Predictions improve with data

2. **Use feedback**
   - Like/dislike messages
   - System adapts to preferences

3. **Describe attachments**
   - Add descriptions when uploading
   - Helps AI understand context

4. **Check insights regularly**
   - See what AI learned
   - Verify accuracy

5. **Search before upload**
   - Check for similar files
   - Avoid duplicates

## 📞 Need Help?

1. **Check logs**: `console.log` in services
2. **Verify database**: Check collections exist
3. **Test endpoints**: Use Postman/curl
4. **Read docs**: Full guides in markdown files
5. **Check errors**: MongoDB errors in logs

---

## 🎉 Summary

**You now have a fully functional AI memory system!**

✅ Remembers conversations  
✅ Learns preferences  
✅ Tracks attachments  
✅ Predicts needs  
✅ Works automatically  

**No configuration needed - just start chatting!** 🚀
