import React, { useState } from "react";
import axios from "axios";
import { MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_SERVER_URL } from "../config";

function Register({ setToken, setUsername }) {
  const [localUsername, setLocalUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localUsername.trim() || !password || !email.trim() || !displayName.trim()) {
      setError("All fields are required");
      return;
    }
    


    setIsLoading(true);
    setError("");

    try {
      // 1. Register
      await axios.post(`${AUTH_SERVER_URL}/register`, {
        username: localUsername.trim(),
        password,
        email: email.trim(),
        displayName: displayName.trim()
      });
      
      // 2. Auto-login after successful registration
      const res = await axios.post(`${AUTH_SERVER_URL}/login`, { 
        username: localUsername.trim(),
        password: password
      });
      
      if (res.data && res.data.token) {
        setUsername(localUsername.trim());
        setToken(res.data.token);
        navigate("/chat");
      } else {
        setError("Account created, but autologin failed. Please log in.");
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error("Registration failed:", err);
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
        <h1 className="login-title">Create an account</h1>
        <p className="login-subtitle">We're so excited to have you!</p>

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
            />
          </div>

          <div className="input-group" style={{ marginTop: 16 }}>
            <label htmlFor="email" className="input-label">Email</label>
            <input
              id="email"
              type="email"
              className="text-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your email"
            />
          </div>
          
          <div className="input-group" style={{ marginTop: 16 }}>
            <label htmlFor="displayName" className="input-label">Display Name</label>
            <input
              id="displayName"
              type="text"
              className="text-input"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your display name"
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

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: 16 }}
            disabled={isLoading || !localUsername.trim()}
          >
            {isLoading ? (
              <><Loader2 size={18} className="spin" style={{ animation: 'pulse 1s infinite' }} /> Creating Account...</>
            ) : (
              <>Register <ArrowRight size={18} /></>
            )}
          </button>
          
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: '#7c6ff7', textDecoration: 'none' }}>
              Login
            </Link>
          </p>


        </form>
      </div>
    </div>
  );
}

export default Register;
