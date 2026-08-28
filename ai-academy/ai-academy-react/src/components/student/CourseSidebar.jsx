// src/components/student/CourseSidebar.jsx
import React, { useState } from 'react';

function Module({ module, currentItem, onSelectItem, allItems }) {
  const [isOpen, setIsOpen] = useState(!module.is_locked); // Auto-close locked modules

  // Determine if this module contains the currently viewed item
  const isActiveModule = currentItem.moduleId === module.id;

  // Visual styles for locked state
  const containerStyle = {
    marginBottom: '0.5rem',
    opacity: module.is_locked ? 0.5 : 1,
    pointerEvents: module.is_locked ? 'none' : 'auto', // Disable clicks if locked
    userSelect: module.is_locked ? 'none' : 'auto'
  };

  return (
    <div className={`module ${isOpen ? 'active' : ''}`} style={containerStyle}>
      <div 
        className="module-header" 
        onClick={() => !module.is_locked && setIsOpen(!isOpen)}
        style={{ 
          padding: '0.75rem', 
          background: isActiveModule ? 'rgba(255,255,255,0.05)' : 'transparent',
          cursor: module.is_locked ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '8px',
          fontWeight: '600',
          border: isActiveModule ? '1px solid var(--border-color)' : '1px solid transparent'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Status Icon */}
          {module.is_locked ? (
            <i className="fas fa-lock" style={{ color: '#9ca3af' }} title="Locked"></i>
          ) : module.is_completed ? (
            <i className="fas fa-check-circle" style={{ color: '#10b981' }} title="Completed"></i>
          ) : (
            <i className="fas fa-book-open" style={{ color: 'var(--accent-color)' }}></i>
          )}

          {/* Title */}
          <span>{module.title}</span>
        </span>
        
        {/* Chevron (Hide if locked) */}
        {!module.is_locked && (
          <i className={`fas fa-chevron-down`} style={{ 
            transition: 'transform 0.2s', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: '0.8rem',
            opacity: 0.7
          }}></i>
        )}
      </div>

      {/* Content List - Only show if Open and Not Locked */}
      {isOpen && !module.is_locked && (
        <ul className="lesson-list" style={{ listStyle: 'none', paddingLeft: '1rem', marginTop: '0.5rem' }}>
          
          {/* RENDER LESSONS (For Content Modules) */}
          {module.module_type === 'CONTENT' && module.lessons?.map(lesson => {
            const globalIndex = allItems.findIndex(item => item.type === 'lesson' && item.data.id === lesson.id);
            const isActive = currentItem.type === 'lesson' && currentItem.data.id === lesson.id;
            
            return (
              <li key={lesson.id} style={{ marginBottom: '0.25rem' }}>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); onSelectItem(globalIndex); }}
                  style={{ 
                    display: 'block', 
                    padding: '0.5rem', 
                    borderRadius: '6px',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-gradient)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <i className={`fas fa-${lesson.video_id ? 'play-circle' : 'file-alt'}`} 
                     style={{ marginRight: '8px', fontSize: '0.8em', opacity: isActive ? 1 : 0.7 }}>
                  </i>
                  {lesson.title}
                </a>
              </li>
            );
          })}

          {/* RENDER QUIZ LINK (For Assessment Modules) */}
          {module.module_type === 'ASSESSMENT' && module.quiz && (() => {
             const globalIndex = allItems.findIndex(item => item.type === 'quiz' && item.data.id === module.quiz.id);
             const isActive = currentItem.type === 'quiz' && currentItem.data.id === module.quiz.id;
             
             return (
               <li key={module.quiz.id}>
                 <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); onSelectItem(globalIndex); }}
                    style={{ 
                      display: 'block', 
                      padding: '0.5rem', 
                      borderRadius: '6px',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      background: isActive ? 'var(--accent-gradient)' : 'transparent',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                 >
                   <i className="fas fa-clipboard-check" 
                      style={{ marginRight: '8px', fontSize: '0.8em', opacity: isActive ? 1 : 0.7 }}>
                   </i>
                   {module.quiz.title || "Module Assessment"}
                 </a>
               </li>
             );
          })()}
        </ul>
      )}
    </div>
  );
}

function CourseSidebar({ course, currentItem, onSelectItem, allItems }) {
  if (!course) return null;
  
  return (
    <div className="course-sidebar-inner">
      <h3 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
        {course.title}
      </h3>
      <div id="module-list">
        {course.modules.map(module => (
          <Module
            key={module.id}
            module={module}
            currentItem={currentItem}
            onSelectItem={onSelectItem}
            allItems={allItems}
          />
        ))}
      </div>
    </div>
  );
}

export default CourseSidebar;