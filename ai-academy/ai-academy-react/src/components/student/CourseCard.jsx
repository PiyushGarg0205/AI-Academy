// src/components/student/CourseCard.jsx
import React from 'react';

function CourseCard({ course, onViewCourse }) {
  return (
    <div className="course-card" onClick={() => onViewCourse(course.id)}>
      <h3>{course.title}</h3>
      <p>{course.description || 'A new course awaits.'}</p>
      <div className="course-meta">
        <span><i className="fas fa-layer-group"></i> {course.modules.length} Modules</span>
        <span><i className="fas fa-user"></i> {course.creator_username || 'Admin'}</span>
      </div>
    </div>
  );
}

export default CourseCard;