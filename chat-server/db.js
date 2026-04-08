const { Pool } = require('pg');

const pool = new Pool({
    host:     process.env.DB_HOST     || 'database',
    user:     process.env.DB_USER     || 'chatuser',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME     || 'chatdb',
    port:     5432
});

async function saveMessage(msg) {
  await pool.query(
    `INSERT INTO messages (sender, content, room_id, lamport, origin_server)
     VALUES ($1,$2,$3,$4,$5)`,
    [msg.sender, msg.content, msg.roomId, msg.lamport, msg.originServer]
  );
}

async function getMessagesByRoom(roomId) {
  const res = await pool.query(
    `SELECT sender, content, room_id, lamport, origin_server, created_at
     FROM messages
     WHERE room_id=$1
     ORDER BY lamport ASC`,
    [roomId]
  );
  return res.rows;
}

module.exports = { saveMessage, getMessagesByRoom };
