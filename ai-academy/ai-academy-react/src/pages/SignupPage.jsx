// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

// Import the new reusable component
import AuthModal from '../components/auth/AuthModal';

function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      await registerUser(username, email, password);
      
      setMessage({ text: 'Registration successful! Redirecting to login...', type: 'success' });
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setMessage({ text: error.message || 'Registration failed.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    // Use the AuthModal as the wrapper
    <AuthModal
      title="Create Your Account"
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      {/* This is passed in as 'children' */}
      {message.text && (
        <p id="message" className={message.type} style={{ display: 'block' }}>
          {message.text}
        </p>
      )}
      <form id="signup-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || message.type === 'success'}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>
    </AuthModal>
  );
}

export default SignupPage;