import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatWindow from "./ChatWindow";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import "./index.css";

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");
  const [isMockMode, setIsMockMode] = useState(false);

  return (
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
              setToken={setToken} 
              setUsername={setUsername} 
              isMockMode={isMockMode} 
              setIsMockMode={setIsMockMode} 
            />
          } 
        />
        
        <Route 
          path="/register" 
          element={
            token ? <Navigate to="/chat" replace /> :
            <Register 
              setToken={setToken} 
              setUsername={setUsername} 
              isMockMode={isMockMode} 
              setIsMockMode={setIsMockMode} 
            />
          } 
        />
        
        <Route 
          path="/forgot-password" 
          element={<ForgotPassword isMockMode={isMockMode} />} 
        />
        
        <Route 
          path="/reset-password" 
          element={<ResetPassword isMockMode={isMockMode} />} 
        />
        
        <Route 
          path="/chat" 
          element={
            !token ? <Navigate to="/login" replace /> :
            <ChatWindow 
              token={token} 
              username={username || "TestUser"} 
              isMockMode={isMockMode} 
              onLogout={() => { 
                setToken(null); 
                setIsMockMode(false); 
              }} 
            />
          } 
        />
        
        {/* Catch all unhandled routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;