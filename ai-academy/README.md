````markdown
# CourseCraft 🎓

CourseCraft is a full-stack AI-powered learning platform that transforms a user's learning goal into a structured, interactive course.

Users can enter a topic, choose the number of modules, and generate a complete learning path containing **video lessons, reading material, and assessments**.

The platform uses a two-stage AI pipeline to address a common problem with LLM-generated learning resources: **incorrect, broken, or hallucinated external links**. Instead of asking Gemini to directly generate YouTube URLs, CourseCraft uses Gemini to create a rough curriculum and targeted YouTube search keywords, retrieves actual videos through the **YouTube Data API**, and then uses those results to generate the final course.

---

## 🎯 Problem Solved

LLMs can generate detailed learning plans, but they can produce incorrect or non-existent URLs when asked to directly recommend external learning resources.

A naive approach looks like this:

```text
User Learning Goal
        ↓
Gemini
        ↓
Course + YouTube URLs
        ↓
Potentially incorrect / hallucinated links
````

CourseCraft separates **curriculum generation** from **resource retrieval**:

```text
User Learning Goal
        ↓
Gemini
        ↓
Rough Course Outline
        +
YouTube Search Keywords
        ↓
YouTube Data API
        ↓
Actual YouTube Results
        ↓
Gemini
        ↓
Final Structured Course
```

This reduces the likelihood of hallucinated or broken video links while allowing Gemini to focus on curriculum planning and course generation.

---

## 🚀 Features

### ✨ AI Course Generation

Users can provide a learning topic and specify the number of modules they want.

Example:

```text
Topic:
Advanced React Patterns

Number of Modules:
3
```

CourseCraft generates a structured learning path based on the requested topic.

### 📚 Structured Learning Paths

Generated courses are organized into:

* Modules
* Video lessons
* Reading material
* Assessments
* Module progression

### ▶️ YouTube Learning Resources

Instead of relying on Gemini to invent video URLs, CourseCraft:

1. Uses Gemini to generate relevant YouTube search keywords.
2. Searches YouTube using the YouTube Data API.
3. Retrieves actual video results.
4. Incorporates those resources into the generated course.

### 📖 Reading Material

Each lesson can include reading material that explains and reinforces the concepts covered in the lesson.

### 📝 Module Assessments

Courses contain quizzes based on the material covered in the module.

Example:

```text
React useEffect & Component Composition Quiz

1. What is the primary purpose of using AbortController
   with useEffect?

○ To improve the speed of API calls

○ To prevent memory leaks by canceling
  in-flight fetch requests

○ To automatically retry failed API calls

○ To simplify the syntax of the fetch API
```

### 🔒 Assessment-Based Progression

Modules can be locked until the learner completes the required assessment.

Example:

```text
Complete this assessment to unlock the next module.

Passing score: 70%
```

This creates a sequential learning experience rather than exposing the entire course at once.

### 🗂️ Course Catalog

Users can browse available courses through the course catalog.

### 👤 My Paths

Users can access their generated learning paths and return to courses they have created.

### 🌗 Theme Support

The application supports light and dark themes.

---

# 🧠 AI Course Generation Pipeline

CourseCraft's core functionality is built around a **two-stage Gemini pipeline combined with external resource retrieval**.

```text
                         User Learning Goal
                                │
                                ▼
                     ┌────────────────────┐
                     │     Gemini API     │
                     │      Stage 1       │
                     │                    │
                     │ • Analyze topic    │
                     │ • Create rough     │
                     │   course outline   │
                     │ • Generate YouTube │
                     │   search keywords  │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │   YouTube Data     │
                     │       API          │
                     │                    │
                     │ Search using Gemini│
                     │ generated keywords │
                     └─────────┬──────────┘
                               │
                               ▼
                     Actual YouTube Results
                               │
                               ▼
                     ┌────────────────────┐
                     │     Gemini API     │
                     │      Stage 2       │
                     │                    │
                     │ • Initial outline  │
                     │ • Retrieved videos │
                     │ • Generate final   │
                     │   course           │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │   Django REST API  │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │   React Frontend   │
                     │                    │
                     │ • Course modules   │
                     │ • Videos           │
                     │ • Reading          │
                     │ • Quizzes          │
                     │ • Progression      │
                     └────────────────────┘
```

## Pipeline Breakdown

### 1. User Input

The learner provides a topic and specifies the desired number of modules.

```text
"I want to learn React architecture"

Modules: 3
```

### 2. Initial Course Planning

Gemini analyzes the learning objective and creates a **rough course outline**, identifying the major concepts that should be covered.

### 3. YouTube Search Query Generation

Gemini generates targeted search keywords based on the topics in the initial course outline.

Gemini does **not** directly generate YouTube URLs.

### 4. Resource Retrieval

The generated keywords are sent to the **YouTube Data API**, which retrieves actual YouTube search results.

### 5. Final Course Generation

The initial course outline and retrieved YouTube resources are provided to Gemini again.

Gemini uses this additional context to generate the **final structured course**.

### 6. Course Delivery

The final course is returned through the Django REST API and displayed in the React application.

### 7. Learning & Assessment

The learner progresses through:

```text
Video Lesson
      ↓
Reading Material
      ↓
Assessment
      ↓
Pass Required Score
      ↓
Unlock Next Module
```

---

# 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    React + Vite                         │
│                     Frontend                            │
│                                                         │
│  Generate │ My Paths │ Catalog │ Lessons │ Quizzes     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Django REST Framework                  │
│                       Backend                           │
│                                                         │
│  Course Generation │ Courses │ Lessons │ Assessments   │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
                ▼                         ▼
       ┌─────────────────┐       ┌─────────────────────┐
       │   Gemini API    │       │    YouTube Data     │
       │                 │       │        API          │
       │ Course Planning │       │ Video Discovery     │
       │ Final Generation│       │                     │
       └─────────────────┘       └─────────────────────┘
                │
                ▼
       ┌─────────────────┐
       │     SQLite      │
       │     Database    │
       └─────────────────┘
```

---

# 📖 Learning Experience

A generated course follows a structured progression:

```text
Course
 │
 ├── Module 1
 │    │
 │    ├── Video Lesson
 │    ├── Reading Material
 │    └── Assessment
 │
 ├── Module 2 🔒
 │    │
 │    ├── Video Lesson
 │    ├── Reading Material
 │    └── Assessment
 │
 └── Module 3 🔒
      │
      ├── Video Lesson
      ├── Reading Material
      └── Assessment
```

Learners complete the available content and assessment before progressing to the next module.

---

# 🖥️ Application Flow

```text
┌──────────────────────┐
│   Generate Course    │
│                      │
│ Enter topic + number │
│      of modules      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   AI Course Creation │
│                      │
│ Gemini → Outline     │
│ Gemini → Search Terms│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Resource Discovery │
│                      │
│   YouTube Data API   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Final Course       │
│                      │
│ Video + Reading +    │
│ Assessments          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Learning Path      │
│                      │
│ Complete module      │
│        ↓             │
│ Take assessment      │
│        ↓             │
│ Unlock next module   │
└──────────────────────┘
```

---

# 🛠️ Tech Stack

| Layer              | Technology              |
| ------------------ | ----------------------- |
| Frontend           | React, JavaScript, Vite |
| Backend            | Python, Django          |
| API                | Django REST Framework   |
| AI                 | Google Gemini API       |
| Video Resources    | YouTube Data API        |
| Database           | SQLite                  |
| Authentication     | Django Authentication   |
| Package Management | npm, pip                |
| Configuration      | Environment Variables   |
| Version Control    | Git                     |

---

# 🏆 Technical Highlights

CourseCraft demonstrates practical implementation of:

* Full-stack web application development
* React and Vite
* Python and Django
* Django REST Framework
* REST API development
* Frontend–backend communication
* Google Gemini API integration
* Multi-stage LLM workflows
* Prompt engineering
* External API integration
* YouTube resource discovery
* AI-assisted curriculum generation
* Structured course generation
* Assessment-based module unlocking
* User learning paths
* Database-backed application state
* Authentication
* Environment-based secret management

---

# 📁 Project Structure

```text
ai-academy/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   └── ...
│
├── ai-academy-react/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── README.md
└── ...
```

> Update this structure if your actual repository uses different folder names.

---

# ⚙️ Getting Started

## Prerequisites

Make sure the following are installed:

* Python 3.x
* Node.js
* npm
* Git
* Google Gemini API key
* YouTube Data API key

---

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ai-academy
```

---

# 🐍 Backend Setup

## 2. Create a Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python -m venv venv
source venv/bin/activate
```

## 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

## 4. Configure Environment Variables

Create a `.env` file in the same directory as `manage.py`:

```env
SECRET_KEY=your_secret_key
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
DEBUG=True
```

**Do not commit API keys or other credentials to Git.**

## 5. Run Database Migrations

```bash
python manage.py migrate
```

## 6. Create an Admin User

```bash
python manage.py createsuperuser
```

## 7. Start the Django Server

```bash
python manage.py runserver
```

The backend will typically be available at:

```text
http://127.0.0.1:8000/
```

---

# ⚛️ Frontend Setup

Open another terminal and navigate to the React application:

```bash
cd ai-academy-react
```

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure the Backend URL

Create a `.env` file in the React project:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

## 3. Start the Development Server

```bash
npm run dev
```

Vite will display the local development URL, typically:

```text
http://localhost:5173/
```

---

# 🔑 API Configuration

## Google Gemini API

Gemini is used for:

* Learning-goal analysis
* Initial course outline generation
* YouTube search keyword generation
* Final course generation

## YouTube Data API

The YouTube Data API is used for:

* Searching educational videos
* Retrieving actual video results
* Providing learning resources to the generated course

The application intentionally retrieves YouTube resources through the API rather than asking Gemini to directly generate video URLs.

---

# 💡 Example

A user enters:

```text
Topic:
Machine Learning from Scratch

Modules:
4
```

CourseCraft processes the request:

```text
User Input
    ↓
Gemini analyzes learning objective
    ↓
Initial course outline
    ↓
Gemini generates YouTube search keywords
    ↓
YouTube Data API
    ↓
Relevant video results
    ↓
Gemini receives:
    • Initial course outline
    • Retrieved YouTube resources
    ↓
Final structured course
    ↓
Django REST API
    ↓
React Frontend
    ↓
Video → Reading → Quiz → Next Module
```

---

# 🔮 Future Improvements

* PostgreSQL for production environments
* Persistent course progress tracking
* Learning analytics
* Improved video relevance ranking
* Course recommendations
* More assessment types
* Automated frontend and backend testing
* Docker containerization
* Production deployment
* Streaming AI responses
* More advanced learner personalization

---

# 📌 Project Status

**Active Development**

CourseCraft combines **AI-powered curriculum generation, external resource retrieval, structured learning content, and assessment-based progression** into a single full-stack learning platform.

```
```
