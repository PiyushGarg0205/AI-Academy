// src/components/layout/Footer.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="footer-container">
        <div className="footer-left">
          <h2>About CourseCraft</h2>
          <p className="footer-intro">CourseCraft is an AI-powered platform that helps you transform your knowledge into engaging courses.</p>
          <div className="footer-points">
            <div className="point"><h3>🎓 Create Courses</h3><p>Build your own courses easily with AI.</p></div>
            <div className="point"><h3>📚 Explore Courses</h3><p>Browse and learn from various courses.</p></div>
            <div className="point"><h3>⚡ Save Time</h3><p>Automate structuring and focus on teaching.</p></div>
            <div className="point"><h3>🌍 Share & Collaborate</h3><p>Publish your courses and collaborate with learners.</p></div>
          </div>
          <div className="footer-socials">
            {/* Using <a> for external links is fine, but for internal links, use <Link> */}
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in"></i></a>
          </div>
        </div>
        <div className="footer-right">
          <ul>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/terms">Terms of Use</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
          <ul>
            <li><Link to="/cookies">Cookie Policy</Link></li>
            <li><Link to="/support">Support</Link></li>
            <li><Link to="/community">Community</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>©️ 2025 CourseCraft. All Rights Reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;