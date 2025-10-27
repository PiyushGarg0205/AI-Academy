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
});


// =====================================================================
//  LOGIN PAGE LOGIC (`login.html`)
// =====================================================================
function setupLoginPage() {
    const loginForm = document.getElementById('login-form');
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

            // Decode the token to get the user's role
            const payload = JSON.parse(atob(data.access.split('.')[1]));

            // Redirect based on the user's role
            if (payload.role === 'ADMIN') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'student-dashboard.html';
            }

        } catch (error) {
            errorMessage.textContent = error.message;
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

    // Fetches and displays all courses (drafts and published)
    async function loadCourses() {
        try {
            const response = await fetch(`${API_BASE_URL}/courses/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const courses = await response.json();
            
            courseListDiv.innerHTML = '';
            courses.forEach(course => {
                const courseEl = document.createElement('div');
                courseEl.className = 'course-item';
                courseEl.innerHTML = `
                    <h3>${course.title}</h3>
                    <p>Status: <strong class="${course.status.toLowerCase()}">${course.status}</strong></p>
                    <button onclick="publishCourse(${course.id})" ${course.status === 'PUBLISHED' ? 'disabled' : ''}>Publish</button>
                    <button onclick="editCourse(${course.id})">Edit</button>
                `;
                courseListDiv.appendChild(courseEl);
            });
        } catch (error) {
            courseListDiv.innerHTML = `<p class="error">Failed to load courses. Please try again.</p>`;
        }
    }

    // Publishes a course by sending a PATCH request
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
        loadCourses(); // Refresh the list
    }
    
    // Placeholder for future edit functionality
    window.editCourse = function(courseId) {
        alert(`Edit functionality for course ID ${courseId} is the next major feature to build.`);
        // window.location.href = `edit-course.html?id=${courseId}`;
    }

    // Handles the course generation form submission
    generateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        generateStatus.textContent = '🤖 Generating course... This may take a minute.';
        generateStatus.className = 'status-message';
        
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
            generateStatus.className = 'status-message success';
            generateForm.reset();
            loadCourses();
        } catch (error) {
            generateStatus.textContent = `❌ Error: ${error.message}`;
            generateStatus.className = 'status-message error';
        }
    });

    loadCourses(); // Initial load of courses
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

    const publishedCoursesDiv = document.getElementById('published-courses');
    const courseViewerDiv = document.getElementById('course-viewer');

    // Fetches all courses and filters for only PUBLISHED ones
    async function loadPublishedCourses() {
        const response = await fetch(`${API_BASE_URL}/courses/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allCourses = await response.json();
        const published = allCourses.filter(c => c.status === 'PUBLISHED');

        publishedCoursesDiv.innerHTML = '<h2>Click a course to begin:</h2>';
        if (published.length === 0) {
            publishedCoursesDiv.innerHTML += '<p>No courses are available yet. Check back later!</p>';
            return;
        }

        published.forEach(course => {
            const courseBtn = document.createElement('button');
            courseBtn.textContent = course.title;
            courseBtn.onclick = () => viewCourse(course.id);
            publishedCoursesDiv.appendChild(courseBtn);
        });
    }

    // Fetches and displays the content of a single selected course
    window.viewCourse = async function(courseId) {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const course = await response.json();

        let html = `<h1>${course.title}</h1>`;
        
        // **ROBUSTNESS FIX:** Use (course.modules || []) to prevent errors if modules are missing.
        (course.modules || []).forEach(module => {
            html += `<h2 class="module-title">${module.title}</h2>`;
            
            // **ROBUSTNESS FIX:** Use (module.videos || []) to prevent errors if videos are missing.
            (module.videos || []).forEach(video => {
                const videoId = video.url.split('v=')[1];
                html += `
                    <div class="video-item">
                        <h3>${video.title}</h3>
                        <div class="video-container">
                           <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                        </div>
                        <h4>Quiz for this video:</h4>
                        <form class="quiz-form">
                            ${(video.mcqs || []).map((mcq, i) => `
                                <fieldset>
                                    <legend>${i + 1}. ${mcq.question}</legend>
                                    ${(mcq.options || []).map(opt => `
                                        <div>
                                            <input type="radio" id="mcq-${mcq.id}-${opt}" name="mcq-${mcq.id}" value="${opt}">
                                            <label for="mcq-${mcq.id}-${opt}">${opt}</label>
                                        </div>
                                    `).join('')}
                                </fieldset>
                            `).join('')}
                        </form>
                    </div>
                `;
            });
        });
        courseViewerDiv.innerHTML = html;
    }

    loadPublishedCourses(); // Initial load of courses
}
// Keep this code for smooth scrolling on the landing page
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 70, // Adjust navbar height if needed
        behavior: "smooth",
      });
    }
  });
});

// The modal functions are no longer needed and can be deleted.
// Add this function to your app.js file

function toggleMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    mobileMenuBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
}
// Add this function to your app.js file
function toggleTheme() {
    const doc = document.documentElement;
    const currentTheme = doc.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    doc.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme); // Save the choice
}
// Add this code to run when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
    document.documentElement.setAttribute('data-theme', savedTheme);
});