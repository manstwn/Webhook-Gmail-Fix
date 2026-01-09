const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    email_park: path.join(DATA_DIR, 'email_park.json'),
    webhooks: path.join(DATA_DIR, 'webhooks.json'),
    logs: path.join(DATA_DIR, 'logs.json'),
    cors: path.join(DATA_DIR, 'cors.json'),
};

const DEFAULTS = {
    users: { pin: '1234' },
    email_park: [],
    webhooks: [],
    logs: [],
    cors: ["*"]
};

// Ensure data directory and files exist
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    for (const [key, filePath] of Object.entries(FILES)) {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(DEFAULTS[key], null, 2));
        }
    }
}

function read(key) {
    if (!FILES[key]) throw new Error(`Unknown data key: ${key}`);
    try {
        const data = fs.readFileSync(FILES[key], 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${key}:`, err);
        return DEFAULTS[key];
    }
}

function write(key, data) {
    if (!FILES[key]) throw new Error(`Unknown data key: ${key}`);
    try {
        fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error(`Error writing ${key}:`, err);
        return false;
    }
}

module.exports = {
    ensureDataDir,
    read,
    write,
    FILES
};
