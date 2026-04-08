// ==============================
// 1. IMPORTS
// ==============================
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const db = require("./db");
const LamportClock = require("./lamport");

// ==============================
// 2. CONFIG
// ==============================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisPub = new Redis(redisUrl);
const redisSub = new Redis(redisUrl);
const SERVER_ID = process.env.SERVER_ID || "A";
const PORT = Number(process.env.PORT || 8000);
const clock = new LamportClock();

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
  try {
    const messages = await db.getMessagesByRoom(req.params.roomId);
    res.json(messages);
  } catch (err) {
    console.error("History route error:", err);
    res.status(500).json({ error: "Failed to get history" });
  }
});

// ==============================
// 4. REDIS PUB/SUB
// ==============================
redisSub
  .subscribe("chat_channel")
  .then(() => console.log("Subscribed to chat_channel"))
  .catch((err) => {
    console.error("Redis subscribe failed", err);
    process.exit(1);
  });

redisSub.on("message", async (channel, message) => {
  if (channel !== "chat_channel") return;

  try {
    const payload = JSON.parse(message);
    if (!payload || payload.originServer === SERVER_ID) return;

    clock.sync(payload.lamport);
    io.emit("new_message", payload);
  } catch (err) {
    console.error("Redis message parse error:", err);
  }
});

async function safePublish(payload) {
  const raw = JSON.stringify(payload);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await redisPub.publish("chat_channel", raw);
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
io.on("connection", (socket) => {
  console.log(`User connected to Server ${SERVER_ID}`, socket.id);

  socket.on("send_message", async (data = {}) => {
    try {
      const message = {
        sender: String(data.sender || "anonymous"),
        content: String(data.content || ""),
        roomId: String(data.roomId || "general"),
        originServer: SERVER_ID,
        lamport: clock.tick(),
        createdAt: new Date().toISOString()
      };

      await db.saveMessage(message);
      await safePublish(message);
      io.emit("new_message", message);

      socket.emit("message_saved", { success: true, message });
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("message_saved", { success: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected from Server ${SERVER_ID}`, socket.id);
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