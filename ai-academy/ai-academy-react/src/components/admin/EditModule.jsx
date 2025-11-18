// src/components/admin/EditModule.jsx
import React, { useState } from 'react';
import { updateModule, deleteModule, createLesson } from '../../services/api';
import EditLesson from './EditLesson.jsx';
import EditQuiz from './EditQuiz.jsx'; 

function EditModule({ module, onUpdate }) {
  const [title, setTitle] = useState(module.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded

  const handleTitleSave = async () => {
    if (title === module.title) return; // No change
    setIsSaving(true);
    try {
      await updateModule(module.id, { title });
      // No need to call onUpdate() for just a title change
    } catch (err) {
      alert(`Error saving title: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteModule = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the module: "${module.title}"? This will delete all its lessons/questions and cannot be undone.`)) return;
    try {
      await deleteModule(module.id);
      onUpdate(); // Reload course
    } catch (err) {
      alert(`Error deleting module: ${err.message}`);
    }
  };

  const handleAddNewLesson = async () => {
    // This button will only be shown for 'CONTENT' modules
    try {
      const newOrder = (module.lessons?.length || 0) + 1;
      await createLesson(module.id, "New Lesson", newOrder);
      onUpdate(); // Reload course
    } catch (err) {
      alert(`Error adding new lesson: ${err.message}`);
    }
  };

  return (
    <div className="admin-card edit-module">
      <div className="edit-module-header" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Show an icon based on type */}
        <i 
          className={`fas ${module.module_type === 'CONTENT' ? 'fa-book-open' : 'fa-clipboard-check'}`} 
          style={{marginRight: '1rem', fontSize: '1.2rem'}}
          title={`Type: ${module.module_type}`}
        ></i>
        
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave} // Save when clicking away
          onClick={(e) => e.stopPropagation()} // Don't collapse when clicking input
          className="module-title-input"
          disabled={isSaving}
        />
        <div className="module-header-actions">
          <button onClick={handleDeleteModule} className="btn-icon delete" title="Delete Module">
            <i className="fas fa-trash"></i>
          </button>
          <i className={`fas fa-chevron-down ${isExpanded ? 'expanded' : ''}`}></i>
        </div>
      </div>
      
      {isExpanded && (
        <div className="edit-module-content">
          
          {/* --- THIS IS THE CONDITIONAL LOGIC --- */}
          
          {module.module_type === 'CONTENT' ? (
            // This is a CONTENT module
            <>
              <h3>Lessons</h3>
              {module.lessons.length > 0 ? (
                module.lessons.map(lesson => (
                  <EditLesson 
                    key={lesson.id} 
                    lesson={lesson} 
                    onUpdate={onUpdate} 
                  />
                ))
              ) : <p>This module has no lessons.</p>}
              
              <button onClick={handleAddNewLesson} className="btn btn-secondary" style={{marginTop: '1rem'}}>
                + Add New Lesson
              </button>
            </>
          ) : (
            // This is an ASSESSMENT module
            <EditQuiz 
              quiz={module.quiz} // This might be null if just created
              moduleId={module.id} // Pass module ID to create a quiz
              onUpdate={onUpdate} 
            />
          )}
        </div>
      )}
    </div>
  );
}

export default EditModule;