const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || '172.27.46.48',
    user: process.env.DB_USER || 'chatuser',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'chatdb',
    port: 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

let dbConnected = false;

async function connectWithRetry(maxRetries = 30) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            client.release();
            console.log('[DB Auth] Connected to PostgreSQL successfully on 172.27.46.48');
            dbConnected = true;
            return true;
        } catch (err) {
            console.log(`[DB Auth] Connection attempt ${attempt}/${maxRetries} failed:`, err.message);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    console.error('[DB Auth] Failed to connect after', maxRetries, 'attempts');
    return false;
}

// Initialize on load with retries
connectWithRetry();

module.exports = { pool };
