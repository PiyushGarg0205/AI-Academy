// src/services/api.jsx
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Helper function to handle fetch requests
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || errorData.error || response.statusText || 'An API error occurred';
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

// =====================================================================
//  AUTH
// =====================================================================
export const loginUser = (username, password) => {
  return apiFetch('/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

export const registerUser = (username, email, password) => {
  return apiFetch('/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
};

// =====================================================================
//  COURSES
// =====================================================================
export const getCourses = () => apiFetch('/courses/');
export const getCourseById = (id) => apiFetch(`/courses/${id}/`);

export const publishCourse = (id) => {
  return apiFetch(`/courses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'PUBLISHED' }),
  });
};

export const deleteCourse = (id) => {
  return apiFetch(`/courses/${id}/`, { method: 'DELETE' });
};

// =====================================================================
//  ADMIN GENERATION
// =====================================================================
export const generateCourse = (prompt, num_content_modules, num_lessons_per_module, num_test_modules) => {
  return apiFetch('/courses/generate/', {
    method: 'POST',
    body: JSON.stringify({ 
      prompt, 
      num_content_modules,
      num_lessons_per_module,
      num_test_modules
    }),
  });
};

// 👇 --- UPDATED TO SUPPORT MODULE TYPE --- 👇
export const generateModuleForCourse = (courseId, prompt, moduleType = 'CONTENT') => {
  return apiFetch(`/courses/${courseId}/generate-module/`, {
    method: 'POST',
    body: JSON.stringify({ 
      prompt, 
      module_type: moduleType 
    }),
  });
};
// --------------------------------------------

// =====================================================================
//  NEW EDITING FUNCTIONS
// =====================================================================

// --- Module Functions ---
export const createModule = (courseId, title, order, module_type) => {
  return apiFetch('/modules/', {
    method: 'POST',
    body: JSON.stringify({ course: courseId, title, order, module_type }),
  });
};

export const updateModule = (moduleId, moduleData) => {
  return apiFetch(`/modules/${moduleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(moduleData),
  });
};

export const deleteModule = (moduleId) => {
  return apiFetch(`/modules/${moduleId}/`, { method: 'DELETE' });
};

// --- Lesson Functions ---
export const createLesson = (moduleId, title, order) => {
  return apiFetch('/lessons/', {
    method: 'POST',
    body: JSON.stringify({ 
      module: moduleId, 
      title, 
      order, 
      content: '<p>Start writing your lesson content here...</p>' 
    }),
  });
}; 

export const updateLesson = (lessonId, lessonData) => {
  return apiFetch(`/lessons/${lessonId}/`, {
    method: 'PATCH',
    body: JSON.stringify(lessonData),
  });
};

export const deleteLesson = (lessonId) => {
  return apiFetch(`/lessons/${lessonId}/`, { method: 'DELETE' });
};

// --- Quiz Functions ---
export const createQuiz = (moduleId, title) => {
  return apiFetch('/quizzes/', { 
    method: 'POST',
    body: JSON.stringify({ module: moduleId, title }),
  });
};

export const updateQuiz = (quizId, quizData) => {
  return apiFetch(`/quizzes/${quizId}/`, { 
    method: 'PATCH',
    body: JSON.stringify(quizData),
  });
};

// --- Question Functions ---
export const createQuestion = (quizId, question_text, order, options, correct_answer) => {
  return apiFetch('/questions/', { 
    method: 'POST',
    body: JSON.stringify({ 
      quiz: quizId, 
      question_text, 
      order, 
      options, 
      correct_answer 
    }),
  });
};

export const updateQuestion = (questionId, questionData) => {
  return apiFetch(`/questions/${questionId}/`, { 
    method: 'PATCH',
    body: JSON.stringify(questionData),
  });
};

export const deleteQuestion = (questionId) => {
  return apiFetch(`/questions/${questionId}/`, { method: 'DELETE' });
};