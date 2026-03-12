// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Ensure this file exists at src/services/AuthContext.jsx
import { AuthProvider } from './services/AuthContext.jsx'; 

// Layouts & Pages
import MainLayout from './components/layout/MainLayout.jsx'; 
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'; 
import HomePage from './pages/HomePage.jsx'; 
import LoginPage from './pages/LoginPage.jsx'; 
import SignupPage from './pages/SignupPage.jsx'; 
import AdminDashboard from './pages/AdminDashboard.jsx'; 
import StudentDashboard from './pages/StudentDashboard.jsx'; 
import AdminCourseEditPage from './pages/AdminCourseEditPage.jsx'; 
import ReviewsPage from './pages/ReviewsPage.jsx'; 

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
            {/* 👇 REVIEWS ROUTE 👇 */}
            <Route 
              path="/reviews" 
              element={<ReviewsPage />} 
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;