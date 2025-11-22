// src/pages/StudentDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCourses, getCourseById, generateCourse } from '../services/api.jsx';
import { useAuth } from '../services/AuthContext.jsx';
import CourseCard from '../components/student/CourseCard.jsx';
import CourseViewer from '../components/student/CourseViewer.jsx';

function StudentDashboard() {
  const { auth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('list'); 
  
  // Get active tab from URL, default to 'my-courses'
  const activeTab = searchParams.get('tab') || 'my-courses';

  // Helper to switch tabs and update URL
  const setActiveTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const [allCourses, setAllCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [prompt, setPrompt] = useState('');
  const [numModules, setNumModules] = useState(3);

  // 👇 Search State
  const [searchQuery, setSearchQuery] = useState('');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCourses();
      setAllCourses(data);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleViewCourse = async (courseId) => {
    setLoading(true);
    setError('');
    try {
      const courseData = await getCourseById(courseId);
      setSelectedCourse(courseData);
      setView('viewer');
    } catch (err) {
      setError(err.message || 'Failed to load course details.');
      setView('list');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedCourse(null);
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await generateCourse(prompt, numModules, 2, 1); 
      alert('Course generated successfully!');
      setPrompt('');
      loadCourses(); 
      setActiveTab('my-courses'); // Go to my courses after generating
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter: My Courses
  const myCourses = allCourses.filter(c => c.creator_username === auth.user.username);
  
  // 👇 Filter: Public Courses (With Case-Insensitive Search)
  const publicCourses = allCourses.filter(c => {
    const isPublic = c.creator_username !== auth.user.username;
    // Convert both title and query to lowercase for comparison
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return isPublic && matchesSearch;
  });

  return (
    <main className="dashboard-main container">
      {view === 'list' ? (
        <div id="course-list-view">
          <div className="dashboard-header">
            {activeTab === 'my-courses' && <h1>My Learning Paths</h1>}
            {activeTab === 'create' && <h1>AI Course Generator</h1>}
            {activeTab === 'public' && <h1>Public Course Catalog</h1>}
          </div>

          {loading && <p>Loading courses...</p>}
          {error && <p style={{ color: 'var(--error-color)' }}>{error}</p>}

          {/* --- TAB CONTENT: MY COURSES --- */}
          {activeTab === 'my-courses' && (
            <section className="tab-content fade-in">
              <div className="course-list">
                {!loading && myCourses.length > 0 ? (
                  myCourses.map(course => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onViewCourse={handleViewCourse}
                    />
                  ))
                ) : (
                  !loading && (
                    <div className="empty-state">
                      <p>You haven't created any courses yet.</p>
                      <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                        Generate Your First Course
                      </button>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* --- TAB CONTENT: CREATE --- */}
          {activeTab === 'create' && (
            <section className="tab-content fade-in">
              <div className="admin-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  What do you want to learn today?
                </h2>
                <form onSubmit={handleGenerateSubmit}>
                  <div className="form-group">
                    <label>Topic</label>
                    <input 
                      type="text" 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., Advanced React Patterns, History of Rome..."
                      required
                      style={{ fontSize: '1.1rem', padding: '1rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Modules</label>
                    <input 
                      type="number" 
                      value={numModules}
                      onChange={(e) => setNumModules(Number(e.target.value))}
                      min="1" max="5"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isGenerating} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                    {isGenerating ? 'Generating Course...' : '✨ Generate My Course'}
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* --- TAB CONTENT: PUBLIC COURSES --- */}
          {activeTab === 'public' && (
            <section className="tab-content fade-in">
              
              {/* 👇 SEARCH BAR UI 👇 */}
              <div className="search-wrapper">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for courses (e.g., 'Java', 'Python')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* ------------------ */}

              <div className="course-list">
                {!loading && publicCourses.length > 0 ? (
                  publicCourses.map(course => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onViewCourse={handleViewCourse}
                    />
                  ))
                ) : (
                  !loading && (
                    <div className="empty-state">
                      <i className="fas fa-search" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        {searchQuery 
                          ? `No results found for "${searchQuery}"` 
                          : "No public courses available."}
                      </p>
                      {searchQuery && (
                        <button className="btn-link" onClick={() => setSearchQuery('')}>Clear Search</button>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}

        </div>
      ) : (
        <CourseViewer
          course={selectedCourse}
          onBack={handleBackToList}
        />
      )}
    </main>
  );
}

export default StudentDashboard;