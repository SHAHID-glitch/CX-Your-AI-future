# OTP Not Receiving - Troubleshooting Guide

## Problem
You're not receiving OTP codes when clicking "Send OTP" in copilot-standalone.html

## How OTP Works in Your App

### Development Mode (Current Setup)
Since you have email credentials in `.env`, the app will try to send actual emails. However, if there's any issue, it will fall back to **console logging**.

### Where to Find Your OTP

#### Option 1: Check Your Email
- **Email:** sahidmalik9368@gmail.com
- **Subject:** "Your CopilotX Verification Code"
- **Check:** Inbox and Spam folder

#### Option 2: Check Server Console (Most Reliable)
1. Open the terminal where `npm start` is running
2. Look for output like this:
```
========================================
📧 OTP EMAIL (Development Mode)
========================================
To: your@email.com
Username: YourName
OTP Code: 123456
Valid for: 10 minutes
========================================
```

## Testing Steps

### Step 1: Start the Server
```bash
npm start
```

### Step 2: Test with Simple Page
1. Open `test-otp-simple.html` in your browser
2. Enter your email address
3. Click "Send OTP"
4. **Watch both:**
   - The webpage console output (bottom of page)
   - The terminal where server is running

### Step 3: Check for OTP
- **In Browser:** Look at the console output on the page
- **In Terminal:** Look for the OTP code printed
- **In Email:** Check your inbox

### Step 4: Enter OTP
Once you see the OTP code, enter it in the input field that appears.

## Common Issues & Solutions

### Issue 1: "No account found with this email"
**Solution:** First create an account using the "Sign Up" tab, then try OTP login

### Issue 2: OTP not in email
**Solution:** Check the server terminal - it's printed there in development mode

### Issue 3: Email service errors
**Solution:** The app will automatically fall back to console logging. Check terminal.

### Issue 4: Network errors
**Solutions:**
- Make sure server is running (`npm start`)
- Check that server is on `http://localhost:3000`
- Open browser console (F12) to see errors

## Testing Account Creation

### Using Sign Up Tab:
1. Click "Sign Up" tab
2. Fill in:
   - Username: testuser
   - Email: your@email.com
3. Click "Send OTP"
4. Get OTP from **server terminal**
5. Enter OTP
6. Account created!

### Now Try Login:
1. Click "Sign In" tab  
2. Enter same email
3. Click "Send OTP"
4. Get OTP from **server terminal**
5. Enter OTP
6. Logged in!

## Quick Test Commands

### Test if server is running:
```bash
curl http://localhost:3000/api/auth/test
```

### Check server logs:
Look at the terminal where `npm start` is running

### Test email service manually:
Open `test-otp-simple.html` - it shows real-time logs

## Important Notes

1. **OTP is printed to console in development** - This is by design!
2. **Email sending is optional** - Console logging is the backup
3. **OTP expires in 10 minutes** - Request a new one if expired
4. **Rate limited** - Wait 1 minute between OTP requests

## Files Updated

- ✅ `copilot-standalone.html` - Added better logging and visual OTP input
- ✅ `test-otp-simple.html` - New simple test page with console output
- ✅ Email service already configured in `.env`

## Next Steps

1. **Open** `test-otp-simple.html` in browser
2. **Watch** the server terminal
3. **Enter** your email and click "Send OTP"
4. **Look** at terminal for the OTP code
5. **Enter** the OTP code shown in terminal

The OTP will appear in the server console like this:
```
========================================
📧 OTP EMAIL (Development Mode)
========================================
To: sahidmalik9368@gmail.com
OTP Code: 123456
Valid for: 10 minutes
========================================
```

## Success Indicators

✅ OTP input field appears after clicking "Send OTP"  
✅ Success message shows: "OTP sent! Check your email"  
✅ OTP code appears in server terminal  
✅ Can enter 6-digit code in the centered input field  

If you see the OTP input field but don't know the code, **check your server terminal!**
