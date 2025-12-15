# Memory System Architecture - Visual Guide

## 📊 System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                               │
│  (Chat Application, File Uploads, Voice Input, Image Generation)     │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API ROUTES                                   │
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  /api/ai/chat   │  │ /api/conversations│  │  /api/memory/*  │   │
│  │  /api/ai/generate│ │ /messages         │  │  (14 endpoints)  │   │
│  └────────┬────────┘  └────────┬──────────┘  └────────┬─────────┘   │
└───────────┼────────────────────┼──────────────────────┼──────────────┘
            │                    │                      │
            ▼                    ▼                      ▼
┌───────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│   AI SERVICE      │  │  MESSAGE HANDLER   │  │  MEMORY ROUTES   │
│                   │  │                    │  │                  │
│ • Generate        │  │ • Save Message     │  │ • Get Insights   │
│   Response        │  │ • Save Attachments │  │ • Get Stats      │
│ • Get Context     │  │ • Call AI          │  │ • Search         │
│ • Use Memory      │  │ • Trigger Analysis │  │ • Get History    │
└────────┬──────────┘  └──────────┬─────────┘  └────────┬─────────┘
         │                        │                      │
         ├────────────────────────┴──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        MEMORY SERVICE                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  getPersonalizedContext(userId, conversationId)                 │ │
│  │                                                                  │ │
│  │  1. Get UserMemory                                              │ │
│  │  2. Build preference context                                    │ │
│  │  3. Get recent topics                                           │ │
│  │  4. Get attachment context ──────────────┐                     │ │
│  │  5. Return combined context              │                      │ │
│  └──────────────────────────────────────────┼─────────────────────┘ │
│                                             │                        │
│  ┌──────────────────────────────────────────┼─────────────────────┐ │
│  │  analyzeConversation(conversationId, userId)                    │ │
│  │                                          │                       │ │
│  │  1. Load messages                        │                       │ │
│  │  2. Extract topics                       │                       │ │
│  │  3. Analyze sentiment                    │                       │ │
│  │  4. Detect patterns                      │                       │ │
│  │  5. Generate predictions                 │                       │ │
│  │  6. Save analytics                       │                       │ │
│  │  7. Update UserMemory                    │                       │ │
│  └──────────────────────────────────────────┼─────────────────────┘ │
└─────────────────────────────────────────────┼────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │ ATTACHMENT MEMORY SERVICE     │
                              │                               │
                              │ • Get attachment history      │
                              │ • Build attachment context    │
                              │ • Search attachments          │
                              │ • Get statistics              │
                              │ • Find similar attachments    │
                              │ • Update memory with stats    │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          DATABASE (MongoDB)                           │
│                                                                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │ UserMemory  │  │ Conversation    │  │ Message                │  │
│  │             │  │ Analytics       │  │                        │  │
│  │ • Prefs     │  │                 │  │ • content              │  │
│  │ • Patterns  │  │ • summary       │  │ • attachments[]        │  │
│  │ • Feedback  │  │ • topics        │  │   - filename           │  │
│  │ • Context   │  │ • sentiment     │  │   - url                │  │
│  │ • Predictions│ │ • metrics       │  │   - type               │  │
│  │ • Stats     │  │ • patterns      │  │   - mimeType           │  │
│  │             │  │                 │  │   - prompt             │  │
│  └─────────────┘  └─────────────────┘  │   - extractedText      │  │
│                                         │   - tags[]             │  │
│                                         │   - uploadedAt         │  │
│                                         └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow Diagram

### Scenario 1: User Sends Message

```
User types: "I love Python"
         │
         ▼
    [API Route]
         │
         ▼
  Save Message to DB
  (role: user, content: "I love Python")
         │
         ▼
  Get Conversation History
         │
         ▼
   [AI Service]
  generateResponse(message, history, type, userId, conversationId)
         │
         ├──────────────────────┐
         ▼                      ▼
  [Memory Service]       Load History
  getPersonalizedContext()      │
         │                      │
         ├──> Get UserMemory    │
         ├──> Get Topics        │
         ├──> Get Attachments   │
         │                      │
         ▼                      ▼
    Build Context ────> [Groq API]
                        Generate Response
                              │
                              ▼
                    "That's great! Python is..."
                              │
                              ▼
                    Save AI Message
                              │
                              ▼
                    Trigger Analysis (Background)
                              │
                              ├──> Extract Topics: ["Python"]
                              ├──> Analyze Sentiment: "positive"
                              ├──> Update UserMemory
                              └──> Save Analytics
                              │
                              ▼
                    Return Response to User
```

### Scenario 2: User Uploads File

```
User uploads: "report.pdf" + message: "Here's the report"
         │
         ▼
    [API Route]
         │
         ▼
  Save Message with Attachment
  {
    content: "Here's the report",
    attachments: [{
      filename: "report.pdf",
      url: "...",
      type: "document",
      mimeType: "application/pdf",
      uploadedAt: Date,
      // ... other metadata
    }]
  }
         │
         ▼
  [AI Service] generates response
         │
         ├──────────────────────────┐
         ▼                          ▼
  [Memory Service]          [Attachment Service]
  getPersonalizedContext()   buildAttachmentContext()
         │                          │
         │  ┌─────────────────────> │
         │  │                       │
         │  │  Get Current Conversation Attachments
         │  │  ├─> report.pdf (just uploaded)
         │  │  │
         │  │  Get Recent Past Attachments
         │  │  └─> spec.doc (uploaded 3 days ago)
         │  │
         │  │  Build Context:
         │  │  "=== ATTACHMENTS IN THIS CONVERSATION ===
         │  │   Files (1):
         │  │   1. 'report.pdf' - Just uploaded
         │  │   
         │  │   === RECENT ATTACHMENTS FROM PAST ===
         │  │   1. document: 'spec.doc' (uploaded 3 days ago)"
         │  │
         │  └─────────────────────────┐
         │                            │
         ▼                            ▼
    Combined Context ──────> AI receives full context
                             │
                             ▼
                    "I've received your report.pdf.
                     Would you like me to review it 
                     along with spec.doc you uploaded earlier?"
                             │
                             ▼
                    Save Response + Analyze
```

### Scenario 3: Cross-Conversation Memory

```
CONVERSATION 1 (Yesterday):
User: [uploads landscape.png] "Generate a landscape"
AI: "Here's your landscape image!"
   │
   └──> Saved in DB with prompt metadata
        Analysis: topics=["image generation", "landscape"]

CONVERSATION 2 (Today):
User: "Can you make another landscape like yesterday?"
   │
   ▼
[AI Service] needs to respond
   │
   ├──────────────────────────────┐
   ▼                              ▼
[Memory Service]         [Attachment Service]
   │                              │
   ├─> Get UserMemory             │
   │   - Recent topics: ["image generation", "landscape"]
   │   - Active projects: "Image generation"
   │                              │
   └─────────────┐                │
                 │                │
                 │   Get Recent Attachments
                 │   └─> landscape.png (yesterday)
                 │       prompt: "Generate a landscape"
                 │                │
                 ▼                ▼
         Combined Context:
         "User recently discussed: image generation, landscape
          Recent attachments:
          1. image: 'landscape.png' (generated from: 'Generate a landscape')"
                 │
                 ▼
         AI Response:
         "I'll create another landscape similar to the one
          I generated yesterday. Would you like the same style?"
```

## 🎯 Memory Building Process

```
Message 1: "I'm working on a Django project"
    ↓
┌─────────────────────────────────────────────┐
│ Analysis:                                   │
│ • Topics: ["Django", "Python", "web"]       │
│ • Sentiment: neutral                        │
│ • Type: statement                           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ UserMemory Update:                          │
│ • Add topic "Django" (frequency: 1)         │
│ • Add topic "Python" (frequency: 1)         │
│ • Add to recentContext                      │
│ • Add to activeTopics                       │
└─────────────────────────────────────────────┘

Message 2: "I need help with React components"
    ↓
┌─────────────────────────────────────────────┐
│ Analysis:                                   │
│ • Topics: ["React", "components", "frontend"]│
│ • Sentiment: neutral                        │
│ • Type: question                            │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ UserMemory Update:                          │
│ • Add topic "React" (frequency: 1)          │
│ • Update behavioralPatterns:                │
│   - questionTypes: ["help request"]         │
│ • Update predictions:                       │
│   - likelyQuestions: ["How do I..."]        │
└─────────────────────────────────────────────┘

Message 3: "Thanks! That was helpful" + 👍
    ↓
┌─────────────────────────────────────────────┐
│ Feedback Analysis:                          │
│ • Type: positive                            │
│ • Context: "React components"               │
│ • Topics: ["React", "components"]           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ UserMemory Update:                          │
│ • Add to feedbackHistory.positiveResponses  │
│ • Increase "React" topic interest           │
│ • Update predictions for React topics       │
│ • Learn: User likes React help              │
└─────────────────────────────────────────────┘

After 10 conversations...
    ↓
┌─────────────────────────────────────────────┐
│ UserMemory Now Contains:                    │
│                                             │
│ preferences:                                │
│   topicInterests: [                         │
│     { topic: "Python", frequency: 15 }      │
│     { topic: "React", frequency: 12 }       │
│     { topic: "Django", frequency: 8 }       │
│   ]                                         │
│   communicationStyle: {                     │
│     preferredTone: "casual",                │
│     preferredLength: "detailed"             │
│   }                                         │
│                                             │
│ behavioralPatterns:                         │
│   commonQuestionTypes: [                    │
│     "how-to questions",                     │
│     "debugging help",                       │
│     "best practices"                        │
│   ]                                         │
│                                             │
│ predictions:                                │
│   likelyQuestions: [                        │
│     "How do I optimize React components?",  │
│     "What's the best way to structure Django?",│
│     "Can you help debug this code?"         │
│   ]                                         │
│                                             │
│ statistics:                                 │
│   totalConversations: 10                    │
│   totalMessages: 87                         │
│   mostDiscussedTopic: "Python"              │
│   attachmentStats: {                        │
│     totalAttachments: 15,                   │
│     byType: { image: 8, document: 5, file: 2 }│
│   }                                         │
└─────────────────────────────────────────────┘
```

## 📦 Component Interactions

```
┌────────────────────────────────────────────────────────────────────┐
│                         Component Map                              │
│                                                                    │
│  ┌──────────────┐                                                 │
│  │   Message    │────┐                                            │
│  │   Created    │    │                                            │
│  └──────────────┘    │                                            │
│                      ▼                                            │
│               ┌─────────────┐                                     │
│               │   SERVER    │                                     │
│               │   ROUTES    │                                     │
│               └──────┬──────┘                                     │
│                      │                                            │
│         ┌────────────┼────────────┐                               │
│         │            │            │                               │
│         ▼            ▼            ▼                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │   AI     │ │  Memory  │ │Attachment│                         │
│  │ Service  │ │ Service  │ │ Service  │                         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                         │
│       │            │            │                                │
│       │     ┌──────┴──────┐     │                                │
│       │     │  UserMemory │     │                                │
│       │     │   Model     │     │                                │
│       │     └──────┬──────┘     │                                │
│       │            │            │                                │
│       │     ┌──────┴──────┐     │                                │
│       │     │Conversation │     │                                │
│       │     │ Analytics   │     │                                │
│       │     └─────────────┘     │                                │
│       │                         │                                │
│       └────────────┬────────────┘                                │
│                    │                                              │
│                    ▼                                              │
│            ┌──────────────┐                                      │
│            │   Response   │                                      │
│            │   Generated  │                                      │
│            └──────────────┘                                      │
└────────────────────────────────────────────────────────────────────┘
```

## 🔍 Attachment Context Building

```
Input: userId="user123", conversationId="conv456"
    │
    ▼
┌─────────────────────────────────────────────┐
│ Step 1: Get Current Conversation Attachments│
└────────────────┬────────────────────────────┘
                 │
                 ▼
    Query: Message.find({ 
        conversationId: "conv456",
        'attachments.0': { $exists: true }
    })
                 │
                 ▼
    Result: [
        { 
            attachments: [
                { filename: "report.pdf", type: "document" },
                { filename: "graph.png", type: "image" }
            ]
        }
    ]
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Step 2: Get Recent Past Attachments        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
    Query: Get user's last 10 conversations
           with attachments
                 │
                 ▼
    Result: [
        { filename: "spec.docx", conversationId: "conv123" },
        { filename: "logo.png", conversationId: "conv234" }
    ]
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Step 3: Build Context String               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
    Context = "
    
    === ATTACHMENTS IN THIS CONVERSATION ===
    
    Images (1):
    1. 'graph.png' - Uploaded 2 minutes ago
    
    Files/Documents (1):
    1. 'report.pdf' - Content: 'Project analysis shows...'
    
    === RECENT ATTACHMENTS FROM PAST CONVERSATIONS ===
    (The user has uploaded/generated these recently)
    1. document: 'spec.docx' (uploaded 3 days ago)
    2. image: 'logo.png' (uploaded 5 days ago)
    "
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ Step 4: Return Context to Memory Service   │
└────────────────┬────────────────────────────┘
                 │
                 ▼
    Used in AI prompt for contextual responses
```

## 📈 Statistics Flow

```
User Activity
    │
    ├─> Messages Sent ──────> statistics.totalMessages++
    ├─> Conversations ──────> statistics.totalConversations++
    ├─> Topics Discussed ───> preferences.topicInterests[]
    ├─> Attachments ────────> statistics.attachmentStats.total++
    ├─> Feedback Given ─────> feedbackHistory.totalFeedbackCount++
    │
    ▼
┌────────────────────────────────────────┐
│  Learning Progress Score               │
│                                        │
│  = patternsIdentified * 5              │
│  + preferencesLearned * 10             │
│  + conversationsAnalyzed * 2           │
│  + feedbackReceived * 5                │
│                                        │
│  (Max: 100)                            │
└────────────────────────────────────────┘
    │
    ▼
Displayed to user via /api/memory/learning-progress
```

## 🎨 Color-Coded Flow

```
🟦 USER INPUT
    ↓
🟩 API LAYER
    ↓
🟨 SERVICE LAYER (AI + Memory + Attachment)
    ↓
🟧 DATABASE LAYER (Models & Collections)
    ↓
🟪 ANALYSIS & LEARNING
    ↓
🟦 ENHANCED RESPONSE TO USER
```

---

## 📊 Summary Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPLETE MEMORY SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT                                                      │
│  • Messages                                                 │
│  • Attachments                                              │
│  • Feedback                                                 │
│                                                             │
│  PROCESSING                                                 │
│  • Topic Extraction                                         │
│  • Sentiment Analysis                                       │
│  • Pattern Detection                                        │
│  • Attachment Analysis                                      │
│  • Context Building                                         │
│                                                             │
│  STORAGE                                                    │
│  • UserMemory (preferences, patterns, predictions)          │
│  • ConversationAnalytics (topics, sentiment, metrics)       │
│  • Enhanced Messages (rich attachment metadata)             │
│                                                             │
│  OUTPUT                                                     │
│  • Personalized AI Responses                                │
│  • Context-Aware Suggestions                                │
│  • Attachment References                                    │
│  • Predictive Insights                                      │
│                                                             │
│  CONTINUOUS LEARNING                                        │
│  • Feedback Loop                                            │
│  • Pattern Refinement                                       │
│  • Prediction Updates                                       │
│  • Memory Expansion                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**This visual guide shows how all components work together to create a comprehensive memory system!** 🎨
