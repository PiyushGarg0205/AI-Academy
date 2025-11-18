// src/components/student/StudentQuizView.jsx
import React, { useState } from 'react';

function StudentQuizView({ quiz, onComplete }) {
  const [answers, setAnswers] = useState({}); // { questionId: "selectedOption" }
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleOptionChange = (questionId, option) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setSubmitted(true);
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return <div className="lesson-content-area"><h2>Empty Quiz</h2><p>This test has no questions yet.</p></div>;
  }

  return (
    <div className="lesson-content-area">
      <div className="course-header">
        <h2 style={{ color: 'var(--accent-color)' }}>📝 {quiz.title}</h2>
      </div>

      <form onSubmit={handleSubmit} className="quiz-form">
        {quiz.questions.map((q, index) => {
          const isCorrect = submitted && answers[q.id] === q.correct_answer;
          const isWrong = submitted && answers[q.id] !== q.correct_answer && answers[q.id];
          
          return (
            <div key={q.id} className="quiz-question-card" style={{ 
              marginBottom: '2rem', 
              padding: '1.5rem', 
              background: 'var(--bg-primary)', 
              borderRadius: '10px',
              border: isCorrect ? '1px solid var(--success-color)' : isWrong ? '1px solid var(--error-color)' : '1px solid var(--border-color)'
            }}>
              <h4 style={{ marginBottom: '1rem' }}>{index + 1}. {q.question_text}</h4>
              
              <div className="quiz-options" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name={`question-${q.id}`} 
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleOptionChange(q.id, opt)}
                      disabled={submitted}
                    />
                    <span style={{ 
                      color: submitted && opt === q.correct_answer ? 'var(--success-color)' : 'inherit',
                      fontWeight: submitted && opt === q.correct_answer ? 'bold' : 'normal'
                    }}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
              
              {submitted && isWrong && (
                <p style={{ color: 'var(--error-color)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Your answer: {answers[q.id]} (Incorrect)
                </p>
              )}
            </div>
          );
        })}

        {!submitted ? (
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Submit Test
          </button>
        ) : (
          <div className="quiz-results" style={{ textAlign: 'center', marginTop: '2rem', padding: '2rem', background: 'var(--bg-card)', borderRadius: '10px' }}>
            <h3>Result: {score} / {quiz.questions.length}</h3>
            <p>{score / quiz.questions.length >= 0.7 ? "🎉 Great job! You passed." : "📚 Keep studying and try again!"}</p>
          </div>
        )}
      </form>
    </div>
  );
}

export default StudentQuizView;