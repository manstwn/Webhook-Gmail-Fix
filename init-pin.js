const db = require('./src/db');

const newPin = process.argv[2];

if (!newPin) {
    console.error('Usage: node init-pin.js <NEW_PIN>');
    process.exit(1);
}

// Ensure data dir exists
db.ensureDataDir();

// Update PIN
const success = db.write('users', { pin: newPin });

if (success) {
    console.log(`✅ PIN updated successfully to: ${newPin}`);
} else {
    console.error('❌ Failed to update PIN.');
    process.exit(1);
}
