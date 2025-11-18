// src/components/student/CourseSidebar.jsx
import React, { useState } from 'react';

function Module({ module, currentItem, onSelectItem, allItems }) {
  const [isOpen, setIsOpen] = useState(true);

  // Determine if this module contains the currently viewed item
  const isActiveModule = currentItem.moduleId === module.id;

  return (
    <div className={`module ${isOpen ? 'active' : ''}`} style={{ marginBottom: '0.5rem' }}>
      <div 
        className="module-header" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '0.75rem', 
          background: isActiveModule ? 'rgba(255,255,255,0.05)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '8px',
          fontWeight: '600'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {module.module_type === 'ASSESSMENT' ? '📝' : '📚'} {module.title}
        </span>
        <i className={`fas fa-chevron-down ${isOpen ? 'expanded' : ''}`} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
      </div>

      {isOpen && (
        <ul className="lesson-list" style={{ listStyle: 'none', paddingLeft: '1rem', marginTop: '0.5rem' }}>
          {module.module_type === 'CONTENT' && module.lessons?.map(lesson => {
            // Find the global index of this lesson in the flattened list
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
                    fontSize: '0.9rem'
                  }}
                >
                  <i className="fas fa-play-circle" style={{ marginRight: '8px', fontSize: '0.8em', opacity: 0.7 }}></i>
                  {lesson.title}
                </a>
              </li>
            );
          })}

          {module.module_type === 'ASSESSMENT' && module.quiz && (() => {
             // Logic for Quiz Item
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
                      fontWeight: '500'
                    }}
                 >
                   <i className="fas fa-clipboard-check" style={{ marginRight: '8px', fontSize: '0.8em', opacity: 0.7 }}></i>
                   Take Quiz
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
  return (
    <div className="course-sidebar-inner">
      <h3 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Course Content</h3>
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