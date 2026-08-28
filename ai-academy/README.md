# AI Academy 🎓

This is a Django-based web application that uses AI to generate online courses from user prompts.

## Setup Instructions

1.  Clone the repository:
    `git clone <your-repo-url>`
# Navigate to the project root (or backend folder if separated)
cd ai-academy

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file in the same folder as manage.py
# Add your API keys:
# SECRET_KEY=your_secret_key
# GEMINI_API_KEY=your_gemini_key
# YOUTUBE_API_KEY=your_youtube_key
# DEBUG=True

# Run Migrations to set up the database (SQLite locally)
python manage.py migrate

# Create an Admin user (Superuser)
python manage.py createsuperuser

# Start the Django Server
python manage.py runserver


# Navigate to your frontend folder (e.g., ai-academy-react)
cd ai-academy-react

# Install Node dependencies
npm install

# Create a .env file in this folder
# This tells React where to find your local Django server
echo "VITE_API_URL=http://127.0.0.1:8000/api" > .env

# Start the React Development Server
npm run dev
