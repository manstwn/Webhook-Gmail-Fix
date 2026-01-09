const rateLimit = require('express-rate-limit');
const db = require('../db');

// Helper to get current limits
const getLimits = () => {
    try {
        const settings = db.read('settings');
        return settings.rateLimits || {};
    } catch (e) {
        return {};
    }
};

// Factory function to create dynamic limiters
// Since express-rate-limit options are evaluated at creation, we need a way to reload or use a store that checks DB.
// However, the standard way is to provide a function for `max` or update the instance.
// Simple approach: Middleware wrapper that creates/updates limiter on config change?
// Or better: `max` can be a function/promise.

const ipLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: async (req) => {
        const config = getLimits();
        return config.ipLimit || 60;
    },
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    keyGenerator: (req) => req.params.id, // Rate limit per webhook ID
    max: async (req) => {
        const config = getLimits();
        return config.webhookLimit || 30;
    },
    message: { error: 'Too many requests for this webhook, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const burstLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: async (req) => {
        const config = getLimits();
        return config.burstLimit || 5;
    },
    message: { error: 'Burst limit exceeded, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    ipLimiter,
    webhookLimiter,
    burstLimiter
};
