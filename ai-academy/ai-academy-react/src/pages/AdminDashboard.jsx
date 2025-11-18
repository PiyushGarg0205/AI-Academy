// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { generateCourse, getCourses, deleteCourse, publishCourse } from '../services/api.jsx';
import CourseListItem from '../components/admin/CourseListItem.jsx';

function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the form
  const [prompt, setPrompt] = useState('');
  const [numContentModules, setNumContentModules] = useState(3);
  // 👇 --- NEW STATE --- 👇
  const [numLessonsPerModule, setNumLessonsPerModule] = useState(3);
  const [numTestModules, setNumTestModules] = useState(1);
  // -----------------------

  const [generateStatus, setGenerateStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handlePublish = async (courseId) => {
    if (!window.confirm('Are you sure you want to publish this course?')) return;
    try {
      await publishCourse(courseId);
      loadCourses(); // Refresh
    } catch (err) {
      alert(`Error publishing: ${err.message}`);
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to permanently delete this course?')) return;
    try {
      await deleteCourse(courseId);
      loadCourses(); // Refresh
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerateStatus('🤖 Generating course... This is a complex task and may take several minutes.');
    
    try {
      // 👇 --- PASS NEW PARAMS --- 👇
      await generateCourse(
        prompt, 
        numContentModules, 
        numLessonsPerModule, 
        numTestModules
      );
      // ---------------------------
      
      setGenerateStatus('✅ Course generated successfully!');
      setPrompt('');
      setNumContentModules(3);
      setNumLessonsPerModule(3);
      setNumTestModules(1);
      loadCourses(); // Refresh the list
    } catch (err) {
      setGenerateStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="dashboard-main">
      <div className="container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
        </div>
        
        <div className="admin-grid">
          <div className="admin-card">
            <h2>Generate New Course</h2>
            <form id="generate-form" onSubmit={handleGenerateSubmit}>
              <div className="form-group">
                <label htmlFor="prompt">Course Topic</label>
                <input
                  type="text"
                  id="prompt"
                  placeholder="e.g., Introduction to Python"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="num_content_modules">Number of Content Modules</label>
                <input
                  type="number"
                  id="num_content_modules"
                  value={numContentModules}
                  onChange={(e) => setNumContentModules(Number(e.target.value))}
                  min="1"
                  max="10"
                  required
                />
              </div>
              
              {/* --- 👇 NEW FIELDS --- 👇 --- */}
              <div className="form-group">
                <label htmlFor="num_lessons_per_module">Lessons per Module</label>
                <input
                  type="number"
                  id="num_lessons_per_module"
                  value={numLessonsPerModule}
                  onChange={(e) => setNumLessonsPerModule(Number(e.target.value))}
                  min="1"
                  max="10"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="num_test_modules">Number of Intermediate Tests</label>
                <input
                  type="number"
                  id="num_test_modules"
                  value={numTestModules}
                  onChange={(e) => setNumTestModules(Number(e.target.value))}
                  min="0"
                  max="5"
                  required
                />
                <small>A test will be added after a group of modules. (e.g., 2 tests for 6 modules = 1 test after module 3, 1 after module 6). An ultimate final test is always added.</small>
              </div>
              {/* --- 👆 END NEW FIELDS 👆 --- */}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Course'}
              </button>
            </form>
            <p id="generate-status">{generateStatus}</p>
          </div>

          <div className="admin-card">
            <h2>Manage Courses</h2>
            <div id="course-list">
              {loading && <p>Loading courses...</p>}
              {error && <p style={{ color: 'red' }}>{error}</p>}
              {!loading && courses.length === 0 && <p>No courses found.</p>}
              {!loading && courses.map(course => (
                <CourseListItem
                  key={course.id}
                  course={course}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;