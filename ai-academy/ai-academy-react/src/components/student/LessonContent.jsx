// src/components/student/LessonContent.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import MCQForm from './MCQForm';

function LessonContent({ lesson, courseId }) {
  
  // Use dangerouslySetInnerHTML to render HTML content from the API
  // WARNING: Only do this if you TRUST the source of your API content
  // to prevent XSS attacks.
  const createMarkup = (htmlString) => {
    return { __html: htmlString || '' };
  };

  return (
    <div id="lesson-viewer-content">
      <div className="course-header">
        <h2 id="lesson-title">{lesson.title}</h2>
        <div className="course-actions">
          <Link
            id="reviews-link"
            to={`/reviews?course_id=${courseId}`}
            className="btn btn-secondary"
          >
            <i className="fas fa-star"></i> See Reviews
          </Link>
        </div>
      </div>
      
      {lesson.video_id && (
        <div id="video-container" style={{ display: 'block' }}>
          <iframe
            src={`https://www.youtube.com/embed/${lesson.video_id}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lesson.title}
          ></iframe>
        </div>
      )}
      
      <div
        id="text-content"
        dangerouslySetInnerHTML={createMarkup(lesson.content)}
      />
      
      {lesson.mcq_question && (
        <MCQForm
          key={lesson.id} // Add key to force re-mount and reset state on lesson change
          question={lesson.mcq_question}
          options={lesson.mcq_options}
          correctAnswer={lesson.mcq_correct_answer}
        />
      )}
    </div>
  );
}

export default LessonContent;