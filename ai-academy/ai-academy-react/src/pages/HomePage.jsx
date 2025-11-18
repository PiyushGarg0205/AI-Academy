// src/pages/HomePage.jsx

import React from 'react';

// Import the section components
import Hero from './HomePage/Hero';
import Features from './HomePage/Features';
import Demo from './HomePage/Demo';

function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Demo />
    </>
  );
}

export default HomePage;