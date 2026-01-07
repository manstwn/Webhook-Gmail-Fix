const express = require('express');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./src/db');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Data Directory and Default Files
console.log("Initializing data...");
db.ensureDataDir();

// Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ['text/*', 'application/xml', 'application/xhtml+xml', 'html'] })); // Capture text/xml as string body
app.use(cookieParser('webhook-secret-key'));

// Static Files - Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use(routes);

// Configuration Endpoint
app.get('/api/config', (req, res) => {
    let host = process.env.HOST || `http://localhost:${PORT}`;
    if (host.endsWith('/')) host = host.slice(0, -1);

    res.json({ host });
});

// SPA Fallback
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Default login PIN is: 1234`);
});
