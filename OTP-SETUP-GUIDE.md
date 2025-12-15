# OTP-Based Authentication Setup Guide

## Overview
Your application now uses **OTP (One-Time Password) email verification** for both signup and login instead of traditional password authentication.

## How It Works

### Sign Up Flow
1. User enters **username** and **email**
2. System sends a 6-digit OTP to the email address
3. User enters the OTP received in their email
4. Upon verification, account is created and user is logged in

### Login Flow
1. User enters their **email address**
2. System sends a 6-digit OTP to the email address
3. User enters the OTP received in their email
4. Upon verification, user is logged in

## Email Configuration

### Development Mode (Default)
By default, the system runs in **development mode**. OTPs are displayed in the server console instead of being sent via email.

When you run the server, you'll see output like this:
```
========================================
📧 OTP EMAIL (Development Mode)
========================================
To: user@example.com
Username: johndoe
OTP Code: 123456
Valid for: 10 minutes
========================================
```

### Production Mode (Real Email Sending)
To send actual emails in production, add these environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

#### Supported Email Services
- `gmail` - Gmail (requires App Password)
- `outlook` - Outlook/Hotmail
- `yahoo` - Yahoo Mail
- Any SMTP service

#### Gmail Setup (Most Common)
1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an "App Password" for nodemailer
4. Use that app password in `EMAIL_PASSWORD`

**Never use your regular Gmail password!**

## Features

### Security Features
- ✅ OTP expires after 10 minutes
- ✅ Maximum 5 verification attempts per OTP
- ✅ Rate limiting: 1 OTP request per minute
- ✅ Email validation
- ✅ Duplicate account prevention

### User Experience
- ✅ Resend OTP functionality with 60-second cooldown
- ✅ Change email option during verification
- ✅ Clear error messages
- ✅ Success notifications
- ✅ Auto-focus on OTP input
- ✅ 6-digit OTP format validation

## API Endpoints

### Sign Up
**POST** `/api/auth/signup/request-otp`
```json
{
  "username": "johndoe",
  "email": "john@example.com"
}
```

**POST** `/api/auth/signup/verify-otp`
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Login
**POST** `/api/auth/login/request-otp`
```json
{
  "email": "john@example.com"
}
```

**POST** `/api/auth/login/verify-otp`
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Resend OTP
**POST** `/api/auth/resend-otp`
```json
{
  "email": "john@example.com"
}
```

## Testing

### In Development
1. Start the server: `npm start` or `npm run dev`
2. Open the application in your browser
3. Click "Sign Up" or "Sign In"
4. Enter username and email
5. Check the **server console** for the OTP code
6. Copy the OTP from console and paste it in the verification screen
7. Complete authentication

### In Production
Same flow, but OTP will be sent to the actual email address.

## Database Changes

New fields added to User model:
- `otp` - Stores the current OTP
- `otpExpires` - OTP expiration timestamp
- `otpAttempts` - Number of failed verification attempts
- `lastOtpSent` - Rate limiting timestamp

## Troubleshooting

### "OTP not received in email" (Production)
- Check email service configuration in `.env`
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Check spam/junk folder
- Ensure 2FA is enabled and App Password is used (for Gmail)

### "Invalid OTP"
- Ensure OTP is exactly 6 digits
- Check that OTP hasn't expired (10 minutes)
- OTP is case-sensitive (only numbers)
- Try requesting a new OTP with "Resend OTP"

### "Too many failed attempts"
- Maximum 5 attempts per OTP
- Request a new OTP using "Resend OTP" button

### "Please wait before requesting another OTP"
- Rate limit is 60 seconds between OTP requests
- Wait for the cooldown timer to complete

## Migration Notes

The system still supports the old User model with password fields, but new users will use OTP authentication. Old users with passwords can continue to use OAuth (Google/GitHub) if configured.

## Security Best Practices

1. **Never commit** `.env` file to version control
2. Use **App Passwords** for email services, never regular passwords
3. Monitor OTP requests for abuse
4. Consider adding CAPTCHA for production
5. Implement IP-based rate limiting for additional security

## Next Steps

1. ✅ OTP authentication is fully implemented
2. ⏭️ Configure email service for production
3. ⏭️ Test thoroughly with real email addresses
4. ⏭️ Consider adding OAuth (Google/GitHub) for alternative login
5. ⏭️ Add forgot username feature
6. ⏭️ Implement email change with verification

## Support

For issues or questions:
1. Check server console logs
2. Verify MongoDB connection
3. Test email service configuration
4. Review error messages in the UI

---

**Authentication is now secure and user-friendly with OTP verification! 🎉**
