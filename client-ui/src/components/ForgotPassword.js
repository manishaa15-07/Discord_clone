import React, { useState } from "react";
import axios from "axios";
import { MessageSquare, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

function ForgotPassword({ isMockMode }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError("");

    if (isMockMode) {
      setTimeout(() => {
        setSuccess(true);
        setIsLoading(false);
      }, 800);
      return;
    }

    try {
      await axios.post("http://172.27.46.83:5001/forgot-password", { email: email.trim() });
      setSuccess(true);
    } catch (err) {
      console.error("Forgot password failed:", err);
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
        <h1 className="login-title">Reset Password</h1>
        <p className="login-subtitle">We'll send you an email with reset instructions.</p>

        {success ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <CheckCircle2 color="#3ba55c" size={48} style={{ marginBottom: 16 }} />
            <p style={{ color: 'var(--text-main)', marginBottom: 24 }}>
              If that email exists in our system, you will receive a reset link shortly.
              You can close this window now.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
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
                autoComplete="off"
                autoFocus
              />
              {error && <p style={{ color: '#ed4245', fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 24 }}
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <><Loader2 size={18} className="spin" style={{ animation: 'pulse 1s infinite' }} /> Sending...</>
              ) : (
                <>Send Reset Link <ArrowRight size={18} /></>
              )}
            </button>
            
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Remembered your password?{" "}
              <Link to="/login" style={{ color: '#7c6ff7', textDecoration: 'none' }}>
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
