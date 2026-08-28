// src/components/admin/CourseListItem.jsx
import React from 'react';

function CourseListItem({ course, onPublish, onDelete }) {
  // Calculate lesson count
  const lessonCount = course.modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0);

  return (
    <div className="course-list-item">
      <div className="course-info">
        <p className="course-title">{course.title}</p>
        <p className="course-details">
          {course.modules?.length || 0} Modules, {lessonCount} Lessons
        </p>
        <p className="course-details">
          Status: <strong className={course.status.toLowerCase()}>{course.status}</strong>
        </p>
      </div>
      <div className="course-actions">
        <button
          className="btn btn-secondary"
          onClick={() => onPublish(course.id)}
          disabled={course.status === 'PUBLISHED'}
        >
          Publish
        </button>
        <button
          className="btn btn-secondary"
          style={{ color: '#f87171' }}
          onClick={() => onDelete(course.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default CourseListItem;