import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { Hash, Send, LogOut, Radio, WifiOff, MessageSquare, Settings, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SERVERS = ["http://localhost:8001", "http://localhost:8002"];

function ChatWindow({ token, username, onLogout, isMockMode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [room, setRoom] = useState("general");
  const [serverIdx, setServerIdx] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Settings / Delete Account State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  
  const socketRef = useRef(null);
  const clockRef = useRef(0);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
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
      reconnection: false,
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
      socket.disconnect();
      setTimeout(() => {
        setServerIdx((prev) => (prev + 1) % SERVERS.length);
      }, 1000);
    });

    socket.on("new_message", (data) => {
      clockRef.current = Math.max(clockRef.current, data.lamport) + 1;
      setMessages((prev) => {
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
  }, [serverIdx, token, isMockMode, room]);

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !isConnected) return;
    
    clockRef.current += 1;
    
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

  const handleLogout = async () => {
    if (!isMockMode) {
      try {
        await axios.post("http://172.27.46.83:5001/logout", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    onLogout();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Password is required to delete account.");
      return;
    }
    
    setIsDeleting(true);
    setDeleteError("");

    if (isMockMode) {
      setTimeout(() => {
        setIsDeleting(false);
        setIsSettingsOpen(false);
        onLogout();
        navigate("/register");
      }, 800);
      return;
    }

    try {
      await axios.delete("http://172.27.46.83:5001/account", {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword }
      });
      setIsSettingsOpen(false);
      onLogout();
      navigate("/register");
    } catch (err) {
      console.error("Delete account error:", err);
      if (err.response?.data?.error) {
        setDeleteError(err.response.data.error);
      } else {
        setDeleteError("Failed to delete account. Ensure your password is correct.");
      }
      setIsDeleting(false);
    }
  };

  const currentRoomMessages = messages.filter((m) => m.roomId === room);

  return (
    <div className="app-container">
      {!isConnected && isReconnecting && (
        <div className="server-banner">
          <WifiOff size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Lost connection to the system. Attempting failover...
        </div>
      )}
      
      {isConnected && serverIdx === 1 && (
        <div className="server-banner info">
          <Radio size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Connected to backup server (chat-server-2)
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/discord_logo.png" alt="Discord2.0 Logo" width="24" height="24" style={{ marginRight: '8px', borderRadius: '4px' }} />
            Discord2.0
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
          
          {/* Settings Button */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, marginRight: 4 }}
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
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

      {/* Settings Modal Setup */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="login-card" style={{ width: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Account Settings</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Manage your account settings</p>
            
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
              <h3 style={{ color: '#ed4245', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={18} /> Danger Zone
              </h3>
              <p style={{ color: 'var(--text-main)', fontSize: 13, marginBottom: 16 }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input
                  type="password"
                  className="text-input"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    if (deleteError) setDeleteError("");
                  }}
                  placeholder="Enter your password to confirm"
                />
                {deleteError && <p style={{ color: '#ed4245', fontSize: 12, marginTop: 8 }}>{deleteError}</p>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: 12, background: 'var(--surface-light)', color: 'var(--text-main)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: '#ed4245', borderColor: '#ed4245' }}
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !deletePassword}
                >
                  {isDeleting ? <Loader2 size={18} className="spin" /> : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
