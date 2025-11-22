// src/components/admin/GenerateModuleForm.jsx
import React, { useState } from 'react';
import { generateModuleForCourse } from '../../services/api.jsx';

function GenerateModuleForm({ courseId, onModuleGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [moduleType, setModuleType] = useState('CONTENT'); // Default to Content
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt) {
      setError('Please enter a prompt for the module topic.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await generateModuleForCourse(courseId, prompt, moduleType);
      setSuccess('Successfully generated and added the new module!');
      setPrompt('');
      onModuleGenerated(); 
    } catch (err) {
      setError(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-card" style={{marginTop: '1.5rem'}}>
      <h2>Generate Additional Module (AI)</h2>
      <p>Enter a topic, choose the type, and the AI will generate it for you.</p>
      
      <form onSubmit={handleSubmit} style={{marginTop: '1rem'}}>
        <div className="form-group">
          <label htmlFor="ai-prompt">New Module Topic</label>
          <input
            type="text"
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Advanced State Management"
          />
        </div>

        <div className="form-group">
          <label htmlFor="module-type">Module Type</label>
          <select 
            id="module-type"
            value={moduleType}
            onChange={(e) => setModuleType(e.target.value)}
          >
            <option value="CONTENT">Content Module (Lessons + Video)</option>
            <option value="ASSESSMENT">Test Module (Quiz Questions)</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Generating...' : 'Generate with AI'}
        </button>
        
        {error && <p style={{color: 'red', marginTop: '1rem'}}>{error}</p>}
        {success && <p style={{color: 'green', marginTop: '1rem'}}>{success}</p>}
      </form>
    </div>
  );
}

export default GenerateModuleForm;