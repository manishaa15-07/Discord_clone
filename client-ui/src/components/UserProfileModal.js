import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Loader2, Info, Key } from "lucide-react";
import { AUTH_SERVER_URL } from "../config";
function UserProfileModal({ username, currentUser, token, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const isSelf = username === currentUser;

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    setResetLoading(true);
    setResetMessage("");
    try {
      await axios.post(`${AUTH_SERVER_URL}/forgot-password`, { email: profile.email });
      setResetMessage("Reset link sent!");
      setTimeout(() => setResetMessage(""), 5000);
    } catch (err) {
      setResetMessage(err.response?.data?.error || "Failed to send reset email");
      setTimeout(() => setResetMessage(""), 5000);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${AUTH_SERVER_URL}/users/${username}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error("Profile fetch error. Falling back to local data.", err.message);
        if (isMounted) {
          // Backend profile endpoint isn't ready. Fallback to basic rendering.
          let fallbackData = { username: username, displayName: username };
          
          // Attempt to extract extra data for the logged-in user natively through the JWT
          if (isSelf && token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jwtPayload = JSON.parse(decodeURIComponent(atob(base64).split('').map(function(c) {
                  return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join('')));
              
              if (jwtPayload.email) fallbackData.email = jwtPayload.email;
              if (jwtPayload.displayName) fallbackData.displayName = jwtPayload.displayName;
            } catch (jwtErr) {
              console.warn("Failed to parse local JWT token claims.");
            }
          }
          
          setProfile(fallbackData);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchProfile();
    return () => { isMounted = false; };
  }, [username, token]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close Profile">
          <X size={20} />
        </button>
        
        <div className="profile-header-bg"></div>
        <div className="profile-avatar-large">
          {username.substring(0, 2).toUpperCase()}
        </div>
        
        <div className="profile-body">
          {loading ? (
            <div className="profile-loading">
              <Loader2 size={32} className="spin" color="var(--accent-primary)" />
            </div>
          ) : error ? (
            <div className="profile-error">
               <Info size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
               <p style={{ color: 'var(--text-main)', fontSize: 14 }}>{error}</p>
            </div>
          ) : (
            <>
              <h2 className="profile-username">
                {profile.displayName || username}
              </h2>
              <p className="profile-handle">@{profile.username || username}</p>
              
              <div className="profile-badges">
                {isSelf && <span className="profile-badge self">Your Profile</span>}
              </div>

              <div className="profile-details">
                 <div className="profile-detail-group">
                   <div className="profile-detail-label">USERNAME</div>
                   <div className="profile-detail-value">{profile.username || username}</div>
                 </div>
                 
                 {isSelf && profile.email && (
                   <div className="profile-detail-group">
                     <div className="profile-detail-label">EMAIL ADDRESS <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>(Private)</span></div>
                     <div className="profile-detail-value">{profile.email}</div>
                   </div>
                 )}
              </div>

              {isSelf && profile.email && (
                <div style={{ marginTop: 24 }}>
                  <button 
                    className="btn-secondary"
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  >
                    {resetLoading ? <Loader2 size={16} className="spin" /> : <Key size={16} />}
                    {resetLoading ? "Sending..." : "Send Password Reset Link"}
                  </button>
                  {resetMessage && (
                    <p style={{ 
                      marginTop: 8, 
                      fontSize: 12, 
                      textAlign: 'center', 
                      color: resetMessage === "Reset link sent!" ? 'var(--success)' : 'var(--error)' 
                    }}>
                      {resetMessage}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
