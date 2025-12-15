# Copilot Backend API

A comprehensive Node.js backend for the Copilot AI Chat Application with Express, MongoDB, and OpenAI integration.

## 🚀 Features

- ✅ RESTful API with Express.js
- ✅ MongoDB database integration
- ✅ User authentication with JWT
- ✅ Rate limiting and security
- ✅ OpenAI GPT-4 integration
- ✅ Real-time message handling
- ✅ Conversation management
- ✅ File upload support
- ✅ User settings and preferences
- ✅ Analytics and search
- ✅ Multiple response styles (concise, balanced, detailed, creative)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- OpenAI API key (optional - works with mock responses)

## 🛠️ Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Copy the example env file
copy .env.example .env
```

3. **Edit `.env` file with your configuration:**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/copilot-db
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_jwt_secret_key_here
```

4. **Start MongoDB:**
```bash
# If using local MongoDB
mongod
```

## 🚀 Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Conversations
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation by ID
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/conversations/:id/export` - Export conversation

### Messages
- `POST /api/messages` - Send message and get AI response
- `GET /api/conversations/:id/messages` - Get all messages
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add reaction
- `POST /api/messages/:id/regenerate` - Regenerate AI response

### Utility
- `GET /api/health` - Health check
- `GET /api/search?q=query` - Search conversations
- `POST /api/upload` - Upload file
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `GET /api/analytics` - Get usage analytics

## 📝 API Usage Examples

### Register User
```javascript
POST /api/auth/register
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Send Message
```javascript
POST /api/messages
Headers: {
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
Body: {
  "conversationId": "conv_123",
  "content": "Hello, how can you help me?",
  "responseType": "balanced"
}
```

### Create Conversation
```javascript
POST /api/conversations
Headers: {
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
Body: {
  "title": "My New Chat"
}
```

## 🔧 Configuration

### Response Types
- **concise** - Brief, short answers (150 tokens max)
- **balanced** - Moderate detail (500 tokens max)
- **detailed** - Comprehensive responses (1000 tokens max)
- **creative** - Imaginative, out-of-the-box answers (800 tokens max)

### Rate Limits
- API requests: 100 per 15 minutes
- Authentication: 5 per 15 minutes
- Messages: 50 per minute

## 🗄️ Database Models

### User
- Authentication credentials
- Profile information
- Settings and preferences
- Subscription details

### Conversation
- User reference
- Title and metadata
- Tags and category
- Settings (response type, model, temperature)

### Message
- Conversation reference
- Role (user/assistant)
- Content and attachments
- Reactions and metadata

## 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet.js security headers
- Input validation

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
net start MongoDB
```

### OpenAI API Errors
- Verify API key in `.env` file
- Check API usage limits
- App works with mock responses if no key provided

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

## 📚 Project Structure

```
├── config/
│   └── database.js          # MongoDB configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── rateLimiter.js       # Rate limiting
├── models/
│   ├── User.js              # User model
│   ├── Conversation.js      # Conversation model
│   └── Message.js           # Message model
├── routes/
│   └── auth.js              # Authentication routes
├── services/
│   └── aiService.js         # OpenAI integration
├── .env.example             # Environment variables template
├── package.json             # Dependencies
└── server.js                # Main server file
```

## 🚢 Deployment

### Deploy to Heroku
```bash
heroku create your-app-name
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set OPENAI_API_KEY=your_api_key
heroku config:set JWT_SECRET=your_secret
git push heroku main
```

### Deploy to Vercel
```bash
vercel --prod
```

## 📄 License

MIT License - feel free to use this project for learning and development!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for the Copilot AI Chat Application
