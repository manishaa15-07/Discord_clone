import React, { useState } from "react";
import axios from "axios";
import { MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_SERVER_URL } from "../config";

function Login({ setToken, setUsername, isMockMode, setIsMockMode }) {
  const [localUsername, setLocalUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleMockLogin = () => {
    setIsMockMode(true);
    let mockUser = localUsername.trim() || "TestUser";
    setUsername(mockUser);
    setToken("mock-token");
    navigate("/chat");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localUsername.trim() || !password) {
      setError("Username and password cannot be empty");
      return;
    }
    
    if (isMockMode) {
      handleMockLogin();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post(`${AUTH_SERVER_URL}/login`, { 
        username: localUsername.trim(),
        password: password
      });
      if (res.data && res.data.token) {
        setUsername(localUsername.trim());
        setToken(res.data.token);
        navigate("/chat");
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Login failed:", err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to connect to auth server");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon-wrapper">
          <MessageSquare size={32} color="white" />
        </div>
        <h1 className="login-title">Welcome back!</h1>
        <p className="login-subtitle">We're so excited to see you again!</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username" className="input-label">Username</label>
            <input
              id="username"
              type="text"
              className="text-input"
              value={localUsername}
              onChange={(e) => {
                setLocalUsername(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your username"
              autoComplete="off"
              autoFocus
            />
          </div>
          
          <div className="input-group" style={{ marginTop: 16 }}>
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              type="password"
              className="text-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your password"
            />
            {error && <p style={{ color: '#ed4245', fontSize: 12, marginTop: 8 }}>{error}</p>}
          </div>

          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <Link to="/forgot-password" style={{ color: '#7c6ff7', fontSize: 12, textDecoration: 'none' }}>
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: 16 }}
            disabled={isLoading || (!localUsername.trim() && !isMockMode)}
          >
            {isLoading ? (
              <><Loader2 size={18} className="spin" style={{ animation: 'pulse 1s infinite' }} /> Connecting...</>
            ) : (
              <>Login <ArrowRight size={18} /></>
            )}
          </button>
          
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            Need an account?{" "}
            <Link to="/register" style={{ color: '#7c6ff7', textDecoration: 'none' }}>
              Register
            </Link>
          </p>
          
          <button
            type="button"
            className="btn-secondary"
            onClick={handleMockLogin}
            style={{ marginTop: 12, width: '100%', background: 'var(--surface-light)', color: 'var(--text-main)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}
          >
            Test UI Offline
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
