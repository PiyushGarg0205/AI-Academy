// src/pages/HomePage/Demo.jsx

import React, { useState } from 'react';

function Demo() {
  // Use state to control the form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillLevel, setSkillLevel] = useState('beginner');

  const handleSubmit = (event) => {
    event.preventDefault();
    // In a real app, you would send this data to your API
    console.log({
      title,
      description,
      skillLevel,
    });
    alert('Course preview generation submitted!');
    // You could reset the form here
    // setTitle('');
    // setDescription('');
    // setSkillLevel('beginner');
  };

  return (
    <section className="demo-section" id="demo">
      <div className="container">
        <div className="demo-container">
          <h2>Make your own Course</h2>
          <p>Experience the power of AI-generated learning. Describe your ideal course below:</p>
          {/* Handle form submission with React */}
          <form className="demo-form" id="demo-form" onSubmit={handleSubmit}>
            <div className="input-group">
              {/* Use htmlFor instead of for */}
              <label htmlFor="courseTitle">Course Title</label>
              <input
                type="text"
                id="courseTitle"
                placeholder="e.g., Introduction to Machine Learning"
                required
                value={title} // Control the component
                onChange={(e) => setTitle(e.target.value)} // Update state
              />
            </div>
            <div className="input-group">
              <label htmlFor="courseDescription">What do you want to learn?</label>
              <textarea
                id="courseDescription"
                placeholder="Describe the topics, skills, and subtopics you want to cover..."
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="input-group">
              <label htmlFor="skillLevel">Skill Level</label>
              <select
                id="skillLevel"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-large">
              Generate Course Preview
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Demo;