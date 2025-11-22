// src/components/student/MCQForm.jsx
import React, { useState } from 'react';

function MCQForm({ question, options, correctAnswer }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedOption) {
      alert('Please select an answer!');
      return;
    }

    setIsSubmitted(true);
    if (selectedOption === correctAnswer) {
      setFeedback({ text: '✅ Correct! Well done.', type: 'correct' });
    } else {
      setFeedback({ text: `❌ Not quite. The correct answer is: "${correctAnswer}"`, type: 'incorrect' });
    }
  };

  return (
    <div id="mcq-container" style={{ display: 'block' }}>
      <form id="mcq-form" onSubmit={handleSubmit}>
        <p id="mcq-question">{question}</p>
        <div id="mcq-options">
          {(options || []).map((opt, i) => (
            <div className="mcq-option" key={i}>
              <input
                type="radio"
                id={`opt-${i}`}
                name="mcq"
                value={opt}
                checked={selectedOption === opt}
                onChange={(e) => setSelectedOption(e.target.value)}
                disabled={isSubmitted}
                required
              />
              <label htmlFor={`opt-${i}`}>{opt}</label>
            </div>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={isSubmitted}>
          Check Answer
        </button>
      </form>
      
      {feedback.text && (
        <p id="mcq-feedback" className={feedback.type} style={{ display: 'block' }}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}

export default MCQForm;