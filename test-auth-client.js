const { io } = require("socket.io-client");
const axios = require("axios");

const AUTH_URL = "http://localhost:5001";
const SERVER_A = "http://localhost:8000";
const SERVER_B = "http://localhost:8001";

async function testDistributedChat() {
    console.log("🚀 Starting Distributed Chat Test with Authentication...");

    try {
        // Register and login
        console.log("📝 Registering test user...");
        await axios.post(`${AUTH_URL}/register`, {
            username: "testuser2",
            password: "testpass",
            email: "test2@example.com",
            displayName: "Test User 2"
        });

        console.log("🔐 Logging in...");
        const loginRes = await axios.post(`${AUTH_URL}/login`, {
            username: "testuser2",
            password: "testpass"
        });
        const token = loginRes.data.token;
        console.log("✅ Authenticated successfully");

        // Connect to both servers
        const socketA = io(SERVER_A, { auth: { token } });
        const socketB = io(SERVER_B, { auth: { token } });

        let receivedOnB = false;

        socketA.on("connect", () => {
            console.log("✅ Connected to Server A (Port 8000)");
            socketA.emit("join_room", "testroom");
        });

        socketB.on("connect", () => {
            console.log("✅ Connected to Server B (Port 8001)");
            socketB.emit("join_room", "testroom");
        });

        socketA.on("joined_room", (data) => {
            console.log(`📥 [Server A] Joined room: ${data.roomId}`);
            // Send message after both are connected
            setTimeout(() => {
                const msg = {
                    content: "Hello from Server A!",
                    roomId: "testroom",
                    lamport: 1
                };
                console.log(`📤 Sending message to A: "${msg.content}"`);
                socketA.emit("send_message", msg);
            }, 1000);
        });

        socketB.on("joined_room", (data) => {
            console.log(`📥 [Server B] Joined room: ${data.roomId}`);
        });

        socketA.on("message_sent", (data) => {
            console.log(`📤 [Server A] Message sent: ${data.success ? 'SUCCESS' : 'FAILED'}`);
        });

        socketA.on("new_message", (data) => {
            console.log(`📥 [Client A] Received: "${data.content}" | Lamport: ${data.lamport} | Origin: ${data.originServer}`);
        });

        socketB.on("new_message", (data) => {
            console.log(`📥 [Client B] Received: "${data.content}" | Lamport: ${data.lamport} | Origin: ${data.originServer}`);
            receivedOnB = true;
        });

        // Wait for test completion
        setTimeout(() => {
            if (receivedOnB) {
                console.log("\n✨ SUCCESS: Message propagated from Server A to Server B via Redis!");
                console.log("🎯 Distributed system is working correctly!");
            } else {
                console.log("\n❌ FAILURE: Message did not reach Server B. Check Redis connection.");
            }
            process.exit(0);
        }, 5000);

    } catch (err) {
        console.error("❌ Test failed:", err.message);
        process.exit(1);
    }
}

testDistributedChat();