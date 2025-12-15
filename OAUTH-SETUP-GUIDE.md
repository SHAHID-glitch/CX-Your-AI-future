# OAuth Authentication Setup Guide

This guide will help you set up Google and GitHub OAuth authentication for the Copilot Chat application.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `passport-github2` - GitHub OAuth strategy
- `express-session` - Session management

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
cp .env.example .env
```

## 🔑 OAuth Provider Setup

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Enter project name (e.g., "Copilot Chat")
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Configure consent screen if prompted:
     - User Type: External
     - App name: Copilot Chat
     - User support email: your email
     - Developer contact: your email
   - Application type: "Web application"
   - Name: "Copilot Chat Web"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)
   - Click "Create"

5. **Copy Credentials to .env**
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
   ```

### GitHub OAuth Setup

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/developers
   - Or: Profile → Settings → Developer settings → OAuth Apps

2. **Register a New OAuth Application**
   - Click "New OAuth App"
   - Application name: "Copilot Chat"
   - Homepage URL: `http://localhost:3000` (development)
   - Application description: "AI-powered chat application"
   - Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
   - Click "Register application"

3. **Generate Client Secret**
   - Click "Generate a new client secret"
   - Copy the client secret immediately (it won't be shown again)

4. **Copy Credentials to .env**
   ```env
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
   ```

## 🗄️ Database Setup

### MongoDB Setup

1. **Local MongoDB**
   ```bash
   # Install MongoDB locally or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **MongoDB Atlas (Cloud)**
   - Visit: https://www.mongodb.com/cloud/atlas
   - Create free cluster
   - Get connection string
   - Update `.env`:
     ```env
     MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE
     ```

3. **Update Database Connection in server.js**
   Add this after the middleware setup:
   ```javascript
   const mongoose = require('mongoose');
   
   mongoose.connect(process.env.MONGODB_URI)
       .then(() => console.log('MongoDB connected'))
       .catch(err => console.error('MongoDB connection error:', err));
   ```

## 🎯 Complete .env Configuration

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/copilot-chat

# JWT & Session
JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-super-secret-session-key-change-this

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# OpenAI (optional)
OPENAI_API_KEY=your-openai-api-key
```

## 🏃 Running the Application

1. **Start MongoDB** (if using local)
   ```bash
   mongod
   ```

2. **Start the Server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

3. **Open the Application**
   - Navigate to: http://localhost:3000/auth.html
   - You should see login/register options with Google and GitHub OAuth buttons

## 🔐 Authentication Flow

### Local Authentication
1. User fills in username/email/password
2. Server creates user in database (password is hashed)
3. JWT token is generated and returned
4. Token is stored in localStorage
5. User is redirected to main app

### OAuth Authentication (Google/GitHub)
1. User clicks "Continue with Google/GitHub"
2. User is redirected to Google/GitHub login
3. User authorizes the application
4. OAuth provider redirects back with authorization code
5. Server exchanges code for user profile
6. Server creates/updates user in database
7. JWT token is generated
8. User is redirected to main app with token

## 📋 API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register new user (local)
- `POST /api/auth/login` - Login user (local)
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### OAuth Endpoints

- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback

## 🧪 Testing Authentication

### Test Local Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Test Local Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Token Verification
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test OAuth
- Open browser: http://localhost:3000/auth.html
- Click "Continue with Google" or "Continue with GitHub"
- Complete OAuth flow

## 🛡️ Security Best Practices

1. **Never commit .env file**
   - Already in .gitignore
   - Use different secrets for production

2. **Use HTTPS in production**
   - Update callback URLs to use https://
   - Set `secure: true` for cookies

3. **Rotate secrets regularly**
   - Change JWT_SECRET periodically
   - Regenerate OAuth client secrets

4. **Rate limiting**
   - Already implemented in middleware
   - Adjust limits in .env

5. **Input validation**
   - Password minimum length: 6 characters
   - Username minimum length: 3 characters
   - Email format validation

## 🐛 Troubleshooting

### "Invalid Credentials" Error
- Check if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Verify callback URLs match exactly in OAuth provider settings

### "User not found" Error
- Make sure MongoDB is running
- Check MONGODB_URI connection string

### Redirect URI Mismatch
- Ensure callback URLs in .env match OAuth provider settings
- Check for trailing slashes

### CORS Errors
- Update CORS_ORIGIN in .env to match frontend URL
- Check server.js CORS configuration

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
GITHUB_CALLBACK_URL=https://yourdomain.com/api/auth/github/callback
```

### Update OAuth Provider Callback URLs
- Add production URLs to authorized redirect URIs
- Keep development URLs for testing

### Security Updates
- Set `secure: true` for cookies in production
- Use strong, unique secrets
- Enable HTTPS only

## 📚 Additional Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Guide](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## 🤝 Support

For issues or questions:
1. Check this documentation
2. Review error logs in console
3. Verify environment variables
4. Check OAuth provider settings

---

Made with ❤️ for Copilot Chat
