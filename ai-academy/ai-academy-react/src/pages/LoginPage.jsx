// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { loginUser } from '../services/api';
import { jwtDecode } from 'jwt-decode';

// Import the new reusable component
import AuthModal from '../components/auth/AuthModal'; 

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    try {
      const data = await loginUser(username, password);
      login(data.access); // Use auth context to set token
      
      const payload = jwtDecode(data.access);
      const redirectPath = from || (payload.role === 'ADMIN' ? '/admin-dashboard' : '/student-dashboard');
      
      navigate(redirectPath, { replace: true });

    } catch (error) {
      setError(error.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Use the AuthModal as the wrapper
    <AuthModal
      title="Welcome Back"
      footerText="Don’t have an account?"
      footerLink="/signup"
      footerLinkText="Sign up"
    >
      {/* This is passed in as 'children' */}
      {error && <p id="error-message" style={{ display: 'block' }}>{error}</p>}
      
      <form id="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {/* The footer link is now part of the modal */}
    </AuthModal>
  );
}

export default LoginPage;