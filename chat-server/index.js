// ==============================
// 1. IMPORTS
// ==============================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const jwt = require("jsonwebtoken");
const db = require("./db");
const LamportClock = require("./lamport");
const { publishRoomMessage } = require("./redisAdapter");

// ==============================
// 2. CONFIG
// ==============================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const SERVER_ID = process.env.SERVER_ID || "A";
const PORT = Number(process.env.PORT || 8000);
const JWT_SECRET = process.env.JWT_SECRET || "distributed_secret_key";
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisPub = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL);
const clock = new LamportClock();
const subscribedRooms = new Set();

// ==============================
// 3. ROUTES
// ==============================
app.get("/", (req, res) => {
  res.send(`Chat Server ${SERVER_ID} running`);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", server: SERVER_ID, now: new Date().toISOString() });
});

app.get("/history/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const messages = await db.getMessagesByRoom(roomId);
    return res.json(messages);
  } catch (err) {
    console.error("History route error:", err);
    return res.status(500).json({ error: "Failed to get history" });
  }
});

// ==============================
// 4. REDIS PUB/SUB
// ==============================
async function subscribeRoom(roomId) {
  if (subscribedRooms.has(roomId)) return;
  await redisSub.subscribe(`chat:${roomId}`);
  subscribedRooms.add(roomId);
  console.log(`[${SERVER_ID}] subscribed to chat:${roomId}`);
}

redisSub.on("message", async (channel, message) => {
  try {
    const payload = JSON.parse(message);
    if (!payload || !payload.roomId) return;

    clock.sync(payload.lamport);
    io.to(payload.roomId).emit("new_message", payload);
  } catch (err) {
    console.error("Redis message parse error:", err);
  }
});

async function safePublish(payload) {
  const raw = JSON.stringify(payload);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await publishRoomMessage(payload.roomId, payload);
      return;
    } catch (err) {
      console.warn(`Redis publish attempt ${attempt} failed:`, err.message);
      if (attempt === 3) throw err;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

// ==============================
// 5. SOCKET.IO
// ==============================
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.username = decoded.username;
    return next();
  } catch (err) {
    return next(new Error("Invalid authentication token"));
  }
});

io.on("connection", (socket) => {
  console.log(`[${SERVER_ID}] user connected`, socket.id, socket.username);

  socket.on("join_room", async (roomId = "general") => {
    roomId = String(roomId || "general");
    socket.join(roomId);
    try {
      await subscribeRoom(roomId);
      socket.emit("joined_room", { roomId });
    } catch (err) {
      console.error(`[${SERVER_ID}] failed to subscribe to room ${roomId}:`, err);
      socket.emit("room_error", { error: "Failed to join room" });
    }
  });

  socket.on("send_message", async (data = {}) => {
    try {
      const roomId = String(data.roomId || "general");
      const clientLamport = Number(data.lamport || 0);
      const messageData = {
        sender: socket.username || String(data.sender || "anonymous"),
        content: String(data.content || ""),
        roomId,
        originServer: SERVER_ID,
        lamport: clock.sync(clientLamport),
        createdAt: new Date().toISOString()
      };

      await safePublish(messageData);
      db.saveMessage(messageData).catch((err) => console.error('[DB] Failed to save message:', err));
      socket.emit("message_sent", { success: true, message: messageData });
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("message_sent", { success: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[${SERVER_ID}] user disconnected`, socket.id);
  });
});

// ==============================
// 6. START SERVER
// ==============================
const srv = server.listen(PORT, () => {
  console.log(`🚀 Chat Server ${SERVER_ID} running on port ${PORT}`);
});

const shutdown = async () => {
  console.log(`Shutdown ${SERVER_ID} initiated`);
  io.close();
  srv.close(() => console.log("HTTP server closed"));
  await redisPub.quit().catch(() => {});
  await redisSub.quit().catch(() => {});
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
  shutdown();
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection", reason);
  shutdown();
});