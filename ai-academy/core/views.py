import os
import json
import google.generativeai as genai
import googleapiclient.discovery
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi

from django.db import transaction
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics

from .permissions import IsAdminUser, IsAdminOrReadOnly
from .models import Course, Module, Lesson
from .serializers import CourseDetailSerializer, UserSerializer

# --- Load API Keys & Configure Services ---
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


# ==============================================================================
#  HELPER FUNCTIONS FOR COURSE GENERATION
# ==============================================================================

def generate_course_outline(prompt, num_modules):
    """AI Call #1: Uses Gemini to generate a structured list of module titles."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    full_prompt = f"""
    Create a course outline for the topic: "{prompt}".
    The course must have exactly {num_modules} modules in a logical learning order.
    Return ONLY a valid JSON object with a single key "modules", which is an array of objects. Do not include any text or explanations.
    Each object in the array should have a "title" for the module.
    Example: {{"modules": [{{"title": "Introduction to AI"}}, {{"title": "Machine Learning Basics"}}]}}
    """
    response = model.generate_content(full_prompt)
    cleaned_json = response.text.strip().replace("```json", "").replace("```", "")
    outline = json.loads(cleaned_json)
    return outline["modules"]


def search_youtube(query, max_results=5):
    """Searches YouTube and returns video details including ID, title, and description."""
    if not YOUTUBE_API_KEY:
        print("YouTube API Key is not set. Skipping video search.")
        return []
    try:
        youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        request = youtube.search().list(
            part="snippet", 
            q=f"{query} tutorial for beginners", 
            type="video", 
            maxResults=max_results,
            videoDefinition='high'
        )
        response = request.execute()
        
        videos = []
        for item in response.get("items", []):
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
            })
        return videos
    except Exception as e:
        print(f"An error occurred with YouTube API search: {e}")
        return []


def get_video_context(video_id, title, description):
    """Fetches a video's transcript; falls back to title and description if unavailable."""
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript = " ".join([d['text'] for d in transcript_list])
        return transcript[:2500]
    except Exception as e:
        print(f"Could not get transcript for video {video_id}: {e}")
        return f"Title: {title}\nDescription: {description}"


def generate_detailed_lessons_and_mcqs(course_prompt, module_outline, all_videos_with_context):
    """AI Call #2: Uses Gemini to create detailed lessons, assign videos, and generate MCQs."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    video_input_str = ""
    if all_videos_with_context:
        video_input_str = "\nAVAILABLE VIDEOS AND THEIR CONTENT (use them only if highly relevant):\n" + "\n---\n".join([
            f"Video {idx+1} Title: {v['title']}\nVideo ID: {v['video_id']}\nContent/Transcript:\n{v['context']}"
            for idx, v in enumerate(all_videos_with_context)
        ])
    
    module_structure_str = "\n".join([f"- {m['title']}" for m in module_outline])
    
    full_prompt = f"""
    CONTEXT: Create a comprehensive and beginner-friendly course about "{course_prompt}".
    
    PRE-DEFINED MODULES (You must use these exact module titles):
    {module_structure_str}
    
    {video_input_str}

    YOUR TASK:
    1.  For each module in the PRE-DEFINED MODULES:
        a.  Generate a list of 2-3 logical 'lesson_titles'.
        b.  For each lesson:
            i.   Generate detailed 'text_content'. This is the primary teaching method.
            ii.  Optionally assign ONE highly relevant video_id from the AVAILABLE VIDEOS. If no suitable video is found, do NOT include a video_id field.
            iii. Create ONE relevant MCQ based on the 'text_content'.
            iv. The MCQ must have 4 'options' and ONE 'correct_answer'.
    2.  Return ONLY a single, valid JSON object.

    STRICT JSON FORMAT:
    {{
      "course_title": "Generated Course Title",
      "modules": [
        {{
          "title": "Module Title 1",
          "lessons": [
            {{
              "title": "Lesson Title 1",
              "text_content": "Detailed lesson text...",
              "video_id": "youtube_id_if_relevant",
              "mcq_question": "What is the main concept?",
              "mcq_options": ["A", "B", "C", "D"],
              "mcq_correct_answer": "B"
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
    """Parses the final AI-generated JSON and saves it to the database."""
    course = Course.objects.create(
        title=course_data.get('course_title', 'Untitled Course'),
        created_by=user, # ✅ CORRECTED FIELD NAME
    )
    
    for i, module_data in enumerate(course_data.get('modules', [])):
        module = Module.objects.create(course=course, title=module_data.get('title'), order=i + 1)
        
        for j, lesson_data in enumerate(module_data.get('lessons', [])):
            Lesson.objects.create(
                module=module,
                title=lesson_data.get('title', 'Untitled Lesson'),
                content=lesson_data.get('text_content', 'No content provided.'),
                order=j + 1,
                video_id=lesson_data.get('video_id'),
                mcq_question=lesson_data.get('mcq_question'),
                mcq_options=lesson_data.get('mcq_options'),
                mcq_correct_answer=lesson_data.get('mcq_correct_answer')
            )
    return course


# ==============================================================================
#  MAIN API VIEWS
# ==============================================================================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer


class CourseGenerateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        prompt = request.data.get('prompt')
        num_modules = int(request.data.get('num_modules', 0))

        if not prompt or num_modules <= 0:
            return Response({"error": "Prompt and num_modules are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            print("✅ [1/6] Received request. Generating course outline...")
            module_outline_titles = generate_course_outline(prompt, num_modules)
            print("✅ [2/6] Course outline generated.")

            all_videos = []
            seen_urls = set()
            for module in module_outline_titles:
                print(f"   -> Searching YouTube for: '{module['title']}'")
                videos_for_module = search_youtube(module['title'])
                for video in videos_for_module:
                    if video['url'] not in seen_urls:
                        all_videos.append(video)
                        seen_urls.add(video['url'])
            print(f"✅ [3/6] YouTube search complete. Found {len(all_videos)} unique videos.")
            
            videos_with_context = []
            for video in all_videos:
                print(f"   -> Fetching context for video: '{video['title'][:40]}...'")
                context = get_video_context(video['video_id'], video['title'], video['description'])
                videos_with_context.append({
                    "video_id": video['video_id'],
                    "title": video['title'], 
                    "context": context
                })
            print(f"✅ [4/6] Context fetched for {len(videos_with_context)} videos.")

            final_course_json = generate_detailed_lessons_and_mcqs(prompt, module_outline_titles, videos_with_context)
            print("✅ [5/6] Final course content generated.")

            new_course = save_course_from_json(final_course_json, request.user)
            print("✅ [6/6] Course saved to database!")

            serializer = CourseDetailSerializer(new_course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except json.JSONDecodeError:
            return Response({"error": "The AI returned an invalid JSON. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourseListAPIView(generics.ListAPIView):
    queryset = Course.objects.all().order_by('-created_at')
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


class CourseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseDetailSerializer
    permission_classes = [IsAdminOrReadOnly]