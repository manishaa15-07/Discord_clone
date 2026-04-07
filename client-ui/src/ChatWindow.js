import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Hash, Send, LogOut, Radio, WifiOff, MessageSquare } from "lucide-react";

// The requested chat application requires load balancing/failover between 2 servers.
const SERVERS = ["http://localhost:8001", "http://localhost:8002"];

function ChatWindow({ token, username, onLogout, isMockMode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [room, setRoom] = useState("general");
  const [serverIdx, setServerIdx] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const socketRef = useRef(null);
  
  // Distributed Computing: Lamport Clock. Must start at 0.
  const clockRef = useRef(0);
  const messagesEndRef = useRef(null);
  
  const rooms = ["general", "random", "tech"];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, room]);

  useEffect(() => {
    if (isMockMode) {
      setIsConnected(true);
      setIsReconnecting(false);
      setMessages([
        {
          sender: "System",
          content: "Welcome to Offline Mock Mode. Your messages will be echoed back.",
          roomId: room,
          lamport: clockRef.current,
          originServer: "mock",
        },
      ]);
      return () => {};
    }

    const serverUrl = SERVERS[serverIdx];
    console.log(`Attempting connection to ${serverUrl}...`);
    
    const socket = io(serverUrl, {
      auth: { token },
      reconnection: false, // We handle failover logic manually based on requirements
      timeout: 3000,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`Connected successfully to ${serverUrl}`);
      setIsConnected(true);
      setIsReconnecting(false);
    });

    socket.on("disconnect", (reason) => {
      console.warn(`Disconnected from ${serverUrl}: ${reason}`);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error(`Connection error on ${serverUrl}:`, error.message);
      setIsConnected(false);
      setIsReconnecting(true);
      
      // Distributed Computing: Client-side fault tolerance / failover.
      socket.disconnect();
      
      // Auto-failover to the next server. 
      setTimeout(() => {
        setServerIdx((prev) => (prev + 1) % SERVERS.length);
      }, 1000);
    });

    socket.on("new_message", (data) => {
      // Distributed Computing: Update local lamport clock on receive.
      // Rule: clock = Math.max(local, incoming) + 1
      clockRef.current = Math.max(clockRef.current, data.lamport) + 1;
      
      setMessages((prev) => {
        // Add message to state and ALWAYS sort by lamport value. NOT arrival time.
        const updated = [...prev, data];
        return updated.sort((a, b) => a.lamport - b.lamport);
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("new_message");
      socket.disconnect();
    };
  }, [serverIdx, token]);

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !isConnected) return;
    
    // Distributed Computing: Increment Lamport clock BEFORE sending
    clockRef.current += 1;
    
    // Strict schema requirement
    const payload = {
      sender: username,
      content: input.trim(),
      roomId: room,
      lamport: clockRef.current,
      originServer: isMockMode ? "mock" : "" 
    };
    
    if (isMockMode) {
      setMessages((prev) => {
        const updated = [...prev, payload];
        return updated.sort((a, b) => a.lamport - b.lamport);
      });
      setInput("");
      
      setTimeout(() => {
        clockRef.current += 1;
        setMessages((prev) => {
          const updated = [...prev, {
            sender: "Bot",
            content: `Echo: ${payload.content}`,
            roomId: room,
            lamport: clockRef.current,
            originServer: "mock"
          }];
          return updated.sort((a, b) => a.lamport - b.lamport);
        });
      }, 500);
      return;
    }

    socketRef.current.emit("send_message", payload);
    setInput("");
  };

  const currentRoomMessages = messages.filter((m) => m.roomId === room);

  return (
    <div className="app-container">
      {/* Banner for Server Failover UX */}
      {!isConnected && isReconnecting && (
        <div className="server-banner">
          <WifiOff size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Lost connection to the system. Attempting failover...
        </div>
      )}
      
      {/* Dynamic Info Banner */}
      {isConnected && serverIdx === 1 && (
        <div className="server-banner info">
          <Radio size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Connected to backup server (chat-server-2)
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            <Radio size={20} color="var(--accent-primary)" />
            Distributed Chat
          </h1>
        </div>
        
        <div className="sidebar-content">
          <div className="section-label">TEXT CHANNELS</div>
          {rooms.map((r) => (
            <div
              key={r}
              className={`room-item ${r === room ? "active" : ""}`}
              onClick={() => setRoom(r)}
            >
              <Hash size={18} />
              {r}
            </div>
          ))}
        </div>
        
        <div className="sidebar-footer">
          <div className="user-avatar">
            {username.substring(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">{username}</div>
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? "online" : isReconnecting ? "connecting" : "offline"}`}></span>
              {isConnected ? "Connected" : isReconnecting ? "Reconnecting..." : "Offline"}
            </div>
          </div>
          <button 
            onClick={onLogout}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          <h2 className="room-title">
            <Hash size={24} className="room-icon" />
            {room}
          </h2>
        </div>
        
        <div className="messages-container">
          {currentRoomMessages.length === 0 ? (
            <div className="empty-state">
              <MessageSquare className="empty-icon" />
              <div className="empty-title">Welcome to #{room}!</div>
              <p>This is the beginning of the chat.</p>
            </div>
          ) : (
            currentRoomMessages.map((m, i) => (
              <div key={i} className="message">
                <div className="message-avatar">
                  {m.sender.substring(0, 2).toUpperCase()}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-sender">{m.sender}</span>
                    <span className="message-meta">
                      Clock: <span className="lamport-badge">{m.lamport}</span>
                    </span>
                  </div>
                  <div className="message-text">{m.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area">
          <form className="message-form" onSubmit={sendMessage}>
            <input
              type="text"
              className="message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message #${room}`}
              disabled={!isConnected}
              autoComplete="off"
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!input.trim() || !isConnected}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
