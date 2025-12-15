# OAuth Setup Instructions

## 🚀 Quick Setup for Google and GitHub OAuth

Follow these step-by-step instructions to get your OAuth credentials:

---

## 🔵 GOOGLE OAUTH SETUP

### Step 1: Go to Google Cloud Console
Open: https://console.cloud.google.com/

### Step 2: Create a New Project
1. Click the project dropdown at the top
2. Click "NEW PROJECT"
3. Project name: **Copilot Chat**
4. Click "CREATE"
5. Wait for project creation (may take a few seconds)
6. Select your new project from the dropdown

### Step 3: Enable Google+ API
1. Click the hamburger menu (☰) → "APIs & Services" → "Library"
2. Search for: **Google+ API**
3. Click on it
4. Click "ENABLE"

### Step 4: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select: **External**
3. Click "CREATE"
4. Fill in required fields:
   - App name: **Copilot Chat**
   - User support email: **your-email@example.com**
   - Developer contact: **your-email@example.com**
5. Click "SAVE AND CONTINUE"
6. Skip "Scopes" → Click "SAVE AND CONTINUE"
7. Skip "Test users" → Click "SAVE AND CONTINUE"
8. Click "BACK TO DASHBOARD"

### Step 5: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Application type: **Web application**
4. Name: **Copilot Chat Web Client**
5. Under "Authorized redirect URIs", click "ADD URI"
6. Add: `http://localhost:3000/api/auth/google/callback`
7. (Optional for production) Add: `https://yourdomain.com/api/auth/google/callback`
8. Click "CREATE"

### Step 6: Copy Your Credentials
You'll see a popup with:
- **Client ID**: Something like `123456789-abcdefg.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abcdefghijklmnop`

**Copy these to your `.env` file:**
```env
GOOGLE_CLIENT_ID=paste-client-id-here
GOOGLE_CLIENT_SECRET=paste-client-secret-here
```

✅ Google OAuth setup complete!

---

## 🐙 GITHUB OAUTH SETUP

### Step 1: Go to GitHub Developer Settings
Open: https://github.com/settings/developers

Or:
1. Click your profile picture (top right)
2. Settings
3. Developer settings (bottom of sidebar)
4. OAuth Apps

### Step 2: Register New OAuth App
1. Click "New OAuth App" (or "Register a new application")
2. Fill in the form:

   **Application name:**
   ```
   Copilot Chat
   ```

   **Homepage URL:**
   ```
   http://localhost:3000
   ```

   **Application description (optional):**
   ```
   AI-powered chat application with Copilot
   ```

   **Authorization callback URL:**
   ```
   http://localhost:3000/api/auth/github/callback
   ```

3. Click "Register application"

### Step 3: Generate Client Secret
1. You'll see your **Client ID** immediately
2. Click "Generate a new client secret"
3. **IMPORTANT**: Copy the secret immediately! You won't be able to see it again.

### Step 4: Copy Your Credentials
- **Client ID**: Something like `Iv1.1234abcd5678efgh`
- **Client Secret**: Something like `abcdef1234567890abcdef1234567890abcdef12`

**Copy these to your `.env` file:**
```env
GITHUB_CLIENT_ID=paste-client-id-here
GITHUB_CLIENT_SECRET=paste-client-secret-here
```

✅ GitHub OAuth setup complete!

---

## 🔐 Complete .env Configuration

Your `.env` file should now look like this:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/copilot-chat
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE

# JWT & Session Secrets (generate random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
SESSION_SECRET=your-super-secret-session-key-change-this-to-random-string

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=Iv1.1234abcd5678efgh
GITHUB_CLIENT_SECRET=abcdef1234567890abcdef1234567890abcdef12
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# OpenAI (Optional)
OPENAI_API_KEY=sk-your-openai-api-key
```

---

## 🗄️ MongoDB Setup Options

### Option 1: Local MongoDB (Recommended for Development)

**Windows:**
1. Download: https://www.mongodb.com/try/download/community
2. Install MongoDB Community Server
3. MongoDB will start automatically as a service
4. Connection string: `mongodb://localhost:27017/copilot-chat`

**macOS (with Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Docker (All Platforms):**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option 2: MongoDB Atlas (Cloud - Free Tier Available)

1. Go to: https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Create an account (or sign in)
4. Create a cluster:
   - Choose "Shared" (Free)
   - Select cloud provider and region (closest to you)
   - Cluster Name: `copilot-chat`
   - Click "Create Cluster"
5. Set up security:
   - Database Access: Create a database user
     - Username: `your-db-username`
     - Password: Generate a secure password (save it!)
     - User Privileges: "Atlas admin"
   - Network Access: Add IP Address
     - Click "Add IP Address"
     - Click "Allow Access from Anywhere" (for development)
     - Or add your specific IP address
6. Connect to your cluster:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `myFirstDatabase` with `copilot-chat`

Example connection string:
```
mongodb+srv://<username>:<password>@<your-cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

---

## ✅ Verification Checklist

After completing all steps above:

- [ ] Google OAuth app created
- [ ] Google Client ID added to `.env`
- [ ] Google Client Secret added to `.env`
- [ ] GitHub OAuth app created
- [ ] GitHub Client ID added to `.env`
- [ ] GitHub Client Secret added to `.env`
- [ ] Session secret added to `.env`
- [ ] MongoDB installed/configured
- [ ] MongoDB URI added to `.env`

---

## 🧪 Test Your Setup

Run the verification script:
```bash
node test-auth.js
```

If all checks pass ✅, you're ready to start the server!

```bash
npm start
```

Then open: http://localhost:3000/auth.html

---

## 🆘 Common Issues

### "Redirect URI Mismatch" Error
**Problem**: OAuth callback URL doesn't match
**Solution**: 
- Check that callback URLs in OAuth apps exactly match URLs in `.env`
- No trailing slashes
- Correct port number (3000)

### "Invalid Client" Error
**Problem**: Client ID or Secret is incorrect
**Solution**: 
- Double-check credentials in `.env`
- Make sure no extra spaces
- Try regenerating client secret

### MongoDB Connection Error
**Problem**: Can't connect to MongoDB
**Solution**:
- If using local: Make sure MongoDB service is running
- If using Atlas: Whitelist your IP address
- Check connection string format

### "Cannot find module" Error
**Problem**: Missing dependencies
**Solution**: 
```bash
npm install
```

---

## 🎉 Success!

When everything is set up correctly, you should be able to:
1. ✅ Visit http://localhost:3000/auth.html
2. ✅ See a beautiful login page
3. ✅ Register with email/password
4. ✅ Click "Continue with Google" and login
5. ✅ Click "Continue with GitHub" and login
6. ✅ Be redirected to the main app after login

---

## 📞 Need Help?

If you're stuck:
1. Check `OAUTH-SETUP-GUIDE.md` for more details
2. Run `node test-auth.js` to diagnose issues
3. Check server logs for error messages
4. Verify all credentials in `.env` are correct

---

**Good luck! 🚀**
