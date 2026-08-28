// src/components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';

// The `role` prop is now optional
function ProtectedRoute({ children, role }) {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth) {
    // 1. Not logged in at all
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Logged in, but a specific role is required and they don't match
  if (role && auth.user.role !== role) {
    // Redirect them to the dashboard they *do* have access to
    const dashboard = auth.user.role === 'ADMIN' ? '/admin-dashboard' : '/student-dashboard';
    return <Navigate to={dashboard} state={{ from: location }} replace />;
  }

  // 3. Logged in, and:
  //    - No specific role was required (e.g., just viewing the layout)
  //    - OR the role matches
  return children;
}

export default ProtectedRoute;