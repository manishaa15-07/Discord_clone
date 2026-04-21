import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatWindow from "./ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import "./index.css";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("discord_token") || null);
  const [username, setUsername] = useState(() => localStorage.getItem("discord_username") || "");

  const storeToken = (newToken) => {
    setToken(newToken);
    if (newToken) localStorage.setItem("discord_token", newToken);
    else localStorage.removeItem("discord_token");
  };

  const storeUsername = (newUsername) => {
    setUsername(newUsername);
    if (newUsername) localStorage.setItem("discord_username", newUsername);
    else localStorage.removeItem("discord_username");
  };



  return (
    <>
      <div className="animated-bg"></div>
      <Router>
        <Routes>
          {/* Redirect root to chat if logged in, else login */}
          <Route
            path="/"
            element={token ? <Navigate to="/chat" replace /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/login"
            element={
              token ? <Navigate to="/chat" replace /> :
                <Login
                  setToken={storeToken}
                  setUsername={storeUsername}
                />
            }
          />

          <Route
            path="/register"
            element={
              token ? <Navigate to="/chat" replace /> :
                <Register
                  setToken={storeToken}
                  setUsername={storeUsername}
                />
            }
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          <Route
            path="/chat"
            element={
              !token ? <Navigate to="/login" replace /> :
                <ChatWindow
                  token={token}
                  username={username || "TestUser"}
                  onLogout={() => {
                    storeToken(null);
                    storeUsername("");
                  }}
                />
            }
          />

          {/* Catch all unhandled routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;