// SMS Service for OTP delivery via mobile number
// In development mode, OTPs are logged to console
// In production, integrate with SMS provider (Twilio, AWS SNS, etc.)

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS
const sendOTPSMS = async (mobileNumber, otp, username = '') => {
    try {
        // Check if SMS service is configured
        if (process.env.SMS_SERVICE && process.env.SMS_API_KEY) {
            // Production SMS configuration
            // Example: Twilio, AWS SNS, or other SMS providers
            // TODO: Implement actual SMS sending logic here
            
            console.log('📱 Sending SMS via', process.env.SMS_SERVICE);
            
            // Example Twilio implementation (commented out):
            /*
            const twilio = require('twilio');
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            
            await client.messages.create({
                body: `Your CopilotX verification code is: ${otp}. Valid for 10 minutes. Never share this code.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: mobileNumber
            });
            */
            
            return { success: true, mode: 'production' };
        } else {
            // Development: Log OTP to console
            console.log('\n========================================');
            console.log('📱 SMS OTP (Development Mode)');
            console.log('========================================');
            console.log(`To: ${mobileNumber}`);
            console.log(`Username: ${username || 'New User'}`);
            console.log(`OTP Code: ${otp}`);
            console.log(`Valid for: 10 minutes`);
            console.log(`Message: Your CopilotX verification code is: ${otp}. Valid for 10 minutes. Never share this code.`);
            console.log('========================================\n');
            return { success: true, mode: 'development' };
        }
    } catch (error) {
        console.error('SMS sending error:', error);
        
        // Fallback to console in case of error
        console.log('\n========================================');
        console.log('📱 SMS OTP (Fallback - Error Mode)');
        console.log('========================================');
        console.log(`To: ${mobileNumber}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`Error: ${error.message}`);
        console.log('========================================\n');
        
        return { success: true, mode: 'fallback' };
    }
};

// Send welcome SMS
const sendWelcomeSMS = async (mobileNumber, username) => {
    try {
        if (process.env.SMS_SERVICE && process.env.SMS_API_KEY) {
            // Production SMS configuration
            console.log('📱 Sending welcome SMS via', process.env.SMS_SERVICE);
            
            // TODO: Implement actual SMS sending logic here
            
            return { success: true, mode: 'production' };
        } else {
            // Development: Log to console
            console.log('\n========================================');
            console.log('📱 WELCOME SMS (Development Mode)');
            console.log('========================================');
            console.log(`To: ${mobileNumber}`);
            console.log(`Username: ${username}`);
            console.log(`Message: Welcome to CopilotX, ${username}! Your account has been successfully created. Start exploring the power of AI today!`);
            console.log('========================================\n');
            return { success: true, mode: 'development' };
        }
    } catch (error) {
        console.error('Welcome SMS error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    generateOTP,
    sendOTPSMS,
    sendWelcomeSMS
};
