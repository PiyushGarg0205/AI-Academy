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

  // Search State
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
      window.scrollTo(0, 0); // Scroll to top when viewing
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
  
  // Filter: Public Courses (With Case-Insensitive Search)
  const publicCourses = allCourses.filter(c => {
    const isPublic = c.creator_username !== auth.user.username;
    // Convert both title and query to lowercase for comparison
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return isPublic && matchesSearch;
  });

  return (
    <main className="dashboard-main container">
      {view === 'list' ? (
        <div id="course-list-view" className="fade-in-up">
          <div className="dashboard-header">
            {activeTab === 'my-courses' && <h1>My Learning Paths</h1>}
            {activeTab === 'create' && <h1>AI Course Generator</h1>}
            {activeTab === 'public' && <h1>Public Course Catalog</h1>}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <p style={{ marginTop: '1rem' }}>Loading content...</p>
            </div>
          )}
          
          {error && <p style={{ color: 'var(--error-color)', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</p>}

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
                    <div className="empty-state" style={styles.emptyState}>
                      <div style={styles.emptyIconBox}>
                        <i className="fas fa-book-open" style={{ fontSize: '2rem', color: 'white' }}></i>
                      </div>
                      <h3>Start Your Journey</h3>
                      <p style={{marginBottom: '1.5rem'}}>You haven't created any courses yet.</p>
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
              <div className="admin-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>What do you want to learn today?</h2>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter a topic, and our AI will build a curriculum for you.</p>
                </div>
                
                <form onSubmit={handleGenerateSubmit}>
                  <div className="form-group">
                    <label>Topic / Subject</label>
                    <input 
                      type="text" 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., Advanced React Patterns, History of Rome, Quantum Physics 101..."
                      required
                      style={{ fontSize: '1.1rem', padding: '1rem' }}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Number of Modules (1-5)</label>
                    <input 
                      type="number" 
                      value={numModules}
                      onChange={(e) => setNumModules(Number(e.target.value))}
                      min="1" max="5"
                      required
                      style={{ padding: '0.8rem' }}
                    />
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={isGenerating} 
                      style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    >
                      {isGenerating ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Generating Course...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-magic"></i> Generate My Course
                        </>
                      )}
                    </button>
                  </div>
                  
                  {isGenerating && (
                    <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      This usually takes about 30-60 seconds. We are curating videos and writing quizzes.
                    </p>
                  )}
                </form>
              </div>
            </section>
          )}

          {/* --- TAB CONTENT: PUBLIC COURSES --- */}
          {activeTab === 'public' && (
            <section className="tab-content fade-in">
              
              {/* SEARCH BAR UI */}
              <div style={styles.searchContainer}>
                <i className="fas fa-search" style={styles.searchIcon}></i>
                <input
                  type="text"
                  placeholder="Search catalog (e.g., 'Python', 'History')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

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
                    <div className="empty-state" style={{...styles.emptyState, maxWidth: '100%'}}>
                      <i className="fas fa-search" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5, color: 'var(--text-muted)' }}></i>
                      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        {searchQuery 
                          ? `No results found for "${searchQuery}"` 
                          : "No public courses available."}
                      </p>
                      {searchQuery && (
                        <button className="btn btn-link" onClick={() => setSearchQuery('')} style={{marginTop: '0.5rem'}}>
                          Clear Search
                        </button>
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

// Inline Styles to complement CSS classes
const styles = {
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '50px',
    padding: '0.5rem 1.5rem',
    marginBottom: '2.5rem',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  searchIcon: {
    color: 'var(--text-muted)',
    fontSize: '1.2rem',
    marginRight: '1rem',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    width: '100%',
    outline: 'none',
    padding: '0.5rem 0',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    background: 'var(--bg-card)',
    borderRadius: '15px',
    border: '1px dashed var(--border-color)',
    textAlign: 'center',
  },
  emptyIconBox: {
    background: 'var(--accent-gradient)',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
  }
};

export default StudentDashboard;