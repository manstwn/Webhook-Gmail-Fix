const db = require('./db');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

// Helper to discovery variables from payload
function discoverVariables(payload, prefix = '') {
    let vars = [];

    if (!payload || typeof payload !== 'object') return vars;

    for (const [key, value] of Object.entries(payload)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value)) {
            vars.push({ key: fullKey, type: 'Array', sample: JSON.stringify(value) });
        } else if (value !== null && typeof value === 'object') {
            vars = vars.concat(discoverVariables(value, fullKey));
        } else if (typeof value === 'string') {
            // Try to parse string as JSON to discover nested variables
            try {
                const parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object') {
                    vars = vars.concat(discoverVariables(parsed, fullKey));
                }
            } catch (e) {
                // Not JSON, just a string
            }
            vars.push({ key: fullKey, type: 'string', sample: value });
        } else {
            vars.push({ key: fullKey, type: typeof value, sample: String(value) });
        }
    }
    return vars;
}

async function processWebhook(id, payload) {
    const webhooks = db.read('webhooks');
    const logs = db.read('logs');

    const webhookIndex = webhooks.findIndex(w => w.id === id);
    if (webhookIndex === -1) {
        return { error: 'Webhook not found' };
    }

    const webhook = webhooks[webhookIndex];

    // Always update test data/last payload so user can see what came in
    webhook.lastPayload = payload; // Keep for legacy/summary
    webhook.lastActive = new Date().toISOString();

    // Initialize payloads array if missing
    if (!webhook.payloads) webhook.payloads = [];

    // Add new payload entry
    webhook.payloads.unshift({
        id: uuidv4(),
        name: `Event ${new Date().toLocaleTimeString()}`,
        source: 'Webhook',
        timestamp: new Date().toISOString(),
        data: payload
    });

    // Update available variables based on latest payload
    webhook.variables = discoverVariables(payload);

    // Cap payloads at 50 to prevent file bloat
    if (webhook.payloads.length > 50) webhook.payloads.pop();

    // Auto-select if it's the first one
    if (!webhook.selectedPayloadId && webhook.payloads.length > 0) {
        webhook.selectedPayloadId = webhook.payloads[0].id;
    }

    // Save the webhook update immediately
    // Note: In a high concurrency environment this entire file read-write approach is risky, 
    // but for this app it matches the requirement.
    webhooks[webhookIndex] = webhook;
    db.write('webhooks', webhooks);

    // Create a log entry
    const logEntry = {
        id: uuidv4(),
        webhookId: id,
        webhookName: webhook.name,
        timestamp: new Date().toISOString(),
        payload: payload,
        status: 'Received',
        emailStatus: 'Skipped (Draft)' // Default
    };

    // If active, send email
    if (webhook.status === 'Active') {
        const emailPark = db.read('email_park');
        const sender = emailPark.find(p => p.id === webhook.senderId);

        if (!sender) {
            logEntry.log = 'Error: Sender configuration not found';
            logEntry.emailStatus = 'Failed';
        } else {
            // Attempt to send
            const result = await emailService.sendEmail(sender, webhook.emailTemplate, payload);

            // Capture rendered details even if failed
            if (result.rendered) {
                logEntry.recipient = result.rendered.to;
                logEntry.subject = result.rendered.subject;
                logEntry.body = result.rendered.content;
            }

            if (result.success) {
                logEntry.emailStatus = 'Sent';
                logEntry.messageId = result.messageId;
            } else {
                logEntry.emailStatus = 'Failed';
                logEntry.error = result.error;
            }
        }
    }

    // Save log
    logs.unshift(logEntry); // Add to top
    // Keep logs manageable? Let's cap at 1000 for now or user can clear.
    if (logs.length > 500) logs.pop();

    db.write('logs', logs);

    return { success: true };
}

module.exports = {
    discoverVariables,
    processWebhook
};
