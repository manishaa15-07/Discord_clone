const { Pool } = require('pg');

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'chatuser',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME     || 'chatdb',
    port:     5432,
    max:      20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

let dbConnected = false;

async function connectWithRetry(maxRetries = 30) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            client.release();
            console.log('[DB] Connected to PostgreSQL successfully');
            dbConnected = true;
            return true;
        } catch (err) {
            console.log(`[DB] Connection attempt ${attempt}/${maxRetries} failed:`, err.message);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    console.error('[DB] Failed to connect after', maxRetries, 'attempts');
    return false;
}

async function initDB() {
    if (!dbConnected) {
        const connected = await connectWithRetry();
        if (!connected) return;
    }
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id            SERIAL PRIMARY KEY,
                sender        VARCHAR(100) NOT NULL,
                content       TEXT NOT NULL,
                room_id       VARCHAR(100) NOT NULL,
                lamport       INTEGER NOT NULL,
                origin_server VARCHAR(10),
                created_at    TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_room_lamport
                ON messages (room_id, lamport ASC);
        `);
        console.log('[DB] Tables ready');
    } catch (err) {
        console.error('[DB] Failed to create tables:', err.message);
    }
}

// Initialize on load with retries
connectWithRetry().then(() => initDB());

async function saveMessage(msg) {
    try {
        const query = `
            INSERT INTO messages (sender, content, room_id, lamport, origin_server)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [msg.sender, msg.content, msg.roomId, msg.lamport, msg.originServer];
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('[DB] saveMessage error:', err.message);
        throw err;
    }
}

async function getMessagesByRoom(roomId) {
    try {
        const query = `
            SELECT
                sender,
                content,
                room_id       AS "roomId",
                lamport,
                origin_server AS "originServer",
                created_at
            FROM messages
            WHERE room_id = $1
            ORDER BY lamport ASC
        `;
        const result = await pool.query(query, [roomId]);
        return result.rows;
    } catch (err) {
        console.error('[DB] getMessagesByRoom error:', err.message);
        throw err;
    }
}

module.exports = { saveMessage, getMessagesByRoom };