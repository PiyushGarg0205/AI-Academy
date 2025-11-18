// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext.jsx'; // Use .jsx

// Layouts & Pages
import MainLayout from './components/layout/MainLayout.jsx'; // Use .jsx
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'; // Use .jsx
import HomePage from './pages/HomePage.jsx'; // Use .jsx
import LoginPage from './pages/LoginPage.jsx'; // Use .jsx
import SignupPage from './pages/SignupPage.jsx'; // Use .jsx
import AdminDashboard from './pages/AdminDashboard.jsx'; // Use .jsx
import StudentDashboard from './pages/StudentDashboard.jsx'; // Use .jsx
import AdminCourseEditPage from './pages/AdminCourseEditPage.jsx'; // Use .jsx

// Global Styles
import './styles.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- Auth Pages (No Layout) --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* --- Public Routes (with Layout) --- */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>

          {/* --- Protected Routes (with Layout) --- */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute role="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/course/:courseId/edit"
              element={
                <ProtectedRoute role="ADMIN">
                  <AdminCourseEditPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute role="STUDENT">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App; // <-- This is the line that was missing