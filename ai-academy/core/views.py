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
    """AI Call #1: Uses Gemini to generate a structured list of module titles."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    full_prompt = f"""
    Create a course outline for the topic: "{prompt}".
    The course must have exactly {num_modules} modules in a logical learning order.
    Return ONLY a valid JSON object with a single key "modules", which is an array of objects. Do not include any text or explanations.
    """
    response = model.generate_content(full_prompt)
    cleaned_json = response.text.strip().replace("```json", "").replace("```", "")
    outline = json.loads(cleaned_json)
    return outline["modules"]


def search_youtube(query, max_results=5):
    """Searches YouTube and returns video details including ID and description."""
    youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
    request = youtube.search().list(part="snippet", q=query, type="video", maxResults=max_results)
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


def get_video_context(video_id, title, description):
    """Fetches a video's transcript; falls back to title and description if unavailable."""
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        transcript = " ".join([d['text'] for d in transcript_list])
        return transcript
    except Exception:
        return f"Title: {title}\nDescription: {description}"


def generate_final_course_content(course_prompt, module_outline, videos_with_context):
    """AI Call #2: Uses Gemini and video transcripts to create deep course content."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    video_input_str = "\n---\n".join([
        f"Video Title: {v['title']}\nURL: {v['url']}\nContent/Transcript:\n{v['context'][:2500]}"
        for v in videos_with_context
    ])
    
    module_structure_str = "\n".join([f"- {m['title']}" for m in module_outline])
    
    full_prompt = f"""
    CONTEXT: Create a course about "{course_prompt}".
    PRE-DEFINED MODULES:
    {module_structure_str}
    AVAILABLE VIDEOS WITH THEIR CONTENT:
    {video_input_str}

    YOUR TASK:
    1.  Assign the videos to the most relevant modules in a logical order.
    2.  FOR EACH VIDEO, CREATE 2 DEEPLY RELEVANT multiple-choice questions based on the "Content/Transcript". The questions must test actual concepts taught in the video, not just the title. This is the most important instruction.
    3.  Each MCQ must have 4 options and ONE correct answer.
    4.  Return ONLY a single, valid JSON object.

    STRICT JSON FORMAT:
    {{"course_title": "Course Title", "modules": [{{"title": "Module Title", "videos": [{{"title": "Video Title", "url": "URL", "mcqs": [{{"question": "Deep question?", "options": [], "correct_answer": "Answer"}}]}}]}}]}}
    """
    
    response = model.generate_content(full_prompt)
    cleaned_json = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(cleaned_json)


@transaction.atomic
def save_course_from_json(course_data, user):
    """Parses the final AI-generated JSON and saves it to the database."""
    course = Course.objects.create(
        title=course_data.get('course_title', 'Untitled Course'),
        created_by=user,
        status=Course.Status.DRAFT
    )
    
    for i, module_data in enumerate(course_data.get('modules', [])):
        module = Module.objects.create(course=course, title=module_data.get('title'), order=i + 1)
        
        for j, video_data in enumerate(module_data.get('videos', [])):
            video = Video.objects.create(module=module, title=video_data.get('title'), url=video_data.get('url'), order=j + 1)
            
            for mcq_data in video_data.get('mcqs', []):
                MCQ.objects.create(video=video, question=mcq_data.get('question'), options=mcq_data.get('options'), correct_answer=mcq_data.get('correct_answer'))
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
            module_outline = generate_course_outline(prompt, num_modules)
            print("✅ [2/6] Course outline generated.")

            all_videos = []
            seen_urls = set()
            for module in module_outline:
                print(f"   -> Searching YouTube for: '{module['title']}'")
                videos_for_module = search_youtube(module['title'])
                for video in videos_for_module:
                    if video['url'] not in seen_urls:
                        all_videos.append(video)
                        seen_urls.add(video['url'])
            print("✅ [3/6] YouTube search complete and de-duplicated.")
            
            videos_with_context = []
            for video in all_videos:
                print(f"   -> Fetching transcript for: '{video['title'][:40]}...'")
                context = get_video_context(video['video_id'], video['title'], video['description'])
                videos_with_context.append({"url": video['url'], "title": video['title'], "context": context})
            print("✅ [4/6] Transcripts fetched successfully.")

            final_course_json = generate_final_course_content(prompt, module_outline, videos_with_context)
            print("✅ [5/6] Final course content and deep MCQs generated.")

            new_course = save_course_from_json(final_course_json, request.user)
            print("✅ [6/6] Course saved to database!")

            serializer = CourseDetailSerializer(new_course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except json.JSONDecodeError:
            return Response({"error": "The AI returned an invalid JSON response. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourseListAPIView(generics.ListAPIView):
    queryset = Course.objects.all().order_by('-created_at')
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]


class CourseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseDetailSerializer
    permission_classes = [IsAdminOrReadOnly]