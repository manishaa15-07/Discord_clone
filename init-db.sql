-- Initialize database schema for chat application

CREATE TABLE IF NOT EXISTS rooms (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id            SERIAL PRIMARY KEY,
  sender        VARCHAR(100) NOT NULL,
  content       TEXT NOT NULL,
  room_id       VARCHAR(100) NOT NULL,
  lamport       INTEGER NOT NULL,
  origin_server VARCHAR(10),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_lamport
  ON messages (room_id, lamport ASC);
