// config.js
// -----------------------------------------------------------------------------
// Edit these URLs to point to your actual Auth Server and Chat Servers.
// Next time the IP addresses change, you only need to update them here!
// -----------------------------------------------------------------------------

// Sample Auth Server URL (update IP and port as needed)
export const AUTH_SERVER_URL = "http://172.27.46.83:5001";

// Sample Chat Server URLs for failover (update IPs and ports as needed)
export const CHAT_SERVER_URLS = [
  "http://192.168.1.101:8000",
  "http://192.168.1.102:8001"
];
