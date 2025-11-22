// src/components/admin/EditQuestion.jsx
import React, { useState } from 'react';
import { updateQuestion, deleteQuestion } from '../../services/api';

// Helper to convert array to comma-separated string
const optionsToString = (options) => {
  return Array.isArray(options) ? options.join(', ') : '';
};

// Helper to convert comma-separated string to array
const stringToOptions = (str) => {
  if (!str) return []; // Handle empty string
  return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

function EditQuestion({ question, onUpdate }) {
  const [formData, setFormData] = useState({
    question_text: question.question_text || '',
    options: optionsToString(question.options),
    correct_answer: question.correct_answer || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaving(true);
    
    const dataToSave = {
      ...formData,
      options: stringToOptions(formData.options),
    };

    try {
      await updateQuestion(question.id, dataToSave);
      // Optional: show a success message
    } catch (err) {
      alert(`Error saving question: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete this question?`)) return;
    try {
      await deleteQuestion(question.id);
      onUpdate(); // Reload course
    } catch (err) {
      alert(`Error deleting question: ${err.message}`);
    }
  };

  return (
    <div className="edit-lesson-item"> {/* Re-using lesson styles */}
      <div className="edit-lesson-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>{formData.question_text.substring(0, 50) || "New Question"}...</span>
        <div className="lesson-header-actions">
          <button onClick={handleDelete} className="btn-icon delete" title="Delete Question">
            <i className="fas fa-trash"></i>
          </button>
          <i className={`fas fa-chevron-down ${isExpanded ? 'expanded' : ''}`}></i>
        </div>
      </div>

      {isExpanded && (
        <form className="edit-lesson-form" onSubmit={handleSave}> {/* Re-using lesson styles */}
          <div className="form-group">
            <label>Question Text</label>
            <textarea name="question_text" value={formData.question_text} onChange={handleChange} rows={3} />
          </div>
          <div className="form-group">
            <label>Options (comma-separated)</label>
            <input name="options" value={formData.options} onChange={handleChange} placeholder="e.g., Option A, Option B, Option C" />
          </div>
          <div className="form-group">
            <label>Correct Answer</label>
            <input name="correct_answer" value={formData.correct_answer} onChange={handleChange} placeholder="Must match one of the options exactly" />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Question'}
          </button>
        </form>
      )}
    </div>
  );
}

export default EditQuestion;