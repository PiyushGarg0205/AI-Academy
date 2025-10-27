// =====================================================================
//  MAIN ROUTER & CONFIGURATION
// =====================================================================

// Base URL for your Django API
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// This function runs when the page is loaded and calls the correct setup function.
document.addEventListener('DOMContentLoaded', () => {
    const pageTitle = document.title;
    if (pageTitle.includes('Login')) {
        setupLoginPage();
    } else if (pageTitle.includes('Admin Dashboard')) {
        setupAdminDashboard();
    } else if (pageTitle.includes('Student Dashboard')) {
        setupStudentDashboard();
    }

    // Attach global event listeners
    const themeToggler = document.querySelector('.toggle-switch');
    if (themeToggler) themeToggler.addEventListener('click', toggleTheme);

    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);

    // Set theme on initial load
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
});


// =====================================================================
//  LOGIN PAGE LOGIC (`login.html`)
// =====================================================================
function setupLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = '';

        try {
            const response = await fetch(`${API_BASE_URL}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error('Invalid username or password.');

            const data = await response.json();
            localStorage.setItem('accessToken', data.access);

            // Decode token to get user's role (requires backend customization)
            const payload = JSON.parse(atob(data.access.split('.')[1]));

            if (payload.role === 'ADMIN') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'student-dashboard.html';
            }

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}


// =====================================================================
//  ADMIN DASHBOARD LOGIC (`admin-dashboard.html`)
// =====================================================================
async function setupAdminDashboard() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const courseListDiv = document.getElementById('course-list');
    const generateForm = document.getElementById('generate-form');
    const generateStatus = document.getElementById('generate-status');

    async function loadCourses() {
        try {
            const response = await fetch(`${API_BASE_URL}/courses/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const courses = await response.json();
            
            courseListDiv.innerHTML = '';
            courses.forEach(course => {
                const courseEl = document.createElement('div');
                courseEl.className = 'course-item'; // Use a class for styling
                courseEl.innerHTML = `
                    <div class="course-info">
                        <p class="course-title">${course.title}</p>
                        <p class="course-details">Status: <strong class="${course.status.toLowerCase()}">${course.status}</strong></p>
                    </div>
                    <div class="course-actions">
                        <button onclick="publishCourse(${course.id})" ${course.status === 'PUBLISHED' ? 'disabled' : ''}>Publish</button>
                        <button onclick="editCourse(${course.id})">Edit</button>
                    </div>
                `;
                courseListDiv.appendChild(courseEl);
            });
        } catch (error) {
            courseListDiv.innerHTML = `<p class="error">Failed to load courses.</p>`;
        }
    }

    window.publishCourse = async function(courseId) {
        if (!confirm('Are you sure you want to publish this course?')) return;
        
        await fetch(`${API_BASE_URL}/courses/${courseId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'PUBLISHED' })
        });
        loadCourses();
    }
    
    window.editCourse = function(courseId) {
        alert(`Edit functionality for course ID ${courseId} will be implemented later.`);
    }

    generateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        generateStatus.textContent = '🤖 Generating course... This may take a minute.';
        
        const prompt = document.getElementById('prompt').value;
        const num_modules = document.getElementById('num_modules').value;

        try {
            const response = await fetch(`${API_BASE_URL}/courses/generate/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ prompt, num_modules })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate course.');
            }

            generateStatus.textContent = '✅ Course generated successfully!';
            generateForm.reset();
            loadCourses();
        } catch (error) {
            generateStatus.textContent = `❌ Error: ${error.message}`;
        }
    });

    loadCourses();
}


// =====================================================================
//  STUDENT DASHBOARD LOGIC (`student-dashboard.html`)
// =====================================================================
function setupStudentDashboard() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const courseListView = document.getElementById('course-list-view');
    const courseViewer = document.getElementById('course-viewer');
    
    let allLessons = [];
    let currentLessonIndex = -1;

    async function loadPublishedCourses() {
        try {
            const response = await fetch(`${API_BASE_URL}/courses/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch courses.');
            
            const courses = await response.json();
            const published = courses.filter(c => c.status === 'PUBLISHED');

            const courseListContainer = document.getElementById('published-courses');
            courseListContainer.innerHTML = '';

            if (published.length === 0) {
                courseListContainer.innerHTML = '<p>No courses are available yet.</p>';
                return;
            }

            published.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.className = 'course-card';
                courseCard.onclick = () => viewCourse(course.id);
                courseCard.innerHTML = `
                    <h3>${course.title}</h3>
                    <p>${course.description || 'A new course awaits.'}</p>
                    <div class="course-meta">
                        <span><i class="fas fa-layer-group"></i> ${course.modules.length} Modules</span>
                        <span><i class="fas fa-user"></i> ${course.creator_username || 'Admin'}</span>
                    </div>
                `;
                courseListContainer.appendChild(courseCard);
            });
        } catch (error) {
            document.getElementById('published-courses').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    async function viewCourse(courseId) {
        try {
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not load the selected course.');
            const course = await response.json();

            courseListView.style.display = 'none';
            courseViewer.style.display = 'grid';

            renderCourseViewer(course);
        } catch (error) {
            alert(`Error loading course: ${error.message}`);
        }
    }

    function renderCourseViewer(course) {
        document.getElementById('course-title-sidebar').textContent = course.title;
        const moduleList = document.getElementById('module-list');
        moduleList.innerHTML = '';
        allLessons = [];

        (course.modules || []).forEach(module => {
            const moduleEl = document.createElement('div');
            moduleEl.className = 'module';
            let lessonsHtml = '';
            (module.lessons || []).forEach(lesson => {
                const lessonIndex = allLessons.length;
                allLessons.push(lesson);
                lessonsHtml += `
                    <li class="lesson-list-item" id="sidebar-lesson-${lessonIndex}">
                        <a href="#" onclick="event.preventDefault(); renderLesson(${lessonIndex})">${lesson.title}</a>
                    </li>
                `;
            });
            moduleEl.innerHTML = `
                <div class="module-header">${module.title} <i class="fas fa-chevron-down"></i></div>
                <ul class="lesson-list">${lessonsHtml}</ul>
            `;
            moduleList.appendChild(moduleEl);
            moduleEl.querySelector('.module-header').onclick = () => moduleEl.classList.toggle('active');
        });

        if (allLessons.length > 0) {
            renderLesson(0);
        } else {
             document.getElementById('lesson-viewer-content').innerHTML = '<h2>This course has no lessons.</h2>';
        }
    }

    function renderLesson(lessonIndex) {
        currentLessonIndex = lessonIndex;
        const lesson = allLessons[lessonIndex];
        
        document.getElementById('lesson-title').textContent = lesson.title;
        
        const videoContainer = document.getElementById('video-container');
        if (lesson.video_id) {
            videoContainer.style.display = 'block';
            videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${lesson.video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else {
            videoContainer.style.display = 'none';
        }

        document.getElementById('text-content').innerHTML = lesson.content || '';

        const mcqContainer = document.getElementById('mcq-container');
        if (lesson.mcq_question && lesson.mcq_options) {
            mcqContainer.style.display = 'block';
            document.getElementById('mcq-question').textContent = lesson.mcq_question;
            document.getElementById('mcq-options').innerHTML = (lesson.mcq_options || []).map((opt, i) => `
                <div class="mcq-option">
                    <input type="radio" id="opt-${i}" name="mcq" value="${opt}" required>
                    <label for="opt-${i}">${opt}</label>
                </div>
            `).join('');
            
            document.getElementById('mcq-form').reset();
            document.getElementById('mcq-feedback').style.display = 'none';
            document.querySelector('#mcq-form button').disabled = false;

        } else {
            mcqContainer.style.display = 'none';
        }

        document.querySelectorAll('.lesson-list-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`sidebar-lesson-${lessonIndex}`).classList.add('active');

        document.getElementById('prev-lesson-btn').disabled = (lessonIndex === 0);
        document.getElementById('next-lesson-btn').disabled = (lessonIndex === allLessons.length - 1);
    }
    
    document.getElementById('next-lesson-btn').onclick = () => {
        if (currentLessonIndex < allLessons.length - 1) renderLesson(currentLessonIndex + 1);
    };
    document.getElementById('prev-lesson-btn').onclick = () => {
        if (currentLessonIndex > 0) renderLesson(currentLessonIndex - 1);
    };

    document.getElementById('mcq-form').addEventListener('submit', (event) => {
        event.preventDefault(); 
        const feedbackEl = document.getElementById('mcq-feedback');
        const selectedOption = document.querySelector('input[name="mcq"]:checked');

        if (!selectedOption) {
            alert('Please select an answer!');
            return;
        }

        const userAnswer = selectedOption.value;
        const correctAnswer = allLessons[currentLessonIndex].mcq_correct_answer;

        feedbackEl.style.display = 'block';

        if (userAnswer === correctAnswer) {
            feedbackEl.textContent = '✅ Correct! Well done.';
            feedbackEl.className = 'correct';
        } else {
            feedbackEl.textContent = `❌ Not quite. The correct answer is: "${correctAnswer}"`;
            feedbackEl.className = 'incorrect';
        }

        event.target.querySelector('button').disabled = true;
    });
    
    loadPublishedCourses();
}


// =====================================================================
//  GLOBAL HELPER FUNCTIONS
// =====================================================================

function toggleMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    mobileMenuBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
}

function toggleTheme() {
    const doc = document.documentElement;
    const newTheme = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}