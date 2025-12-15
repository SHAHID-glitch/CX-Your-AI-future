const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter for API requests
const apiLimiter = new RateLimiterMemory({
    points: 100, // Number of requests
    duration: 15 * 60, // Per 15 minutes
});

// Rate limiter for authentication
const authLimiter = new RateLimiterMemory({
    points: 5, // Number of requests
    duration: 15 * 60, // Per 15 minutes
});

// Rate limiter for message sending
const messageLimiter = new RateLimiterMemory({
    points: 50, // Number of messages
    duration: 60, // Per minute
});

const rateLimitMiddleware = (limiter) => {
    return async (req, res, next) => {
        try {
            // Use IP address or user ID as key
            const key = req.userId || req.ip;
            
            await limiter.consume(key);
            next();
        } catch (error) {
            res.status(429).json({
                success: false,
                error: 'Too many requests, please try again later',
                retryAfter: Math.round(error.msBeforeNext / 1000) || 60
            });
        }
    };
};

module.exports = {
    apiRateLimiter: rateLimitMiddleware(apiLimiter),
    authRateLimiter: rateLimitMiddleware(authLimiter),
    messageRateLimiter: rateLimitMiddleware(messageLimiter)
};
