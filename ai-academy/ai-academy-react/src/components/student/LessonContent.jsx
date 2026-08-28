import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MCQForm from './MCQForm';

function LessonContent({ lesson, courseId, onNextLesson, isLastLesson }) {
  const [activeStep, setActiveStep] = useState(0);

  // --- Speech-to-Text State ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState(""); 
  const [isUploading, setIsUploading] = useState(false);
  const [aiResult, setAiResult] = useState(null); 
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Keep listening
        recognitionRef.current.interimResults = true; // Show results while speaking
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            // Append final results to state
            if (finalTranscript) {
                setTranscriptText(prev => prev + " " + finalTranscript);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };
    }

    // Reset state on lesson change
    if (lesson.video_id) {
      setActiveStep(0);
    } else {
      setActiveStep(1);
    }
    setAiResult(null);
    setTranscriptText("");
    setIsRecording(false);
    window.scrollTo(0, 0);
  }, [lesson]);

  const createMarkup = (htmlString) => {
    return { __html: htmlString || '' };
  };

  // --- Handlers ---

  const startRecording = () => {
    if (recognitionRef.current) {
        setTranscriptText(""); // Clear previous attempt
        setAiResult(null);
        try {
            recognitionRef.current.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Mic start error", e);
        }
    } else {
        alert("Your browser does not support Speech-to-Text. Please use Chrome, Edge, or Safari.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }
  };

  const submitExplanation = async () => {
    if (!transcriptText.trim()) {
        alert("Please record or type an answer first.");
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("You are not logged in. Please log in again.");
      return;
    }

    setIsUploading(true);

    try {
      // 2. Send TEXT (JSON) instead of Audio (FormData)
      const response = await fetch(`http://127.0.0.1:8000/api/lessons/${lesson.id}/explain/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ transcript: transcriptText })
      });

      if (response.status === 429) {
          alert("❄️ AI is cooling down. Please wait 30 seconds.");
          setIsUploading(false);
          return;
      }
      
      if (response.status === 401) {
        alert("Session expired. Please log in again.");
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        setAiResult(data.data);
        // If passed, you might want to refresh course progress here
      } else {
        alert(data.error || "Submission failed");
      }
    } catch (error) {
      console.error("API error:", error);
      alert("Error connecting to server.");
    } finally {
      setIsUploading(false);
    }
  };

  // --------------------------------

  const totalSteps = lesson.video_id ? 2 : 1; 
  const progressPercent = ((activeStep + 1) / totalSteps) * 100;

  return (
    <div id="lesson-viewer-content" style={styles.container}>
      
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h2 style={styles.lessonTitle}>{lesson.title}</h2>
          
          <Link
            to={`/reviews?course_id=${courseId}`}
            className="btn btn-sm btn-outline-secondary"
            style={styles.reviewBtn}
          >
            <i className="fas fa-star" style={{ color: '#fbbf24' }}></i> Reviews
          </Link>
        </div>

        <div style={styles.progressContainer}>
          <div style={styles.stepLabel}>
            {activeStep === 0 && lesson.video_id ? 'Step 1: Watch' : 'Step 2: Read & Verify'}
          </div>
          <div style={styles.progressBarBg}>
            <div 
              style={{
                ...styles.progressBarFill, 
                width: `${progressPercent}%`
              }} 
            />
          </div>
        </div>
      </div>

      <div style={styles.contentBody}>
        
        {/* STEP 1: VIDEO */}
        {activeStep === 0 && lesson.video_id && (
          <div className="fade-in-up">
            <div style={styles.videoWrapper}>
              <iframe
                src={`https://www.youtube.com/embed/${lesson.video_id}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
                style={styles.iframe}
              ></iframe>
            </div>

            <div style={styles.stepFooter}>
              <p style={{color: 'var(--text-secondary)', margin: 0}}>
                <i className="fas fa-info-circle" style={{marginRight: '8px', color: 'var(--accent-color)'}}></i>
                Watch the video to grasp the core concepts.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => { setActiveStep(1); window.scrollTo(0,0); }}
                style={styles.navBtn}
              >
                Continue to Reading <i className="fas fa-arrow-right" style={{marginLeft: '8px'}}></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TEXT + AI CHALLENGE */}
        {activeStep === 1 && (
          <div className="fade-in-up">
            <div style={styles.readingContainer}>
              <div
                id="text-content"
                className="course-content-typography" 
                dangerouslySetInnerHTML={createMarkup(lesson.content)}
              />

              {/* --- AI EXPLAIN CHALLENGE SECTION --- */}
              <div style={styles.aiSection}>
                <h3 style={styles.aiHeader}>
                  <i className="fas fa-microphone-alt" style={{marginRight:'10px'}}></i>
                  Feynman Challenge
                </h3>
                <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
                  Explain the core concept of this lesson in your own words. 
                  The AI will analyze if you truly understand it. 
                </p>

                {/* CONTROLS */}
                <div style={styles.recordControls}>
                    {!isRecording && (
                        <button onClick={startRecording} className="btn btn-outline-primary" style={styles.recordBtn}>
                            <i className="fas fa-microphone" style={{color: 'red', marginRight:'8px'}}></i> 
                            {transcriptText ? "Resume Recording" : "Start Speaking"}
                        </button>
                    )}

                    {isRecording && (
                        <button onClick={stopRecording} className="btn btn-danger" style={styles.recordBtn}>
                            <i className="fas fa-stop" style={{marginRight:'8px'}}></i> Stop
                        </button>
                    )}
                </div>

                {/* TEXT OUTPUT AREA */}
                {(isRecording || transcriptText) && (
                    <div style={{marginTop: '1rem'}}>
                        <textarea 
                            value={transcriptText}
                            onChange={(e) => setTranscriptText(e.target.value)} // Allow manual edits
                            placeholder="Your explanation will appear here..."
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '1rem',
                                fontFamily: 'inherit'
                            }}
                        />
                        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                             <button 
                                onClick={submitExplanation} 
                                className="btn btn-success"
                                disabled={isUploading || isRecording}
                            >
                                {isUploading ? 'AI is analyzing...' : 'Submit Explanation'}
                            </button>
                            <button 
                                onClick={() => { setTranscriptText(""); setAiResult(null); }} 
                                className="btn btn-link text-muted"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* AI RESULTS */}
                {aiResult && (
                    <div style={{
                        marginTop: '1.5rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: aiResult.is_passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${aiResult.is_passed ? '#10B981' : '#EF4444'}`
                    }}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'0.5rem'}}>
                            <span style={{
                                fontWeight:'bold', 
                                color: aiResult.is_passed ? '#10B981' : '#EF4444',
                                fontSize: '1.1rem'
                            }}>
                                {aiResult.is_passed ? 'PASSED' : 'TRY AGAIN'}
                            </span>
                            {aiResult.is_passed && <i className="fas fa-check-circle" style={{color:'#10B981'}}></i>}
                        </div>
                        
                        <div style={{fontSize:'0.95rem'}}>
                            <strong>AI Feedback:</strong> {aiResult.feedback}
                        </div>
                    </div>
                )}
              </div>
              {/* --------------------------------------- */}

              {/* OPTIONAL: OLD MCQ IF EXISTS */}
              {lesson.mcq_question && (
                <div style={styles.quizSection}>
                  <h3 style={styles.quizHeader}>
                    <i className="fas fa-brain" style={{marginRight:'10px', color: 'var(--accent-color)'}}></i>
                    Quick Quiz
                  </h3>
                  <MCQForm
                    key={lesson.id}
                    question={lesson.mcq_question}
                    options={lesson.mcq_options}
                    correctAnswer={lesson.mcq_correct_answer}
                  />
                </div>
              )}
            </div>

            {/* NAVIGATION FOOTER */}
            <div style={styles.navigationRow}>
              {lesson.video_id && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { setActiveStep(0); window.scrollTo(0,0); }}
                >
                  <i className="fas fa-arrow-left" style={{marginRight:'8px'}}></i> Re-watch Video
                </button>
              )}
              
              <div style={{ marginLeft: 'auto' }}>
                {!isLastLesson && (
                  <button 
                    className="btn btn-primary"
                    onClick={onNextLesson}
                    style={styles.navBtn}
                  >
                    Next Lesson <i className="fas fa-chevron-right" style={{marginLeft:'8px'}}></i>
                  </button>
                )}
                
                {isLastLesson && (
                  <span className="text-muted" style={{fontStyle:'italic', color: 'var(--text-secondary)'}}>
                    End of Module
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    width: '100%',
  },
  header: {
    paddingBottom: '1.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: '1rem',
    gap: '1rem',
  },
  lessonTitle: {
    flex: 1, 
  },
  reviewBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    flexShrink: 0, 
  },
  progressContainer: {
    marginTop: '0.5rem',
    maxWidth: '400px',
  },
  stepLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--accent-color)',
    marginBottom: '0.5rem',
  },
  progressBarBg: {
    height: '8px',
    width: '100%',
    backgroundColor: 'var(--border-color)',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--accent-color)',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  contentBody: {
    minHeight: '400px',
  },
  videoWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    background: '#000',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  stepFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2rem',
    padding: '1.5rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  readingContainer: {
    maxWidth: '850px',
    margin: '0 auto',
  },
  aiSection: {
    marginTop: '3rem',
    padding: '2rem',
    backgroundColor: '#fff', 
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  aiHeader: {
    marginBottom: '1rem',
    color: 'var(--primary-color)',
    fontSize: '1.25rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
  },
  recordControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
  },
  recordBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quizSection: {
    marginTop: '3rem',
    padding: '2rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  quizHeader: {
    marginBottom: '1.5rem', 
    borderBottom: '1px solid var(--border-color)', 
    paddingBottom: '1rem',
    color: 'var(--accent-color)',
    fontSize: '1.25rem',
    fontWeight: '700'
  },
  navigationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4rem',
    paddingTop: '2rem',
    borderTop: '1px solid var(--border-color)',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '500'
  }
};

export default LessonContent;