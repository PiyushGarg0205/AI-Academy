// src/components/auth/AuthModal.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './AuthModal.css'; // Use the CSS file we already created

// A reusable wrapper for the Login and Signup forms
function AuthModal({ title, children, footerText, footerLink, footerLinkText }) {
  return (
    <div className="auth-page-container">
      <div className="modal-content">
        <h2>{title}</h2>
        
        {/* This is where the <form> from Login/Signup will go */}
        {children}
        
        <div className="switch-modal">
          {footerText} <Link to={footerLink}>{footerLinkText}</Link>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;