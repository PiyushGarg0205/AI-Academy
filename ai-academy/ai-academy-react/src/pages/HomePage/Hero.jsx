// src/pages/HomePage/Hero.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="powered-by">POWERED BY AI</div>
          <h1 className="hero-title">
            Create <span className="highlight">AI-Powered</span><br />
            Courses in Minutes
          </h1>
          <p className="hero-subtitle">
            Transform your knowledge into engaging courses with our intelligent course generator. From concept to completion in record time.
          </p>
          <div className="hero-actions">
            {/* Use <Link> for React routing */}
            <Link to="/signup" className="btn btn-primary pulse-animation">
              Start Creating →
            </Link>
            {/* Use <HashLink> for on-page scrolling */}
            <HashLink to="/#demo" className="btn btn-secondary scroll-link">
              📺 View Demo
            </HashLink>
          </div>
          <div className="stats">
            <div className="stat-card"><div className="stat-number">10K+</div><div className="stat-label">Courses Created</div></div>
            <div className="stat-card"><div className="stat-number">50K+</div><div className="stat-label">Students Engaged</div></div>
            <div className="stat-card"><div className="stat-number">95%</div><div className="stat-label">Satisfaction Rate</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;