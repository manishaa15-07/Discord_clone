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

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// FILE SYSTEM DATABASE
// ─────────────────────────────────────────────
const USERS_FILE = path.join(__dirname, 'users.json');
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

let users = [];
let resetTokens = [];

function loadData() {
    if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (fs.existsSync(TOKENS_FILE)) resetTokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
}

function saveData() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(resetTokens, null, 2));
}

loadData();

// ─────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────
async function sendWelcomeEmail(email, displayName, username) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending welcome email to ${email}`);
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
        console.log(`Welcome email sent to ${email}`);
    } catch (err) {
        console.error('Failed to send welcome email:', err.message);
    }
}

async function sendLoginEmail(email, displayName, username) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending login email to ${email}`);
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
        console.log(`Login alert sent to ${email}`);
    } catch (err) {
        console.error('Failed to send login email:', err.message);
    }
}

async function sendResetEmail(email, displayName, resetToken, origin = 'http://localhost:3000') {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending reset email to ${email}`);
        return;
    }
    // Point back to the React app root, passing the token in the URL query
    const resetLink = `${origin}/?token=${resetToken}`;

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
        console.log(`Password reset email sent to ${email}`);
    } catch (err) {
        console.error('Failed to send reset email:', err.message);
    }
}

async function sendPasswordChangedEmail(email, displayName) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending password changed email to ${email}`);
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
        console.log(`Password changed email sent to ${email}`);
    } catch (err) {
        console.error('Failed to send password changed email:', err.message);
    }
}

async function sendGoodbyeEmail(email, displayName) {
    if (isUsingDefaultCredentials) {
        console.log(`[Config Required] Skipped sending goodbye email to ${email}`);
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
        console.log(`Goodbye email sent to ${email}`);
    } catch (err) {
        console.error('Failed to send goodbye email:', err.message);
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

    const existingUsername = users.find(u => u.username === username);
    if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
    }

    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = {
        id: users.length + 1,
        username: username.toLowerCase().trim(),
        password_hash,
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        createdAt: new Date().toISOString(),
        isOnline: false,
        lastSeen: null
    };

    users.push(newUser);
    saveData();

    sendWelcomeEmail(newUser.email, newUser.displayName, newUser.username);

    res.status(201).json({
        message: 'User registered successfully',
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            displayName: newUser.displayName,
            createdAt: newUser.createdAt
        }
    });
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

    const user = users.find(u => u.username === username.toLowerCase().trim());
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    user.isOnline = true;
    user.lastSeen = new Date().toISOString();
    saveData();

    const token = jwt.sign(
        {
            user_id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName
        },
        SECRET,
        { expiresIn: '24h' }
    );

    sendLoginEmail(user.email, user.displayName, user.username);

    res.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            createdAt: user.createdAt,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
        }
    });
});

// ─────────────────────────────────────────────
// LOGOUT
// POST /logout
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.post('/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        const user = users.find(u => u.id === decoded.user_id);
        if (user) {
            user.isOnline = false;
            user.lastSeen = new Date().toISOString();
            saveData();
        }
        res.json({ message: 'Logged out successfully' });
    } catch {
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

    const user = users.find(u => u.email === email.toLowerCase().trim());

    // Always say success even if email not found
    // This prevents attackers from knowing which emails are registered
    if (!user) {
        return res.json({
            message: 'If that email exists, a reset link has been sent'
        });
    }

    // Remove any existing reset tokens for this user
    const existingIndex = resetTokens.findIndex(t => t.userId === user.id);
    if (existingIndex !== -1) {
        resetTokens.splice(existingIndex, 1);
    }

    // Generate a random secure token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Token expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store it
    resetTokens.push({
        token: resetToken,
        userId: user.id,
        expiresAt
    });
    saveData();

    console.log('Reset token generated:', resetToken);
    console.log('Expires at:', expiresAt);

    // Send email with reset link using the request's origin
    const origin = req.headers.origin || 'http://localhost:3000';
    sendResetEmail(user.email, user.displayName, resetToken, origin);

    res.json({
        message: 'If that email exists, a reset link has been sent',
        // Remove this line in production — only for testing
        debug_token: resetToken
    });
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

    // Find the reset token
    const resetEntry = resetTokens.find(t => t.token === token);

    if (!resetEntry) {
        return res.status(400).json({
            error: 'Invalid reset token'
        });
    }

    // Check if token is expired
    if (new Date() > new Date(resetEntry.expiresAt)) {
        // Remove expired token
        const index = resetTokens.findIndex(t => t.token === token);
        resetTokens.splice(index, 1);
        return res.status(400).json({
            error: 'Reset token has expired. Please request a new one.'
        });
    }

    // Find the user
    const user = users.find(u => u.id === resetEntry.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    user.password_hash = await bcrypt.hash(newPassword, 10);

    // Remove the used reset token
    const index = resetTokens.findIndex(t => t.token === token);
    resetTokens.splice(index, 1);
    saveData();

    console.log(`Password reset successful for user: ${user.username}`);

    // Send confirmation email
    sendPasswordChangedEmail(user.email, user.displayName);

    res.json({ message: 'Password reset successful. You can now log in.' });
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

        // Find user
        const userIndex = users.findIndex(u => u.id === decoded.user_id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[userIndex];

        // Verify password before deleting
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                error: 'Incorrect password. Account not deleted.'
            });
        }

        // Remove all reset tokens for this user too
        const resetIndex = resetTokens.findIndex(t => t.userId === user.id);
        if (resetIndex !== -1) {
            resetTokens.splice(resetIndex, 1);
        }

        // Save details before deleting for the goodbye email
        const deletedEmail = user.email;
        const deletedDisplayName = user.displayName;
        const deletedUsername = user.username;

        // Remove user from array
        users.splice(userIndex, 1);
        saveData();

        console.log(`Account deleted: ${deletedUsername}`);

        // Send goodbye email
        sendGoodbyeEmail(deletedEmail, deletedDisplayName);

        res.json({ message: 'Account permanently deleted.' });

    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// VERIFY TOKEN
// GET /verify
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        const user = users.find(u => u.id === decoded.user_id);

        res.json({
            valid: true,
            user: {
                user_id: decoded.user_id,
                username: decoded.username,
                email: decoded.email,
                displayName: decoded.displayName,
                isOnline: user ? user.isOnline : false,
                lastSeen: user ? user.lastSeen : null
            }
        });
    } catch {
        res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// GET USER PROFILE
// GET /user/:username
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.get('/user/:username', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Login required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, SECRET);
        const user = users.find(u => u.username === req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            createdAt: user.createdAt
        });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// GET ALL ONLINE USERS
// GET /users/online
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────
app.get('/users/online', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Login required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, SECRET);
        const onlineUsers = users
            .filter(u => u.isOnline)
            .map(u => ({
                id: u.id,
                username: u.username,
                displayName: u.displayName,
                lastSeen: u.lastSeen
            }));
        res.json({ onlineUsers });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ─────────────────────────────────────────────
// DEBUG ROUTE
// GET /users/all
// ─────────────────────────────────────────────
app.get('/users/all', (req, res) => {
    const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
        createdAt: u.createdAt
    }));
    res.json({ total: users.length, users: safeUsers });
});

app.listen(5001, () => {
    console.log('Auth Server running on http://localhost:5001');
    console.log('Available routes:');
    console.log('  POST   /register');
    console.log('  POST   /login');
    console.log('  POST   /logout');
    console.log('  POST   /forgot-password');
    console.log('  POST   /reset-password');
    console.log('  DELETE /account');
    console.log('  GET    /verify');
    console.log('  GET    /user/:username');
    console.log('  GET    /users/online');
    console.log('  GET    /users/all  (debug only)');
});