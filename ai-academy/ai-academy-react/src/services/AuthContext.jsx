// src/services/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check for token expiration
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('accessToken');
          return null;
        }
        return { token, user: { role: decoded.role, username: decoded.username } };
      } catch (e) {
        localStorage.removeItem('accessToken');
        return null;
      }
    }
    return null;
  });

  const login = (token) => {
    const decoded = jwtDecode(token);
    setAuth({ token, user: { role: decoded.role, username: decoded.username } });
    localStorage.setItem('accessToken', token);
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem('accessToken');
    // 👇 --- THIS LINE IS UPDATED --- 👇
    window.location.href = '/'; // Redirect to the landing page
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);