-- Initialize database schema for chat application

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id          VARCHAR(50) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
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

-- Seed Rooms
INSERT INTO rooms (id, name, description) VALUES 
('general', 'general', 'The main chat room'),
('random', 'random', 'Off-topic conversations'),
('dev', 'dev', 'Development discussion'),
('announcements', 'announcements', 'Important updates')
ON CONFLICT (id) DO NOTHING;
