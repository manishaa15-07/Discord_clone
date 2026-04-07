import { useState } from "react";
import axios from "axios";
import { MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import ChatWindow from "./ChatWindow";
import "./index.css";

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMockMode, setIsMockMode] = useState(false);

  const loginMock = (e) => {
    e?.preventDefault();
    setIsMockMode(true);
    let mockUser = username.trim();
    if (!mockUser) {
      mockUser = "TestUser";
      setUsername("TestUser");
    }
    setToken("mock-token");
  };

  const login = async (e) => {
    e?.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await axios.post("http://localhost:5001/login", { username: username.trim() });
      if (res.data && res.data.token) {
        setToken(res.data.token);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Failed to connect to auth server");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon-wrapper">
            <MessageSquare size={32} color="white" />
          </div>
          <h1 className="login-title">Welcome back!</h1>
          <p className="login-subtitle">We're so excited to see you again!</p>
          
          <form onSubmit={login}>
            <div className="input-group">
              <label htmlFor="username" className="input-label">Username</label>
              <input
                id="username"
                type="text"
                className="text-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your username"
                autoComplete="off"
                autoFocus
              />
              {error && <p style={{ color: '#ed4245', fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>
            
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || (!username.trim() && !isMockMode)}
            >
              {isLoading ? (
                <><Loader2 size={18} className="spin" style={{ animation: 'pulse 1s infinite' }} /> Connecting...</>
              ) : (
                <>Join Server <ArrowRight size={18} /></>
              )}
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={loginMock}
              style={{ marginTop: 12, width: '100%', background: 'var(--surface-light)', color: 'var(--text-main)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}
            >
              Test UI Offline
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <ChatWindow token={token} username={username.trim() || "TestUser"} isMockMode={isMockMode} onLogout={() => { setToken(null); setIsMockMode(false); }} />;
}

export default App;
