import os
import json
import google.generativeai as genai
import googleapiclient.discovery
from dotenv import load_dotenv

from django.db import transaction
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics

from .permissions import IsAdminUser
from .models import Course, Module, Video, MCQ
from .serializers import CourseDetailSerializer, UserSerializer

# --- 1. Load API Keys & Configure Services ---
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


# ==============================================================================
#  HELPER FUNCTIONS FOR COURSE GENERATION
# ==============================================================================

def generate_course_outline(prompt, num_modules):
    """
    AI Call #1: Uses Gemini to generate a structured list of module titles.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    full_prompt = f"""
    Create a course outline for the topic: "{prompt}".
    The course must have exactly {num_modules} modules in a logical learning order.
    For each module, provide a concise, descriptive title that would be effective as a YouTube search query.
    Return ONLY a valid JSON object with a single key "modules", which is an array of objects. Do not include any text or explanations.
    """
    
    response = model.generate_content(full_prompt)
    cleaned_json = response.text.strip().replace("```json", "").replace("```", "")
    outline = json.loads(cleaned_json)
    return outline["modules"]


def search_youtube(query, max_results=5):
    """
    Searches YouTube for videos based on a query using the YouTube Data API.
    """
    youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
    request = youtube.search().list(part="snippet", q=query, type="video", maxResults=max_results)
    response = request.execute()
    
    videos = []
    for item in response.get("items", []):
        videos.append({
            "title": item["snippet"]["title"],
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
        })
    return videos


def generate_final_course_content(course_prompt, module_outline, all_videos):
    """
    AI Call #2: Uses Gemini to select videos, assign them to modules, and create MCQs.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    video_input_str = "\n".join([f"- Title: {v['title']}, URL: {v['url']}" for v in all_videos])
    module_structure_str = "\n".join([f"- {m['title']}" for m in module_outline])
    
    full_prompt = f"""
    CONTEXT: Create a detailed online course about "{course_prompt}".
    PRE-DEFINED MODULES:
    {module_structure_str}
    AVAILABLE VIDEOS:
    {video_input_str}

    YOUR TASK:
    1.  Assign the most relevant videos from the "AVAILABLE VIDEOS" list to the correct module from the "PRE-DEFINED MODULES" list in a logical learning order.
    2.  FOR EVERY SINGLE ASSIGNED VIDEO, YOU MUST CREATE EXACTLY 2 multiple-choice questions (MCQs). This is a mandatory requirement.
    3.  Each MCQ MUST have 4 options and ONE correct answer.
    4.  Return ONLY a single, valid JSON object. Do not include any text, explanations, or markdown code fences.

    STRICT JSON OUTPUT FORMAT:
    {{
      "course_title": "A concise course title",
      "modules": [
        {{
          "title": "Exact module title",
          "videos": [
            {{
              "title": "Video title",
              "url": "Video URL",
              "mcqs": [
                {{"question": "Question text?", "options": [], "correct_answer": "Answer"}}
              ]
            }}
          ]
        }}
      ]
    }}
    """
    
    response = model.generate_content(full_prompt)
    cleaned_json = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned_json)


@transaction.atomic
def save_course_from_json(course_data, user):
    """
    Parses the final AI-generated JSON and saves the course, modules, videos, and MCQs to the database.
    """
    course = Course.objects.create(
        title=course_data['course_title'],
        created_by=user,
        status=Course.Status.DRAFT
    )
    
    for i, module_data in enumerate(course_data.get('modules', [])):
        module = Module.objects.create(
            course=course,
            title=module_data.get('title'),
            order=i + 1
        )
        
        for j, video_data in enumerate(module_data.get('videos', [])):
            video = Video.objects.create(
                module=module,
                title=video_data.get('title'),
                url=video_data.get('url'),
                order=j + 1
            )
            
            for mcq_data in video_data.get('mcqs', []):
                MCQ.objects.create(
                    video=video,
                    question=mcq_data.get('question'),
                    options=mcq_data.get('options'),
                    correct_answer=mcq_data.get('correct_answer')
                )
    return course


# ==============================================================================
#  MAIN API VIEWS
# ==============================================================================

class RegisterView(generics.CreateAPIView):
    """
    API endpoint for new users to register. Accessible by anyone.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer


class CourseGenerateAPIView(APIView):
    """
    The main API view that orchestrates the entire course creation process.
    Accessible only by users with the ADMIN role.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        prompt = request.data.get('prompt')
        num_modules = int(request.data.get('num_modules', 0))

        if not prompt or num_modules <= 0:
            return Response({"error": "Prompt and num_modules are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            module_outline = generate_course_outline(prompt, num_modules)
            
            all_videos = []
            for module in module_outline:
                videos_for_module = search_youtube(module['title'])
                all_videos.extend(videos_for_module)

            if not all_videos:
                return Response({"error": "Could not find any YouTube videos for the generated topics."}, status=status.HTTP_404_NOT_FOUND)
            
            final_course_json = generate_final_course_content(prompt, module_outline, all_videos)
            
            new_course = save_course_from_json(final_course_json, request.user)
            
            serializer = CourseDetailSerializer(new_course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except json.JSONDecodeError:
            return Response({"error": "The AI returned an invalid JSON response. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint for an admin to retrieve, update (e.g., publish), or delete a course.
    """
    queryset = Course.objects.all()
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]