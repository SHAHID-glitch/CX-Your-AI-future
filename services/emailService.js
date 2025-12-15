const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
    // For production, use environment variables
    // For development/testing, use ethereal email (fake SMTP service)
    
    if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        // Production email configuration
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'outlook', 'yahoo'
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    } else {
        // Development: Use console logging instead of actual email
        console.log('⚠️  Email service not configured. OTPs will be logged to console.');
        return null;
    }
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, username = '') => {
    try {
        const transporter = createTransporter();
        
        // If no transporter, just log the OTP (development mode)
        if (!transporter) {
            console.log('\n========================================');
            console.log('📧 OTP EMAIL (Development Mode)');
            console.log('========================================');
            console.log(`To: ${email}`);
            console.log(`Username: ${username || 'New User'}`);
            console.log(`OTP Code: ${otp}`);
            console.log(`Valid for: 10 minutes`);
            console.log('========================================\n');
            return { success: true, mode: 'development' };
        }

        // HTML email template
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #0084ff, #00c6ff); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .otp-box { background: #f8f9fa; border: 2px dashed #0084ff; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
                    .otp-code { font-size: 36px; font-weight: bold; color: #0084ff; letter-spacing: 8px; font-family: 'Courier New', monospace; }
                    .message { color: #333; line-height: 1.6; font-size: 16px; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .warning p { margin: 0; color: #856404; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 CopilotX Verification</h1>
                    </div>
                    <div class="content">
                        <p class="message">Hello ${username || 'there'},</p>
                        <p class="message">Thank you for using CopilotX! To complete your authentication, please use the following One-Time Password (OTP):</p>
                        
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                            <p style="margin: 10px 0 0 0; color: #666;">Valid for 10 minutes</p>
                        </div>
                        
                        <p class="message">Enter this code in the verification screen to proceed.</p>
                        
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong> Never share this code with anyone. CopilotX staff will never ask for your OTP.</p>
                        </div>
                        
                        <p class="message">If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 CopilotX - Your AI Future</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@copilotx.com',
            to: email,
            subject: 'Your CopilotX Verification Code',
            html: htmlContent,
            text: `Your CopilotX verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ OTP email sent to ${email}`);
        return { success: true, mode: 'production' };
    } catch (error) {
        console.error('❌ Error sending OTP email:', error);
        throw new Error('Failed to send OTP email. Please try again.');
    }
};

// Send welcome email (optional)
const sendWelcomeEmail = async (email, username) => {
    try {
        const transporter = createTransporter();
        
        if (!transporter) {
            console.log(`📧 Welcome email would be sent to ${email}`);
            return { success: true, mode: 'development' };
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #2ea043, #10b981); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .message { color: #333; line-height: 1.6; font-size: 16px; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to CopilotX!</h1>
                    </div>
                    <div class="content">
                        <p class="message">Hi ${username},</p>
                        <p class="message">Welcome aboard! Your account has been successfully created and verified.</p>
                        <p class="message">You can now enjoy all the features of CopilotX AI chat assistant.</p>
                        <p class="message">Happy chatting! 🚀</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 CopilotX - Your AI Future</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@copilotx.com',
            to: email,
            subject: 'Welcome to CopilotX!',
            html: htmlContent,
            text: `Hi ${username},\n\nWelcome to CopilotX! Your account has been successfully created.\n\nHappy chatting!`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to ${email}`);
        return { success: true, mode: 'production' };
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        // Don't throw error for welcome email failures
        return { success: false };
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, username = '') => {
    try {
        const transporter = createTransporter();
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        
        // If no transporter, just log the reset link (development mode)
        if (!transporter) {
            console.log('\n========================================');
            console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
            console.log('========================================');
            console.log(`To: ${email}`);
            console.log(`Username: ${username || 'User'}`);
            console.log(`Reset Link: ${resetLink}`);
            console.log(`Valid for: 1 hour`);
            console.log('========================================\n');
            return { success: true, mode: 'development' };
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #ff6b6b, #ee5a6f); padding: 30px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 28px; }
                    .content { padding: 40px 30px; }
                    .message { color: #333; line-height: 1.6; font-size: 16px; }
                    .button-container { text-align: center; margin: 30px 0; }
                    .reset-button { display: inline-block; background: linear-gradient(135deg, #ff6b6b, #ee5a6f); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
                    .reset-button:hover { opacity: 0.9; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .warning p { margin: 0; color: #856404; font-size: 14px; }
                    .code-box { background: #f0f0f0; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; word-break: break-all; font-size: 12px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p class="message">Hello ${username || 'there'},</p>
                        <p class="message">We received a request to reset your password for your CopilotX account. Click the button below to create a new password:</p>
                        
                        <div class="button-container">
                            <a href="${resetLink}" class="reset-button">Reset Password</a>
                        </div>
                        
                        <p class="message" style="text-align: center; font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
                        <div class="code-box">${resetLink}</div>
                        
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong> This link is valid for 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                        </div>
                        
                        <p class="message">If you have any issues, please contact our support team.</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 CopilotX - Your AI Future</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@copilotx.com',
            to: email,
            subject: 'Password Reset Request - CopilotX',
            html: htmlContent,
            text: `Hello ${username || 'there'},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link is valid for 1 hour.\n\nIf you didn't request this reset, please ignore this email.`
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
        return { success: true, mode: 'production' };
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        throw new Error('Failed to send password reset email. Please try again.');
    }
};

module.exports = {
    generateOTP,
    sendOTPEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail
};
