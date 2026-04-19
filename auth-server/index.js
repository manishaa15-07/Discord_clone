const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors({
    origin: [
        'http://localhost:3000',           // for local testing
        'http://172.27.46.115:3000',        // Bhavyanshi's laptop IP
    ],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
const SECRET = "distributed_secret_key";

// ─────────────────────────────────────────────
// EMAIL SETUP
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'manishaachoudhary65@gmail.com',      // your Gmail here
        pass: 'bwje ntis tplu mzzl'       // your App Password here
    }
});

// A helper to check if emails should actually be sent
const isUsingDefaultCredentials = transporter.options.auth.user === 'yourgmail@gmail.com';

const { pool } = require('./db.js');
// ─────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────
async function sendWelcomeEmail(email, displayName, username, userId) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending welcome email to user ID: ${userId}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: '"Discord Clone Auth" <yourgmail@gmail.com>',
            to: email,
            subject: 'Welcome to Discord Clone!',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#7c6ff7;">Welcome, ${displayName}! 👋</h2>
                    <p>Your account has been successfully created.</p>
                    <br/>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px;color:#888;">Username</td>
                            <td style="padding:8px;font-weight:bold;">${username}</td>
                        </tr>
                        <tr style="background:#f9f9f9">
                            <td style="padding:8px;color:#888;">Email</td>
                            <td style="padding:8px;font-weight:bold;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px;color:#888;">Registered At</td>
                            <td style="padding:8px;font-weight:bold;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                    <br/>
                    <p style="color:#888;font-size:13px;">You can now log in and start chatting.</p>
                    <p style="color:#7c6ff7;font-weight:bold;">— Discord Clone Team</p>
                </div>
            `
        });
        console.log(`Welcome email sent to user ID: ${userId}`);
    } catch (err) {
        console.error('Failed to send welcome email:', err.message);
    }
}

async function sendLoginEmail(email, displayName, username, userId) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending login email to user ID: ${userId}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: '"Discord Clone Auth" <yourgmail@gmail.com>',
            to: email,
            subject: 'New Login to Your Account',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#1D9E75;">New Login Detected 🔐</h2>
                    <p>Hi <strong>${displayName}</strong>, a new login was made to your account.</p>
                    <br/>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px;color:#888;">Username</td>
                            <td style="padding:8px;font-weight:bold;">${username}</td>
                        </tr>
                        <tr style="background:#f9f9f9">
                            <td style="padding:8px;color:#888;">Login Time</td>
                            <td style="padding:8px;font-weight:bold;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                    <br/>
                    <p style="color:#e05c5c;font-size:13px;">If this was not you, please reset your password immediately.</p>
                    <p style="color:#1D9E75;font-weight:bold;">— Discord Clone Team</p>
                </div>
            `
        });
        console.log(`Login alert sent to user ID: ${userId}`);
    } catch (err) {
        console.error('Failed to send login email:', err.message);
    }
}

async function sendResetEmail(email, displayName, resetToken, origin = 'http://172.27.46.115:3000', userId) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending reset email to user ID: ${userId}`);
        return;
    }
    // Point back to the React app reset password page, passing the token in the URL query
    const resetLink = `${origin}/reset-password?token=${resetToken}`;

    try {
        await transporter.sendMail({
            from: '"Discord Clone Auth" <yourgmail@gmail.com>',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#e07b39;">Password Reset Request 🔑</h2>
                    <p>Hi <strong>${displayName}</strong>, we received a request to reset your password.</p>
                    <br/>
                    <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
                    <br/>
                    <a href="${resetLink}"
                       style="background:#7c6ff7;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                       Reset My Password
                    </a>
                    <br/><br/>
                    <p style="color:#888;font-size:12px;">If you did not request this, ignore this email. Your password will not change.</p>
                    <p style="color:#888;font-size:12px;">Token (for manual use): <code>${resetToken}</code></p>
                    <p style="color:#e07b39;font-weight:bold;">— Discord Clone Team</p>
                </div>
            `
        });
        console.log(`Password reset email sent to user ID: ${userId}`);
    } catch (err) {
        console.error('Failed to send reset email:', err.message);
    }
}

async function sendPasswordChangedEmail(email, displayName, userId) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending password changed email to user ID: ${userId}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: '"Discord Clone Auth" <yourgmail@gmail.com>',
            to: email,
            subject: 'Your Password Has Been Changed',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#1D9E75;">Password Changed Successfully ✅</h2>
                    <p>Hi <strong>${displayName}</strong>, your password was just changed.</p>
                    <br/>
                    <p style="color:#888;">Changed at: <strong>${new Date().toLocaleString()}</strong></p>
                    <br/>
                    <p style="color:#e05c5c;font-size:13px;">If you did not do this, contact support immediately.</p>
                    <p style="color:#1D9E75;font-weight:bold;">— Discord Clone Team</p>
                </div>
            `
        });
        console.log(`Password changed email sent to user ID: ${userId}`);
    } catch (err) {
        console.error('Failed to send password changed email:', err.message);
    }
}

async function sendGoodbyeEmail(email, displayName, userId) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending goodbye email to user ID: ${userId}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: '"Discord Clone Auth" <yourgmail@gmail.com>',
            to: email,
            subject: 'Your Account Has Been Deleted',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#e05c5c;">Account Deleted 👋</h2>
                    <p>Hi <strong>${displayName}</strong>, your account has been permanently deleted.</p>
                    <br/>
                    <p style="color:#888;">Deleted at: <strong>${new Date().toLocaleString()}</strong></p>
                    <br/>
                    <p style="color:#888;font-size:13px;">All your data has been removed. We are sorry to see you go.</p>
                    <p style="color:#e05c5c;font-weight:bold;">— Discord Clone Team</p>
                </div>
            `
        });
        console.log(`Goodbye email sent to user ID: ${userId}`);
    } catch (err) {
        console.error('Failed to send goodbye email:', err.message);
    }
}

async function sendUnreadNotificationEmail(email, displayName, channel, unreadCount, userId) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending unread notification email to user ID: ${userId}`);
        return;
    }
    try {
        await transporter.sendMail({
            from: '"Discord Clone Auth" <yourgmail@gmail.com>',
            to: email,
            subject: `Discord Clone: ${unreadCount} new messages in #${channel}`,
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#7c6ff7;">You have unread messages! 📬</h2>
                    <p>Hi <strong>${displayName}</strong>, you've been missing out on the conversation.</p>
                    <br/>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px;color:#888;">Channel</td>
                            <td style="padding:8px;font-weight:bold;">#${channel}</td>
                        </tr>
                        <tr style="background:#f9f9f9">
                            <td style="padding:8px;color:#888;">Unread Messages</td>
                            <td style="padding:8px;font-weight:bold;">${unreadCount}</td>
                        </tr>
                    </table>
                    <br/>
                    <p style="color:#888;font-size:13px;">Open the app to catch up with your friends!</p>
                    <p style="color:#7c6ff7;font-weight:bold;">— Discord Clone Team</p>
                </div>
            `
        });
        console.log(`Unread notification email sent to user ID: ${userId}`);
    } catch (err) {
        console.error('Failed to send unread notification email:', err.message);
    }
}

// ─────────────────────────────────────────────
// REGISTER
// POST /register
// Body: { username, password, email, displayName }
// ─────────────────────────────────────────────
app.post('/register', async (req, res) => {
    const { username, password, email, displayName } = req.body;

    if (!username || !password || !email || !displayName) {
        return res.status(400).json({
            error: 'All fields required: username, password, email, displayName'
        });
    }

    if (username.length < 3) {
        return res.status(400).json({
            error: 'Username must be at least 3 characters'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            error: 'Password must be at least 6 characters'
        });
    }

    if (!email.includes('@')) {
        return res.status(400).json({
            error: 'Invalid email format'
        });
    }

    try {
        const _username = username.toLowerCase().trim();
        const _email = email.toLowerCase().trim();
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [_username, _email]);

        if (existingUser.rows.length > 0) {
            const row = existingUser.rows[0];
            if (row.username === _username) {
                return res.status(409).json({ error: 'Username already taken' });
            }
            if (row.email === _email) {
                return res.status(409).json({ error: 'Email already registered' });
            }
        }

        const password_hash = await bcrypt.hash(password, 10);

        // Generate user ID using Timestamp + username prefix
        const usernamePrefix = _username.substring(0, 4);
        const randomId = `${Date.now()}-${usernamePrefix}`;

        const result = await pool.query(
            'INSERT INTO users (id, username, password_hash, email, display_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [randomId, _username, password_hash, _email, displayName.trim()]
        );
        const newUser = result.rows[0];

        // --- DEBUG LOGGING ---
        console.log(`\n================== DEBUG: DB STORAGE ==================`);
        console.log(`✅ Successfully inserted new user into remote PostgreSQL Database!`);
        console.log(`Database Host: ${process.env.DB_HOST || '172.27.46.48'}`);
        console.log(`User Data Stored:`, {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
        });
        console.log(`To see all data currently in DB, visit: http://localhost:5001/users/all`);
        console.log(`=======================================================\n`);

        sendWelcomeEmail(newUser.email, newUser.display_name, newUser.username, newUser.id);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                displayName: newUser.display_name,
                createdAt: newUser.created_at
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────
// LOGIN
// POST /login
// Body: { username, password }
// ─────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: 'Username and password are required'
        });
    }

    try {
        const _username = username.toLowerCase().trim();
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [_username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const updatedUser = await pool.query(
            'UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1 RETURNING *',
            [user.id]
        );
        const u = updatedUser.rows[0];

        const token = jwt.sign(
            {
                user_id: u.id,
                username: u.username,
                email: u.email,
                displayName: u.display_name
            },
            SECRET,
            { expiresIn: '24h' }
        );

        sendLoginEmail(u.email, u.display_name, u.username, u.id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: u.id,
                username: u.username,
                email: u.email,
                displayName: u.display_name,
                createdAt: u.created_at,
                isOnline: u.is_online,
                lastSeen: u.last_seen
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────
// LOGOUT
// POST /logout
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.post('/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        await pool.query('UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1', [decoded.user_id]);
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// FORGOT PASSWORD — Step 1
// POST /forgot-password
// Body: { email }
// Generates reset token and sends email
// ─────────────────────────────────────────────
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const _email = email.toLowerCase().trim();
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [_email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.json({
                message: 'If that email exists, a reset link has been sent'
            });
        }

        await pool.query('DELETE FROM reset_tokens WHERE user_id = $1', [user.id]);

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await pool.query(
            'INSERT INTO reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
            [resetToken, user.id, expiresAt]
        );

        console.log('Reset token generated:', resetToken);
        console.log('Expires at:', expiresAt);

        const origin = req.headers.origin || 'http://localhost:3000';
        sendResetEmail(user.email, user.display_name, resetToken, origin, user.id);

        res.json({
            message: 'If that email exists, a reset link has been sent',
            debug_token: resetToken
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────
// RESET PASSWORD — Step 2
// POST /reset-password
// Body: { token, newPassword }
// Verifies token and updates password
// ─────────────────────────────────────────────
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({
            error: 'Token and new password are required'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            error: 'New password must be at least 6 characters'
        });
    }

    try {
        const tokenResult = await pool.query('SELECT * FROM reset_tokens WHERE token = $1', [token]);
        const resetEntry = tokenResult.rows[0];

        if (!resetEntry) {
            return res.status(400).json({
                error: 'Invalid reset token'
            });
        }

        if (new Date() > new Date(resetEntry.expires_at)) {
            await pool.query('DELETE FROM reset_tokens WHERE token = $1', [token]);
            return res.status(400).json({
                error: 'Reset token has expired. Please request a new one.'
            });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [resetEntry.user_id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, user.id]);
        await pool.query('DELETE FROM reset_tokens WHERE token = $1', [token]);

        console.log(`Password reset successful for user: ${user.username}`);

        sendPasswordChangedEmail(user.email, user.display_name, user.id);

        res.json({ message: 'Password reset successful. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────
// DELETE ACCOUNT
// DELETE /account
// Header: Authorization: Bearer <token>
// Body: { password }
// Requires JWT + password confirmation
// ─────────────────────────────────────────────
app.delete('/account', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Login required' });
    }

    const { password } = req.body;
    if (!password) {
        return res.status(400).json({
            error: 'Password confirmation is required to delete account'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.user_id]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                error: 'Incorrect password. Account not deleted.'
            });
        }

        const deletedEmail = user.email;
        const deletedDisplayName = user.display_name;
        const deletedUsername = user.username;

        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);

        console.log(`Account deleted: ${deletedUsername}`);

        sendGoodbyeEmail(deletedEmail, deletedDisplayName, user.id);

        res.json({ message: 'Account permanently deleted.' });

    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// VERIFY TOKEN
// GET /verify
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.get('/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.user_id]);
        const user = userResult.rows[0];

        res.json({
            valid: true,
            user: {
                user_id: decoded.user_id,
                username: decoded.username,
                email: decoded.email,
                displayName: decoded.displayName,
                isOnline: user ? user.is_online : false,
                lastSeen: user ? user.last_seen : null
            }
        });
    } catch (err) {
        res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// GET USER PROFILE
// GET /user/:username
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.get('/user/:username', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Login required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, SECRET);
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [req.params.username]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            isOnline: user.is_online,
            lastSeen: user.last_seen,
            createdAt: user.created_at
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// GET ALL ONLINE USERS
// GET /users/online
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.get('/users/online', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Login required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, SECRET);
        const result = await pool.query('SELECT id, username, display_name, last_seen FROM users WHERE is_online = true');
        const onlineUsers = result.rows.map(u => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name,
            lastSeen: u.last_seen
        }));
        res.json({ onlineUsers });
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// DEBUG ROUTE
// GET /users/all
// ─────────────────────────────────────────────
app.get('/users/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, display_name, is_online, last_seen, created_at FROM users');
        const safeUsers = result.rows.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            displayName: u.display_name,
            isOnline: u.is_online,
            lastSeen: u.last_seen,
            createdAt: u.created_at
        }));
        res.json({ total: result.rows.length, users: safeUsers });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─────────────────────────────────────────────
// UNREAD NOTIFICATION EMAIL
// POST /email-notification
// Header: Authorization: Bearer <token>
// Body: { username, channel, unreadCount }
// ─────────────────────────────────────────────
app.post('/email-notification', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Login required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, SECRET);

        const { username, channel, unreadCount } = req.body;
        if (!username || !channel || !unreadCount) {
            return res.status(400).json({ error: "Missing required fields for email dispatch." });
        }

        const _username = username.toLowerCase().trim();
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [_username]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`\n=========================================`);
        console.log(`[EMAIL DISPATCH] To: ${user.display_name} (${user.email})`);
        console.log(`Subject: You have ${unreadCount} unread messages in #${channel}!`);
        console.log(`=========================================\n`);

        sendUnreadNotificationEmail(user.email, user.display_name, channel, unreadCount, user.id);

        return res.status(200).json({ message: "Email notification dispatched successfully" });

    } catch (err) {
        console.error("Error sending email notification:", err);
        return res.status(401).json({ error: "Invalid or expired token, or server error" });
    }
});

app.listen(5001, () => {
    console.log('Auth Server running on http://localhost:5001');
    console.log('Available routes:');
    console.log('  POST   /register');
    console.log('  POST   /login');
    console.log('  POST   /logout');
    console.log('  POST   /forgot-password');
    console.log('  POST   /reset-password');
    console.log('  POST   /email-notification');
    console.log('  DELETE /account');
    console.log('  GET    /verify');
    console.log('  GET    /user/:username');
    console.log('  GET    /users/online');
    console.log('  GET    /users/all  (debug only)');
});


