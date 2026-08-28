// src/components/admin/EditLesson.jsx
import React, { useState } from 'react';
import { updateLesson, deleteLesson } from '../../services/api';

// Helper function to extract YouTube ID
function extractYouTubeID(url) {
  if (!url) return '';
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  // If it's a match, return the ID. If not (or if it's already just an ID), return the original string.
  return match ? match[1] : url;
}

function EditLesson({ lesson, onUpdate }) {
  const [formData, setFormData] = useState({
    title: lesson.title || '',
    content: lesson.content || '',
    video_id: lesson.video_id || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  // Set to 'false' so it's collapsible as you requested
  const [isExpanded, setIsExpanded] = useState(false); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'video_id') {
      const extractedID = extractYouTubeID(value);
      setFormData(prev => ({ ...prev, [name]: extractedID }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaving(true);
    
    try {
      await updateLesson(lesson.id, formData);
      // Optional: show a success message
    } catch (err) {
      alert(`Error saving lesson: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the lesson: "${lesson.title}"?`)) return;
    try {
      await deleteLesson(lesson.id);
      onUpdate(); // Reload course
    } catch (err) {
      alert(`Error deleting lesson: ${err.message}`);
    }
  };

  return (
    <div className="edit-lesson-item">
      <div className="edit-lesson-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>{formData.title || "New Lesson"}</span>
        <div className="lesson-header-actions">
          <button onClick={handleDelete} className="btn-icon delete" title="Delete Lesson">
            <i className="fas fa-trash"></i>
          </button>
          <i className={`fas fa-chevron-down ${isExpanded ? 'expanded' : ''}`}></i>
        </div>
      </div>

      {isExpanded && (
        <form className="edit-lesson-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Lesson Title</label>
            <input name="title" value={formData.title} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Text Content (HTML allowed)</label>
            <textarea name="content" value={formData.content} onChange={handleChange} rows={8} />
          </div>
          <div className="form-group">
            <label>YouTube Video Link or ID</label>
            <input 
              name="video_id" 
              value={formData.video_id} 
              onChange={handleChange} 
              placeholder="Paste full YouTube link or just the ID" 
            />
          </div>
          
          <button type="submit" className="btn btn-secondary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Lesson'}
          </button>
        </form>
      )}
    </div>
  );
}

export default EditLesson;