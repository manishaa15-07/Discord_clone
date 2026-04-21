// redisAdapter.js — Helper for Redis pub/sub operations
// Place this inside chat-server/ folder alongside index.js

const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisPub = new Redis(redisUrl);

async function publishRoomMessage(roomId, message) {
  const channel = `chat:${roomId}`;
  const payload = JSON.stringify(message);
  await redisPub.publish(channel, payload);
  console.log(`Published to ${channel}:`, message.sender, message.content.substring(0, 50));
}

async function subscribeRoom(redisSub, roomId) {
  const channel = `chat:${roomId}`;
  await redisSub.subscribe(channel);
  console.log(`Subscribed to ${channel}`);
}

module.exports = { publishRoomMessage, subscribeRoom };