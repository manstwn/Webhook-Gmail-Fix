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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('webhook-secret-key')); // Secret should be in env but hardcoded for this local tool

// Static Files - Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use(routes);

// Configuration Endpoint
app.get('/api/config', (req, res) => {
    res.json({
        host: process.env.HOST || `http://localhost:${PORT}`
    });
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
