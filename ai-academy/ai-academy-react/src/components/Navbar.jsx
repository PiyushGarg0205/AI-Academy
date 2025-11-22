import React, { useState } from 'react';

/**
 * The main navigation bar, converted from your index.html.
 * Manages its own mobile menu state.
 * Renders links conditionally based on authentication status.
 */
export default function Navbar({ page, auth, onLogout, onNavigate, theme, onToggleTheme }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  
  const handleNavClick = (target) => {
    setIsMobileMenuOpen(false); // Close menu on navigation
    onNavigate(target);
  };

  return (
    <>
      <header>
        <nav>
          <div className="nav-container container">
            <a href="#top" className="logo scroll-link" onClick={() => handleNavClick('home')}>
              <div className="logo-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44a2.5 2.5 0 0 1-2.96-3.08a3 3 0 0 1-.34-5.58a2.5 2.5 0 0 1 1.32-4.24a2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Zm5 0A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44a2.5 2.5 0 0 0 2.96-3.08a3 3 0 0 0 .34-5.58a2.5 2.5 0 0 0-1.32-4.24a2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                </svg>
              </div>
              <span>CourseCraft</span>
            </a>

            <div className="nav-center">
              <ul className="nav-links">
                {auth ? (
                  <>
                    <li><a href="#" className={page === 'dashboard' ? 'active-nav' : ''} onClick={() => handleNavClick('dashboard')}>My Courses</a></li>
                    <li><a href="#" className={page === 'profile' ? 'active-nav' : ''} onClick={() => handleNavClick('profile')}>Profile</a></li>
                    {auth.role === 'ADMIN' && (
                      <li><a href="#" className={page === 'admin' ? 'active-nav' : ''} onClick={() => handleNavClick('admin')}>Admin</a></li>
                    )}
                  </>
                ) : (
                  <>
                    <li><a href="#features-section" onClick={() => handleNavClick('#features-section')}>Features</a></li>
                    <li><a href="#demo" onClick={() => handleNavClick('#demo')}>Generate</a></li>
                    <li><a href="#about" onClick={() => handleNavClick('#about')}>About</a></li>
                  </>
                )}
              </ul>
            </div>

            <div className="nav-items">
              <div className="theme-toggle theme-toggle-desktop">
                <span className="theme-icon">🌙</span>
                <button className="toggle-switch" type="button" onClick={onToggleTheme} aria-pressed={theme === 'light'}>
                  <span className="toggle-slider"></span>
                </button>
                <span className="theme-icon">☀️</span>
              </div>
              <div className="nav-actions">
                {auth ? (
                  <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
                ) : (
                  <>
                    <button className="btn-link" onClick={() => handleNavClick('login')}>Sign In</button>
                    <button className="btn btn-primary" onClick={() => handleNavClick('signup')}>Sign up</button>
                  </>
                )}
              </div>
            </div>

            <button className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`} type="button" aria-label="Toggle mobile menu" onClick={toggleMobileMenu}>
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
      </header>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <ul className="mobile-menu-links">
          {auth ? (
            <>
              <li><a href="#" onClick={() => handleNavClick('dashboard')}>My Courses</a></li>
              <li><a href="#" onClick={() => handleNavClick('profile')}>Profile</a></li>
              {auth.role === 'ADMIN' && (
                <li><a href="#" onClick={() => handleNavClick('admin')}>Admin</a></li>
              )}
            </>
          ) : (
            <>
              <li><a href="#features-section" onClick={() => handleNavClick('#features-section')}>Features</a></li>
              <li><a href="#demo" onClick={() => handleNavClick('#demo')}>Generate</a></li>
              <li><a href="#about" onClick={() => handleNavClick('#about')}>About</a></li>
            </>
          )}
          <li className="theme-toggle-mobile">
            <div className="theme-toggle">
              <h2>Theme</h2>
              <span className="theme-icon">🌙</span>
              <button className="toggle-switch" type="button" onClick={onToggleTheme} aria-pressed={theme === 'light'}>
                <span className="toggle-slider"></span>
              </button>
              <span className="theme-icon">☀️</span>
            </div>
          </li>
        </ul>
        <div className="mobile-menu-buttons">
          {auth ? (
            <button className="btn btn-secondary" onClick={() => { handleNavClick('home'); onLogout(); }}>Logout</button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => handleNavClick('login')}>Sign In</button>
              <button className="btn btn-primary" onClick={() => handleNavClick('signup')}>Sign up</button>
            </>
          )}
        </div>
      </div>
    </>
  );
};