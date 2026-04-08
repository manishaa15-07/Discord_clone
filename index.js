const { Server } = require("socket.io");
const { createClient } = require("redis");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8000;
const SERVER_ID = process.env.SERVER_ID || "A";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let lamportClock = 0;

// HTTP Server to serve the static frontend
const server = http.createServer((req, res) => {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  const fullPath = path.join(__dirname, "public", filePath);
  
  if (fs.existsSync(fullPath)) {
    res.writeHead(200);
    res.end(fs.readFileSync(fullPath));
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

// Socket.io Server attached to HTTP server
const io = new Server(server, {
  cors: { origin: "*" }
});

// Redis Clients
const pub = createClient({ url: REDIS_URL });
const sub = createClient({ url: REDIS_URL });

(async () => {
  try {
    await pub.connect();
    await sub.connect();
    console.log(`[Server ${SERVER_ID}] Connected to Redis at ${REDIS_URL}`);

    // Subscribe to chat channel
    await sub.subscribe("chat", (message) => {
      const msg = JSON.parse(message);

      // Avoid infinite loop and doubling messages on the origin server
      if (msg.originServer === SERVER_ID) return;

      // Update Lamport Clock: L_new = max(L_local, L_remote) + 1
      lamportClock = Math.max(lamportClock, msg.lamport) + 1;
      
      console.log(`[Server ${SERVER_ID}] Received sync: "${msg.text}" | Clock: ${lamportClock}`);
      io.emit("receive_message", { ...msg, currentClock: lamportClock });
    });

  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }
})();

io.on("connection", (socket) => {
  console.log(`[Server ${SERVER_ID}] User connected: ${socket.id}`);

  socket.on("send_message", async (data) => {
    // Increment local clock on send
    lamportClock++;
    
    const message = {
      text: data.text,
      lamport: lamportClock,
      originServer: SERVER_ID,
      timestamp: Date.now()
    };

    console.log(`[Server ${SERVER_ID}] Local message: "${message.text}" | Clock: ${lamportClock}`);

    // Publish to Redis for other server instances
    await pub.publish("chat", JSON.stringify(message));

    // Emit to local clients
    io.emit("receive_message", { ...message, currentClock: lamportClock });
  });

  socket.on("disconnect", () => {
    console.log(`[Server ${SERVER_ID}] User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
    console.log(`[Server ${SERVER_ID}] Chat server running on port ${PORT}`);
});
