const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = process.env.JWT_SECRET || "distributed_secret_key";
const PORT = process.env.PORT || 5001;

// ─────────────────────────────────────────────
// DATABASE SETUP
// ─────────────────────────────────────────────
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'chatuser',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME     || 'chatdb',
    port:     5432,
});

async function connectWithRetry(maxRetries = 30) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            client.release();
            console.log('[Auth-DB] Connected to PostgreSQL');
            return true;
        } catch (err) {
            console.log(`[Auth-DB] Connection attempt ${attempt}/${maxRetries} failed:`, err.message);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
}

connectWithRetry();

// ─────────────────────────────────────────────
// EMAIL SETUP
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'yourgmail@gmail.com',
        pass: process.env.EMAIL_PASS || 'abcd efgh ijkl mnop'
    }
});

// ─────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────
async function sendWelcomeEmail(email, displayName, username) {
    try {
        await transporter.sendMail({
            from: '"DistroChat Auth" <no-reply@distrochat.io>',
            to: email,
            subject: 'Welcome to DistroChat! 👋',
            html: `<h2>Welcome, ${displayName}!</h2><p>Your account ${username} is ready.</p>`
        });
    } catch (err) { console.warn('Email failed:', err.message); }
}

async function sendLoginEmail(email, displayName, username) {
    try {
        await transporter.sendMail({
            from: '"DistroChat Auth" <no-reply@distrochat.io>',
            to: email,
            subject: 'New Login Detected 🔐',
            html: `<p>Hi ${displayName}, a new login was made to <b>${username}</b>.</p>`
        });
    } catch (err) { console.warn('Email failed:', err.message); }
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
app.post('/register', async (req, res) => {
    const { username, password, email, displayName } = req.body;

    if (!username || !password || !email || !displayName) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username.toLowerCase(), email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (username, password_hash, email, display_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, display_name, created_at',
            [username.toLowerCase().trim(), password_hash, email.toLowerCase().trim(), displayName.trim()]
        );

        sendWelcomeEmail(email, displayName, username);

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase().trim()]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { user_id: user.id, username: user.username, email: user.email, displayName: user.display_name },
            SECRET,
            { expiresIn: '24h' }
        );

        sendLoginEmail(user.email, user.display_name, user.username);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                createdAt: user.created_at
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// VERIFY
// ─────────────────────────────────────────────
app.get('/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        res.json({ valid: true, user: decoded });
    } catch {
        res.status(401).json({ valid: false });
    }
});

// New endpoint for member discovery
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT username, display_name as "displayName", created_at as "createdAt" FROM users ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auth Server running on port ${PORT}`);
});