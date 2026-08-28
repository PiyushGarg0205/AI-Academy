// src/pages/HomePage/Features.jsx

import React from 'react';

function Features() {
  return (
    <section className="features-section" id="features-section">
      <div className="container">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Describe Your Goals</h3>
            <p>Tell our AI what you want to learn and your specific topics of interest. Be as detailed or general as you like.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Generates Content</h3>
            <p>Our advanced AI creates comprehensive course materials, finds relevant resources, and designs interactive quizzes.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Start Learning</h3>
            <p>Access your personalized course immediately. Track progress, take quizzes, and update your learning path anytime.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features;