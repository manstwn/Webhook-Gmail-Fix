const db = require('./db');

const COOKIE_NAME = 'webhook_auth';

// Middleware to protect routes
function requireAuth(req, res, next) {
    if (req.signedCookies[COOKIE_NAME]) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

// Logic for login
function login(req, res) {
    const { pin } = req.body;
    const settings = db.read('settings');

    // Simple PIN check
    if (pin === settings.pin) {
        // Set signed cookie
        res.cookie(COOKIE_NAME, 'authenticated', {
            httpOnly: true,
            signed: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'strict'
        });
        return res.json({ success: true });
    }

    return res.status(401).json({ error: 'Invalid PIN' });
}

// Logic for logout
function logout(req, res) {
    res.clearCookie(COOKIE_NAME);
    return res.json({ success: true });
}

// Check auth status
function check(req, res) {
    if (req.signedCookies[COOKIE_NAME]) {
        return res.json({ authenticated: true });
    }
    return res.json({ authenticated: false });
}

module.exports = {
    requireAuth,
    login,
    logout,
    check
};
