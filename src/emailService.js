const nodemailer = require('nodemailer');

// Helper to access nested properties: getValue(data, "invoice.id")
function getValue(obj, path) {
    if (!path) return undefined;
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return undefined;
        }

        // Auto-parse string if we are trying to access a child property
        if (typeof current === 'string') {
            try {
                const parsed = JSON.parse(current);
                if (parsed && typeof parsed === 'object') {
                    current = parsed;
                }
            } catch (e) {
                // Not JSON, can't traverse
                return undefined;
            }
        }

        current = current[key];
    }
    return current;
}

// Render a string template with data
function renderString(template, data) {
    if (!template) return '';

    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const val = getValue(data, key.trim());

        if (Array.isArray(val)) {
            return val.join(', ');
        }

        return val !== undefined && val !== null ? val : ''; // Return empty string if undefined, NOT the original {{key}} to avoid leaking syntax
    });
}

function createTransporter(config) {
    // config structure: { host, port, secure, user, pass, fromName, fromEmail }
    return nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port, 10),
        secure: config.secure, // true for 465, false for other ports
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
}

async function verifyConnection(config) {
    const transporter = createTransporter(config);
    try {
        await transporter.verify();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function sendEmail(config, emailTemplate, data) {
    // emailTemplate: { to, subject, body, isHtml }
    const transporter = createTransporter(config);

    // Render fields
    const to = renderString(emailTemplate.to, data);
    const subject = renderString(emailTemplate.subject, data);
    const content = renderString(emailTemplate.body, data);

    const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: to,
        subject: subject,
    };

    if (emailTemplate.isHtml) {
        mailOptions.html = content;
    } else {
        mailOptions.text = content;
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId, rendered: { to, subject, content } };
    } catch (error) {
        console.error("Email send error:", error);
        return { success: false, error: error.message, rendered: { to, subject, content } };
    }
}

module.exports = {
    verifyConnection,
    sendEmail,
    renderString
};
