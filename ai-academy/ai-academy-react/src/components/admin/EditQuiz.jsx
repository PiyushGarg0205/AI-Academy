// src/components/admin/EditQuiz.jsx
import React, { useState, useEffect } from 'react';
import { createQuiz, createQuestion } from '../../services/api';
import EditQuestion from './EditQuestion.jsx';

function EditQuiz({ quiz, moduleId, onUpdate }) {
  const [quizTitle, setQuizTitle] = useState('');

  useEffect(() => {
    // If a quiz exists, set its title.
    if (quiz) {
      setQuizTitle(quiz.title);
    } else {
      // If no quiz exists, set a default title.
      setQuizTitle("New Module Quiz");
    }
  }, [quiz]);

  // This handles the case where the module is new and has no quiz object yet
  const handleCreateQuiz = async () => {
    try {
      await createQuiz(moduleId, quizTitle || "New Quiz");
      onUpdate(); // Reload the course to get the new quiz object
    } catch (err) {
      alert(`Error creating quiz: ${err.message}`);
    }
  };

  const handleAddNewQuestion = async () => {
    if (!quiz) {
      alert("Please create the quiz first.");
      return;
    }
    try {
      const newOrder = (quiz.questions?.length || 0) + 1;
      await createQuestion(
        quiz.id, 
        "New question text...", 
        newOrder, 
        ["Option A", "Option B"], 
        "Option A"
      );
      onUpdate(); // Reload course
    } catch (err) {
      alert(`Error adding new question: ${err.message}`);
    }
  };

  // If the module was just created, it might not have a quiz object.
  // Show a button to create one.
  if (!quiz) {
    return (
      <div className="edit-quiz-container">
        <p>This assessment module doesn't have a quiz yet.</p>
        <button onClick={handleCreateQuiz} className="btn btn-primary">
          Create Quiz
        </button>
      </div>
    );
  }

  // If the quiz exists, show the question editor
  return (
    <div className="edit-quiz-container">
      <h3>Quiz Questions</h3>
      {quiz.questions.length > 0 ? (
        quiz.questions.map(question => (
          <EditQuestion 
            key={question.id} 
            question={question} 
            onUpdate={onUpdate} 
          />
        ))
      ) : <p>This quiz has no questions.</p>}

      <button onClick={handleAddNewQuestion} className="btn btn-secondary" style={{marginTop: '1rem'}}>
        + Add New Question
      </button>
    </div>
  );
}

export default EditQuiz;