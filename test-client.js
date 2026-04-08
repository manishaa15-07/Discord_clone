const { io } = require("socket.io-client");

const URL_A = "http://localhost:8000";
const URL_B = "http://localhost:8001";

console.log("🚀 Starting Distributed Chat Test...");

const socketA = io(URL_A);
const socketB = io(URL_B);

let receivedOnB = false;

socketA.on("connect", () => {
    console.log("✅ Connected to Server A (Port 8000)");
    
    // Send message to A after both are connected (simple delay for demo)
    setTimeout(() => {
        const msg = { text: "Hello from Server A!" };
        console.log(`📤 Sending message to A: "${msg.text}"`);
        socketA.emit("send_message", msg);
    }, 1000);
});

socketB.on("connect", () => {
    console.log("✅ Connected to Server B (Port 8001)");
});

socketA.on("receive_message", (data) => {
    console.log(`📥 [Client A] Received: "${data.text}" | Lamport: ${data.lamport} | Origin: ${data.originServer}`);
});

socketB.on("receive_message", (data) => {
    console.log(`📥 [Client B] Received: "${data.text}" | Lamport: ${data.lamport} | Origin: ${data.originServer}`);
    receivedOnB = true;
});

// Keep process alive for a bit to see results
setTimeout(() => {
    if (receivedOnB) {
        console.log("\n✨ SUCCESS: Message propagated from Server A to Server B via Redis!");
    } else {
        console.log("\n❌ FAILURE: Message did not reach Server B. Is Redis running?");
    }
    process.exit(0);
}, 5000);
