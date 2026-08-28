# AI Academy 🎓

This is a Django-based web application that uses AI to generate online courses from user prompts.

## Setup Instructions

1.  Clone the repository:
    `git clone <your-repo-url>`
2.  Create and activate a virtual environment:
    `python3 -m venv venv`
    `source venv/bin/activate`
3.  Install the required packages:
    `pip install -r requirements.txt`
4.  Create a `.env` file and add your API keys:
    `YOUTUBE_API_KEY=your_key_here`
    `GEMINI_API_KEY=your_key_here`
5.  Run database migrations:
    `python manage.py migrate`
6.  Start the server:
    `python manage.py runserver`
