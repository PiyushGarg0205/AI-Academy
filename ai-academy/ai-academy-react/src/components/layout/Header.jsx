// src/components/layout/Header.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';
import { useAuth } from '../../services/AuthContext.jsx';

const LogoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44a2.5 2.5 0 0 1-2.96-3.08a3 3 0 0 1-.34-5.58a2.5 2.5 0 0 1 1.32-4.24a2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Zm5 0A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44a2.5 2.5 0 0 0 2.96-3.08a3 3 0 0 0 .34-5.58a2.5 2.5 0 0 0-1.32-4.24a2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

function Header({ theme, toggleTheme }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { auth, logout } = useAuth();
  const location = useLocation(); 

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const handleLogout = () => { closeMobileMenu(); logout(); };

  const isActive = (path) => location.pathname + location.search === path;

  // 👇 --- DYNAMIC LOGO LOGIC --- 👇
  const getLogoTarget = () => {
    if (!auth) return "/#top"; // Guest -> Landing Page
    if (auth.user.role === 'ADMIN') return "/admin-dashboard"; // Admin -> Admin Dashboard
    return "/student-dashboard"; // Student -> Student Dashboard
  };
  // ------------------------------

  return (
    <>
      <div id="top"></div>
      <header>
        <nav>
          <div className="nav-container container">
            {/* 👇 UPDATED LINK HERE */}
            <HashLink to={getLogoTarget()} className="logo scroll-link" aria-label="CourseCraft Home">
              <div className="logo-box"><LogoIcon /></div>
              <span>CourseCraft</span>
            </HashLink>

            <div className="nav-center">
              <ul className="nav-links">
                {/* --- GUEST LINKS --- */}
                {!auth && (
                  <>
                    <li><HashLink to="/#features-section" className="scroll-link">Features</HashLink></li>
                    <li><HashLink to="/#demo" className="scroll-link">Generate</HashLink></li>
                    <li><HashLink to="/#about" className="scroll-link">About</HashLink></li>
                  </>
                )}

                {/* --- ADMIN LINKS --- */}
                {auth && auth.user.role === 'ADMIN' && (
                  <li><Link to="/admin-dashboard">Admin Dashboard</Link></li>
                )}

                {/* --- STUDENT LINKS --- */}
                {auth && auth.user.role === 'STUDENT' && (
                  <>
                    <li>
                      <Link 
                        to="/student-dashboard?tab=my-courses" 
                        className={isActive('/student-dashboard?tab=my-courses') ? 'active-nav' : ''}
                      >
                        👤 My Paths
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/student-dashboard?tab=create"
                        className={isActive('/student-dashboard?tab=create') ? 'active-nav' : ''}
                      >
                        ✨ Generate
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/student-dashboard?tab=public"
                        className={isActive('/student-dashboard?tab=public') ? 'active-nav' : ''}
                      >
                        🌐 Catalog
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="nav-items">
              <div className="theme-toggle theme-toggle-desktop">
                <span className="theme-icon">🌙</span>
                <button className="toggle-switch" type="button" aria-pressed={theme === 'light'} onClick={toggleTheme}>
                  <span className="toggle-slider"></span>
                </button>
                <span className="theme-icon">☀️</span>
              </div>
              
              <div className="nav-actions">
                {auth ? (
                  <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
                ) : (
                  <>
                    <Link to="/login" className="btn-link">Sign In</Link>
                    <Link to="/signup" className="btn btn-primary">Sign up</Link>
                  </>
                )}
              </div>
            </div>

            <button className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <ul className="mobile-menu-links">
          {/* 👇 UPDATED MOBILE LOGO LINK TOO (VIA HOME CLICK) */}
          <li><HashLink to={getLogoTarget()} onClick={closeMobileMenu}>Home</HashLink></li>

          {!auth && (
            <>
              <li><HashLink to="/#features-section" onClick={closeMobileMenu}>Features</HashLink></li>
              <li><HashLink to="/#demo" onClick={closeMobileMenu}>Generate</HashLink></li>
              <li><HashLink to="/#about" onClick={closeMobileMenu}>About</HashLink></li>
            </>
          )}
          
          {auth && auth.user.role === 'ADMIN' && (
            <li><Link to="/admin-dashboard" onClick={closeMobileMenu}>Admin Dashboard</Link></li>
          )}

          {auth && auth.user.role === 'STUDENT' && (
            <>
              <li><Link to="/student-dashboard?tab=my-courses" onClick={closeMobileMenu}>👤 My Paths</Link></li>
              <li><Link to="/student-dashboard?tab=create" onClick={closeMobileMenu}>✨ AI Generator</Link></li>
              <li><Link to="/student-dashboard?tab=public" onClick={closeMobileMenu}>🌐 Public Catalog</Link></li>
            </>
          )}

          <li className="theme-toggle-mobile">
            <div className="theme-toggle">
              <h2>Theme</h2>
              <span className="theme-icon">🌙</span>
              <button className="toggle-switch" type="button" aria-pressed={theme === 'light'} onClick={toggleTheme}>
                <span className="toggle-slider"></span>
              </button>
              <span className="theme-icon">☀️</span>
            </div>
          </li>
        </ul>
        
        <div className="mobile-menu-buttons">
          {auth ? (
            <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" onClick={closeMobileMenu}>Sign In</Link>
              <Link to="/signup" className="btn btn-primary" onClick={closeMobileMenu}>Sign up</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Header;