import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getReviews, createReview, getCourseById } from '../services/api.jsx';
import { useAuth } from '../services/AuthContext.jsx';

function ReviewsPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');
  const navigate = useNavigate();
  const { auth } = useAuth();

  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      try {
        const [courseData, reviewsData] = await Promise.all([
          getCourseById(courseId),
          getReviews(courseId)
        ]);
        setCourse(courseData);
        setReviews(reviewsData);
      } catch (error) {
        console.error("Failed to load reviews", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview(courseId, rating, comment);
      // Reload reviews to show the new one immediately
      const updatedReviews = await getReviews(courseId);
      setReviews(updatedReviews);
      
      // Reset form
      setComment(''); 
      setRating(5);
    } catch (error) {
      alert("Failed to submit review. You may have already reviewed this course.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Average for the Summary Header
  const calculateAverage = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  };
  
  const avgRating = calculateAverage();

  if (loading) return <div className="container" style={{paddingTop: '120px'}}><p>Loading reviews...</p></div>;

  return (
    <div className="dashboard-main container">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{marginBottom: '2rem'}}>
        &larr; Back to Course
      </button>

      <div className="admin-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* --- HEADER & SUMMARY SECTION --- */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <h2>Reviews for: <span style={{color: 'var(--text-secondary)'}}>{course?.title}</span></h2>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2rem', 
            marginTop: '1.5rem',
            background: 'var(--bg-secondary)', 
            padding: '1.5rem',
            borderRadius: '12px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {reviews.length > 0 ? avgRating : '-'}
              </div>
              <div style={{ color: '#fbbf24', fontSize: '1.2rem' }}>
                {'★'.repeat(Math.round(Number(avgRating)))}
                <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - Math.round(Number(avgRating)))}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Course Rating
              </div>
            </div>

            <div style={{ height: '50px', borderLeft: '1px solid var(--border-color)' }}></div>

            <div>
              <h4 style={{ margin: 0 }}>{reviews.length} Ratings</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {reviews.length > 0 
                  ? "See what students are saying." 
                  : "No reviews yet. Be the first!"}
              </p>
            </div>
          </div>
        </div>

        {/* --- REVIEW FORM --- */}
        <div style={{ marginBottom: '3rem', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{marginBottom: '1rem'}}>Leave a Review</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Rating</label>
              <div className="star-rating" style={{ fontSize: '1.5rem', cursor: 'pointer', color: '#fbbf24' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} onClick={() => setRating(star)}>
                    {star <= rating ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Comment</label>
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Share your experience..."
                required
                rows="3"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        </div>

        {/* --- REVIEW LIST --- */}
        <h3>Student Feedback</h3>
        <div className="review-list" style={{ marginTop: '1rem' }}>
          {reviews.length === 0 && <p className="text-muted">No reviews yet.</p>}
          
          {reviews.map((review) => (
            <div key={review.id} style={{ 
              padding: '1rem', 
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '1rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{review.username}</span>
                <span style={{ color: '#fbbf24' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{review.comment}</p>
              <small style={{ color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReviewsPage;