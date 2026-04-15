import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import { Hash, Send, LogOut, Radio, WifiOff, MessageSquare, Settings, AlertTriangle, Loader2, Reply, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AUTH_SERVER_URL, CHAT_SERVER_URLS } from "./config";
import UserProfileModal from "./components/UserProfileModal";

const SERVERS = CHAT_SERVER_URLS;

function ChatWindow({ token, username, onLogout }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("discord_messages");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load messages from local storage", e);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [room, setRoom] = useState("general");
  const [serverIdx, setServerIdx] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Reply Feature State
  const [replyingTo, setReplyingTo] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  
  // Settings / Delete Account State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  
  const socketRef = useRef(null);
  
  // Set initial clock to max of loaded messages
  const clockRef = useRef(messages.length > 0 ? Math.max(...messages.map(m => m.lamport || 0), 0) : 0);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  const rooms = ["general", "random", "tech"];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("discord_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, room]);

  useEffect(() => {


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

      // Tell the server we are joining the room
      socket.emit("join_room", room);
      socket.emit("join", room); // Fallback if server watches for "join" instead
      socket.emit("joinRoom", room); // Fallback
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

    const handleNewMessage = (data) => {
      let parsedContent = data.content || "";
      let replyToObj = data.replyTo || null;
      
      if (typeof parsedContent === "string" && parsedContent.startsWith("[REPLY-JSON::|")) {
        const endIndex = parsedContent.indexOf("|]:: ");
        if (endIndex !== -1) {
          try {
            const jsonStr = decodeURIComponent(parsedContent.substring(14, endIndex));
            replyToObj = JSON.parse(jsonStr);
            parsedContent = parsedContent.substring(endIndex + 5);
          } catch (e) {
            // failed to parse
          }
        }
      }

      const normalizedData = {
        ...data,
        content: parsedContent,
        roomId: data.roomId || data.room || room,
        timestamp: data.timestamp || data.createdAt || data.time || new Date().toISOString(),
        replyTo: replyToObj
      };
      
      const lamport = isNaN(normalizedData.lamport) ? (clockRef.current + 1) : normalizedData.lamport;
      clockRef.current = Math.max(clockRef.current, lamport) + 1;
      
      setMessages((prev) => {
        const updated = [...prev, normalizedData];
        return updated.sort((a, b) => a.lamport - b.lamport);
      });
    };

    socket.on("new_message", handleNewMessage);
    socket.on("receive_message", handleNewMessage); // Often used in tutorials instead of new_message
    socket.on("message", handleNewMessage); // Another common fallback

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("new_message");
      socket.off("receive_message");
      socket.off("message");
      socket.disconnect();
    };
  }, [serverIdx, token, room]);

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || !isConnected) return;
    
    clockRef.current += 1;
    
    let finalContent = input.trim();
    if (replyingTo) {
      const replyData = JSON.stringify({ sender: replyingTo.sender, content: replyingTo.content });
      finalContent = `[REPLY-JSON::|${encodeURIComponent(replyData)}|]:: ${finalContent}`;
    }

    const payload = {
      sender: username,
      content: finalContent,
      roomId: room,
      lamport: clockRef.current,
      originServer: "",
      timestamp: new Date().toISOString()
    };
    


    socketRef.current.emit("send_message", payload);
    setInput("");
    setReplyingTo(null);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${AUTH_SERVER_URL}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Logout error:", err);
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



    try {
      await axios.delete(`${AUTH_SERVER_URL}/account`, {
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

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
                    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return `Today at ${timeStr}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getDate() === date.getDate() && 
                        yesterday.getMonth() === date.getMonth() && 
                        yesterday.getFullYear() === date.getFullYear();
                        
    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }
    
    return `${date.toLocaleDateString()} ${timeStr}`;
  };

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
          <div className="user-avatar"
               onClick={() => setProfileTarget(username)}
               style={{ cursor: 'pointer' }}
               title="View Profile">
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
            onClick={() => setIsLogoutModalOpen(true)}
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
            currentRoomMessages.map((m, i) => {
              const isCurrentUser = m.sender === username;
              return (
              <div key={i} className={`message ${isCurrentUser ? "message-own" : ""}`}>
                <div className="message-avatar" 
                     onClick={() => setProfileTarget(m.sender)}
                     title={`View ${m.sender}'s Profile`}
                     style={isCurrentUser ? { background: 'linear-gradient(135deg, #CC5500, #ff8c42)', cursor: 'pointer' } : { cursor: 'pointer' }}>
                  {m.sender.substring(0, 2).toUpperCase()}
                </div>
                <div className="message-content">
                  {m.replyTo && (
                    <div className="message-replied">
                      <div className="replied-line"></div>
                      <span className="replied-user">@{m.replyTo.sender}</span>
                      <span className="replied-text">
                        {m.replyTo.content.substring(0, 40)}
                        {m.replyTo.content.length > 40 ? '...' : ''}
                      </span>
                    </div>
                  )}
                  <div className="message-header">
                    <span className="message-sender">{isCurrentUser ? "You" : m.sender}</span>
                    <span className="message-meta">
                      {formatMessageTime(m.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">{m.content}</div>
                </div>
                <div className="message-actions">
                  <button className="action-button" onClick={() => setReplyingTo(m)} title="Reply">
                    <Reply size={16} />
                  </button>
                </div>
              </div>
            )})
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area">
          {replyingTo && (
            <div className="replying-to-bar">
              <div className="replying-to-info">
                <Reply size={14} className="replying-icon" />
                <span className="replying-to-text">
                  Replying to <span className="replying-to-username">@{replyingTo.sender}</span>
                </span>
                <span className="replying-to-preview">
                  "{replyingTo.content.substring(0, 40)}{replyingTo.content.length > 40 ? '...' : ''}"
                </span>
              </div>
              <button className="cancel-reply" onClick={() => setReplyingTo(null)} title="Cancel reply">
                <X size={16} />
              </button>
            </div>
          )}
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

      {/* Logout Modal Setup */}
      {isLogoutModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeInSlideUp 0.2s ease-out forwards' }}>
          <div className="login-card" style={{ width: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogOut size={24} color="#ed4245" /> Log Out
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Are you sure you want to log out of your account?</p>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: 12, background: 'var(--surface-light)', color: 'var(--text-main)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, background: '#ed4245', borderColor: '#ed4245', fontWeight: 600 }}
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  handleLogout();
                }}
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {profileTarget && (
        <UserProfileModal 
          username={profileTarget} 
          currentUser={username} 
          token={token} 
          onClose={() => setProfileTarget(null)} 
        />
      )}
    </div>
  );
}

export default ChatWindow;
