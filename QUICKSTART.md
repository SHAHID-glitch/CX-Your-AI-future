# 🚀 Quick Start Guide

Get your Copilot backend up and running in 5 minutes!

## Option 1: Quick Start (Without Database)

If you just want to test the backend quickly without setting up MongoDB:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create .env file
```bash
copy .env.example .env
```

### Step 3: Start the Server
```bash
npm start
```

That's it! The server will run on `http://localhost:3000` with mock responses.

---

## Option 2: Full Setup (With MongoDB & OpenAI)

For production-ready setup with database and AI integration:

### Step 1: Install MongoDB

**Windows:**
1. Download from https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

**Verify MongoDB is running:**
```bash
mongod --version
```

### Step 2: Get OpenAI API Key (Optional)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Configure Environment
```bash
copy .env.example .env
```

Edit `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/copilot-db
OPENAI_API_KEY=sk-your-api-key-here
JWT_SECRET=your-random-secret-here
```

### Step 5: Start the Server
```bash
npm start
```

Or with auto-reload for development:
```bash
npm run dev
```

---

## 🧪 Testing the API

### 1. Test Health Check
Open browser: `http://localhost:3000/api/health`

Or use curl:
```bash
curl http://localhost:3000/api/health
```

### 2. Test with API Client

Create a test HTML file:
```html
<!DOCTYPE html>
<html>
<head>
    <title>API Test</title>
    <script src="api-client.js"></script>
</head>
<body>
    <h1>Copilot API Test</h1>
    <button onclick="testAPI()">Test API</button>
    <pre id="output"></pre>

    <script>
        async function testAPI() {
            const output = document.getElementById('output');
            
            try {
                // Test health
                const health = await fetch('http://localhost:3000/api/health');
                const healthData = await health.json();
                output.textContent = JSON.stringify(healthData, null, 2);
                
                console.log('✅ API is working!', healthData);
            } catch (error) {
                output.textContent = 'Error: ' + error.message;
                console.error('❌ API error:', error);
            }
        }
    </script>
</body>
</html>
```

### 3. Test with Postman or Thunder Client

**Register User:**
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**Create Conversation:**
```
POST http://localhost:3000/api/conversations
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title": "Test Chat"
}
```

**Send Message:**
```
POST http://localhost:3000/api/messages
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "conversationId": "CONVERSATION_ID_HERE",
  "content": "Hello, AI!",
  "responseType": "balanced"
}
```

---

## 🔗 Connect Frontend to Backend

### Step 1: Include API Client
Add to your HTML file before the closing `</body>` tag:
```html
<script src="api-client.js"></script>
```

### Step 2: Update sendMessage Function
Replace the mock `sendMessage()` function with:
```javascript
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to UI
    addMessage(message, 'user');
    input.value = '';

    try {
        // Get or create conversation
        if (!currentConversationId) {
            const conv = await API.Conversations.create('New Chat');
            currentConversationId = conv.conversation.id;
        }

        // Send message to backend
        const result = await API.Messages.send(
            currentConversationId,
            message,
            currentQuickResponse || 'balanced'
        );

        // Add AI response to UI
        addMessage(result.aiMessage.content, 'assistant');

    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('Sorry, there was an error processing your message.', 'assistant');
    }
}
```

### Step 3: Add Global Variables
```javascript
let currentConversationId = null;
let currentQuickResponse = 'balanced';
```

---

## 🐛 Troubleshooting

### Problem: Port 3000 already in use
**Solution:** Change port in `.env` file:
```env
PORT=3001
```

### Problem: MongoDB connection failed
**Solutions:**
1. Check if MongoDB is running: `mongod --version`
2. Start MongoDB service: `net start MongoDB`
3. Use MongoDB Atlas cloud database
4. Comment out MongoDB connection in `server.js` for testing

### Problem: CORS errors in browser
**Solution:** The server already has CORS enabled. Make sure you're using the correct URL.

### Problem: "Cannot find module..."
**Solution:** Run `npm install` again

---

## 📝 Next Steps

1. ✅ Backend is running
2. 📱 Connect your frontend (copilot-standalone.html)
3. 🎨 Customize AI responses in `services/aiService.js`
4. 🔐 Add user authentication to your frontend
5. 📊 Build analytics dashboard
6. 🚀 Deploy to production (Heroku, Vercel, etc.)

---

## 🎉 Success!

Your backend is now running! You can:
- ✅ Create and manage conversations
- ✅ Send messages and get AI responses
- ✅ Search through conversations
- ✅ Manage user settings
- ✅ Upload files
- ✅ Track analytics

**API Documentation:** See README.md for full API reference

**Need help?** Check the troubleshooting section or open an issue.

Happy coding! 🚀
