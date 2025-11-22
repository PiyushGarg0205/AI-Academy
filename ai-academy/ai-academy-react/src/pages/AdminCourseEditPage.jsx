// src/pages/AdminCourseEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById, createModule } from '../services/api';
import EditModule from '../components/admin/EditModule.jsx';
import GenerateModuleForm from '../components/admin/GenerateModuleForm.jsx';
import './AdminCourseEditPage.css'; 

function AdminCourseEditPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the full course data
  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // getCourseById fetches the nested structure
      const data = await getCourseById(courseId);
      setCourse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // This function is passed to children so they can trigger a reload
  const handleDataChange = () => {
    loadCourse();
  };

  const handleAddNewModule = async (moduleType) => {
    const title = moduleType === 'CONTENT' ? "New Content Module" : "New Test Module";
    if (!window.confirm(`Add a new empty "${title}" to this course?`)) return;
    
    try {
      const newOrder = (course.modules?.length || 0) + 1;
      // We must now tell the API what type of module to create
      await createModule(courseId, title, newOrder, moduleType); 
      handleDataChange(); // Reload
    } catch (err) {
      alert(`Error creating module: ${err.message}`);
    }
  };

  if (loading) return <div className="container"><p>Loading course editor...</p></div>;
  if (error) return <div className="container"><p>Error loading course: {error}</p></div>;
  if (!course) return <div className="container"><p>Course not found.</p></div>;

  return (
    <div className="dashboard-main">
      <div className="container">
        <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary" style={{marginBottom: '1.5rem'}}>
          &larr; Back to Dashboard
        </button>
        <div className="dashboard-header">
          {/* Use a simple h1 that inherits color */}
          <h1 style={{color: 'var(--text-primary)', marginBottom: 0}}>Editing: {course.title}</h1>
        </div>

        {/* AI Generation Form */}
        <GenerateModuleForm 
          courseId={course.id} 
          onModuleGenerated={handleDataChange} 
        />

        {/* Manual "Add Module" Buttons */}
        <div className="add-module-actions" style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
          <button onClick={() => handleAddNewModule('CONTENT')} className="btn btn-primary">
            + Add Content Module
          </button>
          <button onClick={() => handleAddNewModule('ASSESSMENT')} className="btn btn-secondary">
            + Add Test Module (Quiz)
          </button>
        </div>
        
        <hr className="edit-divider" />

        {/* List of Modules to Edit */}
        <div className="admin-modules-list">
          <h2>Course Modules</h2>
          {course.modules.length > 0 ? course.modules.map(module => (
            <EditModule
              key={module.id}
              module={module}
              onUpdate={handleDataChange} // Pass the reload function down
            />
          )) : <p>This course has no modules yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default AdminCourseEditPage;