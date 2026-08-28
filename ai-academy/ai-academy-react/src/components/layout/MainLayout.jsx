// src/components/layout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // From previous step
import Footer from './Footer'; // From previous step

function MainLayout() {
  // Theme logic is now encapsulated in the layout
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main id="main-content">
        <Outlet /> {/* This renders the active page component (e.g., HomePage) */}
      </main>
      <Footer />
    </>
  );
}

export default MainLayout;