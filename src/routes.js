const express = require('express');
const router = express.Router();
const db = require('./db');
const auth = require('./auth');
const webhookHandler = require('./webhookHandler');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

const { webhookLimiter, ipLimiter, burstLimiter } = require('./middleware/rateLimiter');

// --- Public Routes ---

// The actual webhook receiving endpoint
router.post('/webhooks/:id', ipLimiter, burstLimiter, webhookLimiter, async (req, res) => {
    const { id } = req.params;
    console.log(`Webhook hit: ${id}`);
    const result = await webhookHandler.processWebhook(id, req.body);

    if (result.error) {
        return res.status(404).json(result);
    }
    return res.json(result);
});

// --- Authentication ---

router.post('/api/login', auth.login);
router.post('/api/logout', auth.logout);
router.get('/api/auth/check', auth.check);

// --- Protected API Routes ---

// Apply auth middleware to all /api routes below this line
router.use('/api', auth.requireAuth);

// Dashboard Data
router.get('/api/dashboard', (req, res) => {
    const webhooks = db.read('webhooks');
    const logs = db.read('logs');
    // Return summary data
    res.json({
        totalWebhooks: webhooks.length,
        activeWebhooks: webhooks.filter(w => w.status === 'Active').length,
        recentLogs: logs.slice(0, 10)
    });
});

// Webhooks Management
router.get('/api/webhooks', (req, res) => {
    const webhooks = db.read('webhooks');
    res.json(webhooks);
});

router.get('/api/webhooks/:id', (req, res) => {
    const webhooks = db.read('webhooks');
    const webhook = webhooks.find(w => w.id === req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Not found' });

    // Ensure payloads array exists
    if (!webhook.payloads) webhook.payloads = [];

    // Determine which payload to use for variables
    let activePayload = null;
    if (webhook.selectedPayloadId) {
        activePayload = webhook.payloads.find(p => p.id === webhook.selectedPayloadId);
    }
    // Fallback to first available or legacy lastPayload
    if (!activePayload && webhook.payloads.length > 0) activePayload = webhook.payloads[0];
    if (!activePayload && webhook.lastPayload) activePayload = { data: webhook.lastPayload };

    // Discover variables
    const variables = activePayload ? webhookHandler.discoverVariables(activePayload.data) : [];
    res.json({ ...webhook, variables, activePayload });
});

router.post('/api/webhooks', (req, res) => {
    const { name } = req.body;
    const webhooks = db.read('webhooks');

    const newWebhook = {
        id: uuidv4(),
        name: name || 'Untitled Webhook',
        status: 'Draft',
        created: new Date().toISOString(),
        lastPayload: null, // Legacy
        payloads: [], // New
        selectedPayloadId: null,
        emailTemplate: {
            to: '',
            subject: '',
            body: '',
            isHtml: false
        },
        senderId: null
    };

    webhooks.push(newWebhook);
    db.write('webhooks', webhooks);
    res.json(newWebhook);
});

router.put('/api/webhooks/:id', (req, res) => {
    const { id } = req.params;
    const changes = req.body;
    const webhooks = db.read('webhooks');
    const index = webhooks.findIndex(w => w.id === id);

    if (index === -1) return res.status(404).json({ error: 'Not found' });

    // Updates
    const updated = { ...webhooks[index], ...changes };
    webhooks[index] = updated;

    if (!db.write('webhooks', webhooks)) {
        return res.status(500).json({ error: 'Failed to write data' });
    }

    res.json(updated);
});

router.delete('/api/webhooks/:id', (req, res) => {
    const { id } = req.params;
    let webhooks = db.read('webhooks');
    webhooks = webhooks.filter(w => w.id !== id);
    db.write('webhooks', webhooks);
    res.json({ success: true });
});

// Regenerate Webhook ID (New URL)
router.post('/api/webhooks/:id/regenerate', (req, res) => {
    const { id } = req.params;
    const webhooks = db.read('webhooks');
    const index = webhooks.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const newId = uuidv4();
    const oldId = webhooks[index].id;
    webhooks[index].id = newId;

    db.write('webhooks', webhooks);
    res.json({ newId, oldId });
});

// Payload Management
router.post('/api/webhooks/:id/payloads', (req, res) => {
    const { id } = req.params;
    const { name, data } = req.body;

    const webhooks = db.read('webhooks');
    const index = webhooks.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const webhook = webhooks[index];
    if (!webhook.payloads) webhook.payloads = [];

    const newPayload = {
        id: uuidv4(),
        name: name || 'Manual Payload',
        source: 'Manual',
        timestamp: new Date().toISOString(),
        data: data || {}
    };

    webhook.payloads.unshift(newPayload);
    webhook.selectedPayloadId = newPayload.id; // Auto select new manual payload

    db.write('webhooks', webhooks);
    res.json(newPayload);
});

router.delete('/api/webhooks/:id/payloads/:payloadId', (req, res) => {
    const { id, payloadId } = req.params;
    const webhooks = db.read('webhooks');
    const index = webhooks.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    const webhook = webhooks[index];
    if (webhook.payloads) {
        webhook.payloads = webhook.payloads.filter(p => p.id !== payloadId);
        if (webhook.selectedPayloadId === payloadId) {
            webhook.selectedPayloadId = webhook.payloads.length > 0 ? webhook.payloads[0].id : null;
        }
    }

    db.write('webhooks', webhooks);
    res.json({ success: true });
});

// Test Email Sending (for verifying config before saving)
router.post('/api/webhooks/:id/test-email', async (req, res) => {
    const { id } = req.params;
    const { emailTemplate, senderId } = req.body; // Allow overriding for test

    const webhooks = db.read('webhooks');
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const emailPark = db.read('email_park');
    const sender = emailPark.find(s => s.id === senderId);
    if (!sender) return res.status(400).json({ error: 'Sender not found' });

    if (!webhook.lastPayload) {
        return res.status(400).json({ error: 'No test data available for this webhook' });
    }

    const result = await emailService.sendEmail(sender, emailTemplate, webhook.lastPayload);
    res.json(result);
});

// Email Park Management
router.get('/api/email-park', (req, res) => {
    const senders = db.read('email_park');
    // Hide passwords? Ideally yes, but for now sending full config back so user can edit.
    // In a real app we'd mask.
    res.json(senders);
});

router.post('/api/email-park', (req, res) => {
    const sender = { ...req.body, id: uuidv4() };
    const senders = db.read('email_park');
    senders.push(sender);
    db.write('email_park', senders);
    res.json(sender);
});

router.put('/api/email-park/:id', (req, res) => {
    const { id } = req.params;
    const senders = db.read('email_park');
    const index = senders.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    senders[index] = { ...senders[index], ...req.body };
    db.write('email_park', senders);
    res.json(senders[index]);
});

router.delete('/api/email-park/:id', (req, res) => {
    const { id } = req.params;
    let senders = db.read('email_park');
    senders = senders.filter(s => s.id !== id);
    db.write('email_park', senders);
    res.json({ success: true });
});

router.post('/api/email-park/test', async (req, res) => {
    const config = req.body;
    const result = await emailService.verifyConnection(config);
    res.json(result);
});

// Logs
router.get('/api/logs', (req, res) => {
    const logs = db.read('logs');
    res.json(logs);
});

router.get('/api/webhooks/:id/logs', (req, res) => {
    const { id } = req.params;
    const logs = db.read('logs');
    const webhookLogs = logs.filter(l => l.webhookId === id);
    res.json(webhookLogs);
});

router.delete('/api/webhooks/:id/logs', (req, res) => {
    const { id } = req.params;
    let logs = db.read('logs');
    logs = logs.filter(l => l.webhookId !== id);
    db.write('logs', logs);
    res.json({ success: true });
});

// Settings / CORS
router.get('/api/settings/cors', (req, res) => {
    const settings = db.read('settings');
    res.json(settings.cors || []);
});

router.post('/api/settings/cors', (req, res) => {
    const { origin } = req.body;
    if (!origin) return res.status(400).json({ error: 'Origin is required' });

    const settings = db.read('settings');
    const cors = settings.cors || ["*"];

    if (!cors.includes(origin)) {
        cors.push(origin);
        settings.cors = cors;
        db.write('settings', settings);
    }

    res.json({ success: true });
});

router.delete('/api/settings/cors', (req, res) => {
    const { origin } = req.body;
    const settings = db.read('settings');
    let cors = settings.cors || ["*"];

    cors = cors.filter(o => o !== origin);
    settings.cors = cors;
    db.write('settings', settings);

    res.json({ success: true });
});

router.get('/api/settings/rate-limit', (req, res) => {
    const settings = db.read('settings');
    res.json(settings.rateLimits || {});
});

router.post('/api/settings/rate-limit', (req, res) => {
    const settings = db.read('settings');
    settings.rateLimits = { ...settings.rateLimits, ...req.body };

    db.write('settings', settings);
    res.json({ success: true });
});

module.exports = router;
