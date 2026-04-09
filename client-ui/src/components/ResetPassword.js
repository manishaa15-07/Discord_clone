import React, { useState, useEffect } from "react";
import axios from "axios";
import { MessageSquare, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function ResetPassword({ isMockMode }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const query = useQuery();
  const token = query.get("token");

  useEffect(() => {
    if (!token && !isMockMode) {
      setError("No reset token found in URL.");
    }
  }, [token, isMockMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setError("Passwords do not match or are empty");
      return;
    }
    
    if (!token && !isMockMode) {
      setError("Cannot reset without a valid token");
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
      await axios.post("http://172.27.46.83:5001/reset-password", { 
        token, 
        newPassword: password 
      });
      setSuccess(true);
    } catch (err) {
      console.error("Reset password failed:", err);
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
        <h1 className="login-title">Create New Password</h1>
        <p className="login-subtitle">Your password must be different from previously used passwords.</p>

        {success ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <CheckCircle2 color="#3ba55c" size={48} style={{ marginBottom: 16 }} />
            <p style={{ color: 'var(--text-main)', marginBottom: 24 }}>
              Your password has been reset successfully!
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="password" className="input-label">New Password</label>
              <input
                id="password"
                type="password"
                className="text-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter new password"
              />
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label htmlFor="confirmPassword" className="input-label">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="text-input"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Confirm new password"
              />
              {error && <p style={{ color: '#ed4245', fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 24 }}
              disabled={isLoading || (!password && !isMockMode) || Boolean(!token && !isMockMode)}
            >
              {isLoading ? (
                <><Loader2 size={18} className="spin" style={{ animation: 'pulse 1s infinite' }} /> Resetting...</>
              ) : (
                <>Reset Password <ArrowRight size={18} /></>
              )}
            </button>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Back to{" "}
              <Link to="/login" style={{ color: '#7c6ff7', textDecoration: 'none' }}>
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
