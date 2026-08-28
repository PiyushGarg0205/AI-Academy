import React from 'react';

function CourseCard({ course, onViewCourse }) {
  
  // Helper to determine the rating value
  const getAverageRating = () => {
    // 1. If backend provides the average directly (Preferred)
    if (course.average_rating !== undefined && course.average_rating !== null) {
      return parseFloat(course.average_rating);
    }

    // 2. If backend provides an array of reviews, calculate it here
    if (course.reviews && course.reviews.length > 0) {
      const total = course.reviews.reduce((acc, review) => acc + review.rating, 0);
      return total / course.reviews.length;
    }

    return 0;
  };

  const rating = getAverageRating();
  const hasRating = rating > 0;

  return (
    <div className="course-card" onClick={() => onViewCourse(course.id)}>
      <h3>{course.title}</h3>
      <p>{course.description || 'A new course awaits.'}</p>
      
      <div className="course-meta">
        <span>
          <i className="fas fa-layer-group"></i> {course.modules ? course.modules.length : 0} Modules
        </span>
        
        {/* Rating Badge */}
        <span>
          <i 
            className="fas fa-star" 
            style={{ color: hasRating ? '#fbbf24' : '#cbd5e1' }} // Gold if rated, gray if not
          ></i> 
          {' '}
          {hasRating ? rating.toFixed(1) : 'No ratings'}
        </span>
      </div>

      <div className="course-meta" style={{ marginTop: '0.5rem', fontSize: '0.85em', color: '#666' }}>
        <span><i className="fas fa-user"></i> {course.creator_username || 'Admin'}</span>
      </div>
    </div>
  );
}

export default CourseCard;