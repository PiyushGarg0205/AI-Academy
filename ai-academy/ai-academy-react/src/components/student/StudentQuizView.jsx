// src/components/student/StudentQuizView.jsx
import React, { useState } from 'react';

function StudentQuizView({ quiz, moduleId, onComplete }) {
  const [answers, setAnswers] = useState({}); // { questionId: "selectedOption" }
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null); // Data from server response
  const [isLoading, setIsLoading] = useState(false);

  const handleOptionChange = (questionId, option) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic client-side check to ensure all questions are answered
    if (Object.keys(answers).length < quiz.questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      // Call the backend API to grade and unlock next module
      const response = await fetch(`http://127.0.0.1:8000/api/modules/${moduleId}/submit-quiz/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });

      const data = await response.json();

      if (response.ok) {
        setResultData(data); // { score: 85, passed: true, results: [...], next_module_unlocked: true }
        setSubmitted(true);
        
        // If passed, notify parent (CourseViewer) to refresh the sidebar so next module unlocks
        if (data.passed && onComplete) {
            onComplete(); 
        }
      } else {
        alert(data.error || "Error submitting quiz");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return <div className="lesson-content-area"><h2>Empty Quiz</h2><p>This test has no questions yet.</p></div>;
  }

  return (
    <div className="lesson-content-area">
      <div className="course-header">
        <h2 style={{ color: 'var(--accent-color)' }}>📝 {quiz.title}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
            Complete this assessment to unlock the next module. 
            Passing score: 70%.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="quiz-form">
        {quiz.questions.map((q, index) => {
          // If submitted, check resultData for correctness visualization
          let isCorrect = false;
          let isWrong = false;
          let correctAnswerText = "";

          if (submitted && resultData) {
            // Find the result for this specific question
            const qResult = resultData.results.find(r => r.question_id === q.id);
            if (qResult) {
                isCorrect = qResult.is_correct;
                isWrong = !qResult.is_correct;
                correctAnswerText = qResult.correct_answer;
            }
          }

          return (
            <div key={q.id} className="quiz-question-card" style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              background: 'var(--bg-primary)', 
              borderRadius: '10px',
              border: isCorrect ? '2px solid #10b981' : isWrong ? '2px solid #ef4444' : '1px solid var(--border-color)'
            }}>
              <h4 style={{ marginBottom: '1rem', display:'flex', justifyContent:'space-between' }}>
                <span>{index + 1}. {q.question_text}</span>
                {isCorrect && <i className="fas fa-check" style={{color:'#10b981'}}></i>}
                {isWrong && <i className="fas fa-times" style={{color:'#ef4444'}}></i>}
              </h4>
              
              <div className="quiz-options" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, i) => (
                  <label key={i} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      cursor: submitted ? 'default' : 'pointer',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      backgroundColor: (submitted && opt === answers[q.id]) ? 'rgba(0,0,0,0.05)' : 'transparent'
                  }}>
                    <input 
                      type="radio" 
                      name={`question-${q.id}`} 
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleOptionChange(q.id, opt)}
                      disabled={submitted}
                    />
                    <span style={{ fontWeight: (submitted && opt === answers[q.id]) ? '600' : '400' }}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
              
              {submitted && isWrong && (
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#fef2f2', borderRadius:'4px', color: '#b91c1c', fontSize: '0.9rem' }}>
                  <strong>Correct Answer:</strong> {correctAnswerText}
                </div>
              )}
            </div>
          );
        })}

        {!submitted ? (
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? (
                <span><i className="fas fa-spinner fa-spin"></i> Grading...</span>
            ) : (
                "Submit Assessment"
            )}
          </button>
        ) : (
          <div className="quiz-results" style={{ 
              textAlign: 'center', 
              marginTop: '2rem', 
              padding: '2rem', 
              background: resultData.passed ? '#ecfdf5' : '#fef2f2', 
              border: `1px solid ${resultData.passed ? '#10b981' : '#ef4444'}`,
              borderRadius: '10px' 
          }}>
            <h3 style={{ fontSize: '2rem', color: resultData.passed ? '#059669' : '#dc2626' }}>
                {Math.round(resultData.score)}%
            </h3>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {resultData.passed ? "🎉 Passed! Next Module Unlocked." : "❌ Assessment Failed."}
            </p>
            
            {!resultData.passed && (
                <button 
                    onClick={() => { setSubmitted(false); setAnswers({}); setResultData(null); window.scrollTo(0,0); }}
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem' }}
                >
                    <i className="fas fa-redo"></i> Retry Quiz
                </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default StudentQuizView;