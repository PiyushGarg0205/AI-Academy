import os
import re
import json
import time
import math
import logging
import traceback
import gc
# NOTE: tempfile and pathlib are no longer strictly needed for this view but kept for safety
import tempfile
import pathlib
from dotenv import load_dotenv

import hashlib
import threading
from datetime import timedelta

import google.generativeai as genai
import googleapiclient.discovery
from googleapiclient.errors import HttpError
from google.api_core.exceptions import ResourceExhausted # <--- IMPORTANT IMPORT

from django.db import transaction
from django.db.models import Q
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.files.storage import default_storage

from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

# Local imports
from .permissions import IsAdminUser, IsAdminOrReadOnly
from .models import (
    Course, Module, Lesson, Profile, Quiz, Question, Review, 
    ExplanationAttempt, UserProgress
)
from .serializers import (
    CourseDetailSerializer,
    UserSerializer,
    ModuleWriteSerializer,
    LessonWriteSerializer,
    QuizWriteSerializer,
    QuestionWriteSerializer,
    ReviewSerializer,
)

# =========================
# GEMINI GLOBAL THROTTLE
# =========================
GEMINI_LOCK = threading.Lock()
LAST_GEMINI_CALL = 0.0
MIN_GEMINI_DELAY = 3.0  # seconds (safe for free tier)


# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_YOUTUBE_RESULTS = int(os.getenv("MAX_YOUTUBE_RESULTS", "15"))

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY is not set. AI generation will fail.")
else:
    genai.configure(api_key=GEMINI_API_KEY)


# ---------------------
# Utility / Robust helpers (SAME AS BEFORE)
# ---------------------

def _retry_with_backoff(fn, max_attempts=3, base_delay=1, allowed_exceptions=(Exception,)):
    attempt = 0
    while True:
        try:
            return fn()
        except allowed_exceptions as e:
            attempt += 1
            if attempt >= max_attempts:
                logger.exception("Retries exhausted: %s", e)
                raise
            sleep_for = base_delay * (2 ** (attempt - 1)) + (0.1 * attempt)
            logger.warning("Transient error (attempt %d/%d). Retrying after %.2fs: %s", attempt, max_attempts, sleep_for, e)
            time.sleep(sleep_for)


def extract_json_from_text(text):
    if not text or not isinstance(text, str):
        raise json.JSONDecodeError("Empty or non-string input", doc=str(text), pos=0)
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    brackets = {"{": "}", "[": "]"}
    stack = []
    start_idx = None
    for i, ch in enumerate(cleaned):
        if ch in brackets and not stack:
            start_idx = i
            stack.append(ch)
        elif ch in brackets and stack:
            stack.append(ch)
        elif stack and ch == brackets.get(stack[-1]):
            stack.pop()
            if not stack:
                candidate = cleaned[start_idx : i + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    start_idx = None
                    continue
    possible = re.findall(r"(\{[\s\S]*?\}|\[[\s\S]*?\])", cleaned)
    for cand in possible:
        try:
            return json.loads(cand)
        except json.JSONDecodeError:
            continue
    raise json.JSONDecodeError("Unable to extract JSON from response text", doc=cleaned, pos=0)


def parse_iso8601_duration(duration_str):
    if not duration_str: return 0
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(duration_str)
    if not match: return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return (hours * 3600) + (minutes * 60) + seconds


# ---------------------
# Gemini helpers (SAME AS BEFORE)
# ---------------------

def run_gemini_generation(model_name, prompt_text, max_attempts=2):
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")

    def _call():
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt_text)
        raw_text = getattr(response, "text", None)
        if raw_text is None:
            raw_text = str(response)
        return raw_text

    return _retry_with_backoff(_call, max_attempts=max_attempts, base_delay=1)


# ---------------------
# YOUTUBE helpers (SAME AS BEFORE)
# ---------------------

def _build_youtube_client():
    if not YOUTUBE_API_KEY:
        raise RuntimeError("YOUTUBE_API_KEY is not set")
    return googleapiclient.discovery.build("youtube", "v3", developerKey=YOUTUBE_API_KEY)


def search_youtube(query, max_results=MAX_YOUTUBE_RESULTS):
    if not YOUTUBE_API_KEY:
        logger.error("YouTube API Key is not set.")
        return []
    MIN_DURATION_SECONDS = 420 
    try:
        youtube = _build_youtube_client()
        search_request = youtube.search().list(
            part="id", q=f"{query} tutorial course", type="video",
            videoEmbeddable="true", safeSearch="moderate", maxResults=50, 
        )
        search_response = search_request.execute()
        video_ids = [item["id"]["videoId"] for item in search_response.get("items", [])]
        if not video_ids: return []

        ids_string = ",".join(video_ids)
        details_request = youtube.videos().list(part="snippet,contentDetails,status", id=ids_string)
        details_response = details_request.execute()
        valid_videos = []
        
        for item in details_response.get("items", []):
            if not item["status"].get("embeddable", True): continue
            if item["status"].get("privacyStatus") != "public": continue

            duration_str = item["contentDetails"]["duration"]
            duration_seconds = parse_iso8601_duration(duration_str)
            if duration_seconds < MIN_DURATION_SECONDS: continue 
                
            mins, secs = divmod(duration_seconds, 60)
            formatted_duration = f"{mins}m {secs}s"
            if duration_seconds >= 3600:
                hrs, mins = divmod(mins, 60)
                formatted_duration = f"{hrs}h {mins}m {secs}s"

            snippet = item["snippet"]
            if snippet.get("liveBroadcastContent") != "none": continue

            valid_videos.append({
                "video_id": item["id"],
                "title": snippet["title"],
                "description": snippet["description"],
                "channelTitle": snippet["channelTitle"],
                "duration": formatted_duration, 
                "duration_seconds": duration_seconds
            })
            if len(valid_videos) >= max_results: break
        
        return valid_videos
    except Exception as e:
        logger.exception("YouTube search/filtering error: %s", e)
        return []


def validate_video_id(video_id):
    if not video_id: return False
    try:
        youtube = _build_youtube_client()
        request = youtube.videos().list(part="status", id=video_id)
        response = request.execute()
        items = response.get("items", [])
        if not items: return False
        status_part = items[0].get("status", {})
        if status_part.get("privacyStatus") != "public": return False
        if not status_part.get("embeddable", True): return False
        return True
    except Exception:
        return False


# ---------------------
# AI PIPELINE (SAME AS BEFORE)
# ---------------------

def generate_course_outline(prompt, num_modules):
    logger.info("AI: Generating outline for: %s", prompt)
    full_prompt = f"""
You are an expert course curriculum designer.
USER REQUEST: "{prompt}"
YOUR TASK:
1. Analyze the USER REQUEST.
2. Generate a professional 'course_title'.
3. Create a structured outline with exactly {num_modules} content modules.
Return ONLY valid JSON:
{{
  "course_title": "Title",
  "modules": [{{"title": "Module 1"}}, {{"title": "Module 2"}}]
}}
"""
    raw = run_gemini_generation(GEMINI_MODEL, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        if "modules" not in parsed: parsed["modules"] = []
        if len(parsed["modules"]) != num_modules:
            parsed["modules"] = parsed.get("modules", [])[:num_modules]
            while len(parsed["modules"]) < num_modules:
                parsed["modules"].append({"title": f"Module {len(parsed['modules']) + 1}"})
        return parsed
    except Exception as e:
        logger.exception("Error parsing course outline: %s", e)
        return {"course_title": prompt, "modules": [{"title": f"Module {i+1}"} for i in range(num_modules)]}


def generate_lesson_plan_for_module(module_title, course_prompt, num_lessons):
    logger.info("AI: Generating lessons for: %s", module_title)
    full_prompt = f"""
Generate exactly {num_lessons} specific lesson titles for module "{module_title}" in course "{course_prompt}".
Return ONLY valid JSON:
{{"lessons": [{{"title": "Lesson 1"}}, {{"title": "Lesson 2"}}]}}
"""
    raw = run_gemini_generation(GEMINI_MODEL, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        lessons = parsed.get("lessons", [])
        if len(lessons) != num_lessons:
            lessons = lessons[:num_lessons]
            while len(lessons) < num_lessons:
                lessons.append({"title": f"{module_title} - Lesson {len(lessons)+1}"})
        return lessons
    except Exception as e:
        logger.exception("Error parsing lesson plan: %s", e)
        return [{"title": f"{module_title} - Lesson {i+1}"} for i in range(num_lessons)]


def _choose_valid_video(ai_video_id, video_candidates):
    if ai_video_id and validate_video_id(ai_video_id): return ai_video_id
    for vid in video_candidates or []:
        if validate_video_id(vid.get("video_id")): return vid.get("video_id")
    return None


def _generate_fallback_content(lesson_title, course_prompt, video_candidates):
    logger.warning(f"⚠️ Triggering Fallback Content Generation for: {lesson_title}")
    video_id = None
    if video_candidates:
        for vid in video_candidates:
             if validate_video_id(vid.get("video_id")):
                 video_id = vid.get("video_id")
                 break

    fallback_prompt = f"""
You are an expert educator. Write a comprehensive lesson on: "{lesson_title}"
Context: This is for a course titled "{course_prompt}".
Format: Use pure HTML tags (<p>, <h2>, <ul>, <li>, <pre><code>).
Content Requirements: Intro, Deep Dive, Examples. Approx 500 words.
RETURN ONLY THE HTML STRING.
"""
    try:
        text_content = run_gemini_generation(GEMINI_MODEL, fallback_prompt)
        text_content = re.sub(r"^```(?:html)?\s*", "", text_content.strip(), flags=re.IGNORECASE)
        text_content = re.sub(r"\s*```$", "", text_content, flags=re.IGNORECASE)
        return {"text_content": text_content, "video_id": video_id}
    except Exception as e:
        logger.error(f"Fallback generation also failed: {e}")
        return {"text_content": "<p>Content generation failed.</p>", "video_id": video_id}


def generate_deep_lesson_content(lesson_title, module_title, course_prompt, video_candidates):
    logger.info("AI: Writing deep content for lesson: %s", lesson_title)

    video_options_str = ""
    if video_candidates:
        video_options_str = "AVAILABLE VIDEO OPTIONS:\n"
        for i, vid in enumerate(video_candidates):
            video_options_str += (
                f"{i+1}. Title: {vid['title']}\n"
                f"   ID: {vid['video_id']}\n"
                f"   Description: {vid['description'][:150]}...\n\n"
            )
    else:
        video_options_str = "No videos available."

    full_prompt = f"""
You are an expert technical writer.
Course: "{course_prompt}" | Module: "{module_title}" | Lesson: "{lesson_title}"

TASK:
1. Select the BEST video from the list below.
2. Write a comprehensive HTML lesson (500-800 words).

{video_options_str}

Return ONLY valid JSON:
{{
  "text_content": "<p>Detailed lesson content...</p>",
  "video_id": "THE_ID_OF_THE_CHOSEN_VIDEO"
}}
"""
    try:
        raw = run_gemini_generation(GEMINI_MODEL, full_prompt)
        parsed = extract_json_from_text(raw)
        text_content = parsed.get("text_content") or parsed.get("content") or ""
        video_id = parsed.get("video_id")
        valid_vid = _choose_valid_video(video_id, video_candidates)
        if not valid_vid and video_candidates:
            fallback = video_candidates[0].get("video_id")
            if fallback and validate_video_id(fallback):
                valid_vid = fallback
        return {"text_content": text_content, "video_id": valid_vid}
    except Exception as e:
        logger.error(f"Primary JSON generation failed for '{lesson_title}': {e}")
        return _generate_fallback_content(lesson_title, course_prompt, video_candidates)


def generate_quiz_from_content(content_text, num_questions, suggested_title=""):
    logger.info("AI: Generating quiz...")
    safe_content = content_text[:15000]
    full_prompt = f"""
Generate exactly {num_questions} multiple-choice questions based on the text below.
Return ONLY valid JSON:
{{
  "quiz_title": "Assessment",
  "questions": [
    {{
      "question_text": "Question?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }}
  ]
}}
CONTENT:
{safe_content}
"""
    raw = run_gemini_generation(GEMINI_MODEL, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        if "questions" not in parsed:
            if isinstance(parsed, list): return {"quiz_title": "Assessment", "questions": parsed}
            return {"quiz_title": "Assessment", "questions": []}
        return parsed
    except Exception:
        return {"quiz_title": "Assessment", "questions": []}


# ---------------------
# DB HELPER: SAVE PIPELINE (SAME AS BEFORE)
# ---------------------
@transaction.atomic
def save_course_pipeline(course_title, user, generated_modules, intermediate_quizzes, ultimate_quiz):
    logger.info("DB: Saving course... %s", course_title)
    course = Course.objects.create(title=course_title, created_by=user)
    num_content_modules = len(generated_modules)
    num_test_modules = len(intermediate_quizzes)
    test_injection_points = []
    if num_test_modules > 0 and num_content_modules > 0:
        num_test_modules = min(num_test_modules, num_content_modules)
        modules_per_test = max(1, num_content_modules // num_test_modules)
        for i in range(num_test_modules):
            injection_index = min(num_content_modules - 1, (i + 1) * modules_per_test - 1)
            test_injection_points.append(injection_index)
    module_order = 1
    quiz_index = 0
    for i, module_data in enumerate(generated_modules):
        content_module = Module.objects.create(
            course=course, title=module_data.get("title", f"Module {i+1}"),
            order=module_order, module_type=Module.ModuleType.CONTENT,
        )
        module_order += 1
        for j, lesson_data in enumerate(module_data.get("lessons", [])):
            Lesson.objects.create(
                module=content_module,
                title=lesson_data.get("title", "Untitled Lesson"),
                content=lesson_data.get("text_content", "No content provided."),
                order=j + 1,
                video_id=lesson_data.get("video_id"),
            )
        if i in test_injection_points and quiz_index < len(intermediate_quizzes):
            quiz_data = intermediate_quizzes[quiz_index]
            quiz_index += 1
            test_module = Module.objects.create(
                course=course, title=quiz_data.get("quiz_title", "Assessment"),
                order=module_order, module_type=Module.ModuleType.ASSESSMENT,
            )
            module_order += 1
            quiz_obj = Quiz.objects.create(module=test_module, title=quiz_data.get("quiz_title", "Assessment"))
            for k, q_data in enumerate(quiz_data.get("questions", [])):
                Question.objects.create(
                    quiz=quiz_obj, question_text=q_data.get("question_text"),
                    options=q_data.get("options"), correct_answer=q_data.get("correct_answer"),
                    order=k + 1,
                )
    ultimate_module = Module.objects.create(
        course=course, title=ultimate_quiz.get("quiz_title", "Final Test"),
        order=module_order, module_type=Module.ModuleType.ASSESSMENT,
    )
    ultimate_quiz_obj = Quiz.objects.create(module=ultimate_module, title=ultimate_quiz.get("quiz_title", "Final Test"))
    for k, q_data in enumerate(ultimate_quiz.get("questions", [])):
        Question.objects.create(
            quiz=ultimate_quiz_obj, question_text=q_data.get("question_text"),
            options=q_data.get("options"), correct_answer=q_data.get("correct_answer"),
            order=k + 1,
        )
    gc.collect()
    return course


# ==============================================================================
#  API VIEWS (STANDARD CRUD)
# ==============================================================================
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

class CourseGenerateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, *args, **kwargs):
        # ... (Same implementation as previous, using helpers above) ...
        # For brevity, assuming this is unchanged from previous working version
        # Copy-paste your existing logic here if needed, or rely on helpers
        prompt = request.data.get("prompt")
        num_content_modules = min(int(request.data.get("num_content_modules", 3)), 6)
        num_lessons_per_module = min(int(request.data.get("num_lessons_per_module", 3)), 5)
        num_test_modules = min(int(request.data.get("num_test_modules", 1)), 2)

        if not prompt: return Response({"error": "Prompt required"}, status=400)
        try:
            outline_data = generate_course_outline(prompt, num_content_modules)
            course_title = outline_data.get("course_title", prompt)
            module_outline = outline_data.get("modules", [])
            generated_modules = []
            all_lesson_content = ""
            for module_info in module_outline:
                module_title = module_info.get("title")
                lesson_titles = generate_lesson_plan_for_module(module_title, prompt, num_lessons_per_module)
                generated_lessons = []
                module_content_blob = ""
                for lesson_info in lesson_titles:
                    lesson_title = lesson_info.get("title")
                    search_query = f"{lesson_title} {course_title}"
                    video_candidates = search_youtube(search_query, max_results=MAX_YOUTUBE_RESULTS)
                    lesson_data = generate_deep_lesson_content(lesson_title, module_title, prompt, video_candidates)
                    if lesson_data.get("video_id") and not validate_video_id(lesson_data.get("video_id")):
                         lesson_data["video_id"] = _choose_valid_video(lesson_data.get("video_id"), video_candidates)
                    lesson_data["title"] = lesson_title
                    generated_lessons.append(lesson_data)
                    module_content_blob += f"Topic: {lesson_title}\n{lesson_data.get('text_content', '')}\n"
                generated_modules.append({"title": module_title, "lessons": generated_lessons, "content_blob": module_content_blob})
                all_lesson_content += module_content_blob
            intermediate_quizzes = []
            if num_test_modules > 0 and num_content_modules > 0:
                num_test_modules = min(num_test_modules, num_content_modules)
                modules_per_test = max(1, num_content_modules // num_test_modules)
                for i in range(num_test_modules):
                    start_index = i * modules_per_test
                    end_index = (i + 1) * modules_per_test if (i < num_test_modules - 1) else num_content_modules
                    chunk_modules = generated_modules[start_index:end_index]
                    chunk_content = "".join([m["content_blob"] for m in chunk_modules])
                    if chunk_content:
                        quiz_json = generate_quiz_from_content(chunk_content, 5, f"Test: Mod {start_index+1}-{end_index}")
                        intermediate_quizzes.append(quiz_json)
            ultimate_quiz = generate_quiz_from_content(all_lesson_content, 10, "Final Exam")
            new_course = save_course_pipeline(course_title, request.user, generated_modules, intermediate_quizzes, ultimate_quiz)
            serializer = CourseDetailSerializer(
                         new_course,
                         context={"request": request}
                          )
            return Response(serializer.data, status=201)
        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
@transaction.atomic
def generate_single_module(request, course_pk):
    # (Same implementation as previous)
    try:
        course = Course.objects.get(pk=course_pk)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    prompt = request.data.get("prompt")
    module_type = request.data.get("module_type", "CONTENT")
    if not prompt: return Response({"error": "Prompt required"}, status=400)
    try:
        last_order = course.modules.count()
        if module_type == "CONTENT":
            num_lessons = min(int(request.data.get("num_lessons", 3)), 5)
            lesson_titles = generate_lesson_plan_for_module(prompt, course.title, num_lessons)
            generated_lessons = []
            for info in lesson_titles:
                ltitle = info.get("title")
                vids = search_youtube(f"{ltitle} {course.title}", max_results=MAX_YOUTUBE_RESULTS)
                ldata = generate_deep_lesson_content(ltitle, prompt, course.title, vids)
                if ldata.get("video_id") and not validate_video_id(ldata.get("video_id")):
                    ldata["video_id"] = _choose_valid_video(ldata.get("video_id"), vids)
                ldata["title"] = ltitle
                generated_lessons.append(ldata)
            mod = Module.objects.create(course=course, title=prompt, order=last_order+1, module_type="CONTENT")
            for i, ld in enumerate(generated_lessons):
                Lesson.objects.create(module=mod, title=ld["title"], content=ld["text_content"], order=i+1, video_id=ld["video_id"])
        elif module_type == "ASSESSMENT":
            qjson = generate_quiz_from_content(f"Topic: {prompt}", 5, prompt)
            mod = Module.objects.create(course=course, title=qjson.get("quiz_title", prompt), order=last_order+1, module_type="ASSESSMENT")
            quiz = Quiz.objects.create(module=mod, title=qjson.get("quiz_title"))
            for k, q in enumerate(qjson.get("questions", [])):
                Question.objects.create(quiz=quiz, question_text=q["question_text"], options=q["options"], correct_answer=q["correct_answer"], order=k+1)
        return Response(CourseDetailSerializer(course).data, status=201)
    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "profile") and user.profile.role == "ADMIN": return Course.objects.all().order_by("-created_at")
        return Course.objects.filter(Q(status="PUBLISHED") | Q(created_by=user)).order_by("-created_at")

class CourseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "profile") and user.profile.role == "ADMIN": return Course.objects.all()
        return Course.objects.filter(Q(status="PUBLISHED") | Q(created_by=user))

class ModuleCreateAPIView(generics.CreateAPIView):
    queryset = Module.objects.all(); serializer_class = ModuleWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
def gemini_safe_generate(model, prompt):
    global LAST_GEMINI_CALL

    with GEMINI_LOCK:
        now = time.time()
        wait = MIN_GEMINI_DELAY - (now - LAST_GEMINI_CALL)
        if wait > 0:
            time.sleep(wait)

        response = model.generate_content(prompt)
        LAST_GEMINI_CALL = time.time()
        return response


def hash_transcript(text: str) -> str:
    return hashlib.sha256(text.strip().lower().encode()).hexdigest()

class ModuleDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleWriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
            return super().retrieve(request, *args, **kwargs)
        if instance.order == 1:
            return super().retrieve(request, *args, **kwargs)
        previous_module = Module.objects.filter(course=instance.course, order__lt=instance.order).order_by('-order').first()
        if previous_module:
            has_completed_prev = UserProgress.objects.filter(user=user, module=previous_module, is_completed=True).exists()
            if not has_completed_prev:
                return Response({"error": "LOCKED", "message": f"Complete '{previous_module.title}' first."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

class LessonCreateAPIView(generics.CreateAPIView):
    queryset = Lesson.objects.all(); serializer_class = LessonWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
class LessonDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Lesson.objects.all(); serializer_class = LessonWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
class QuizCreateAPIView(generics.CreateAPIView):
    queryset = Quiz.objects.all(); serializer_class = QuizWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
class QuizDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Quiz.objects.all(); serializer_class = QuizWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
class QuestionCreateAPIView(generics.CreateAPIView):
    queryset = Question.objects.all(); serializer_class = QuestionWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
class QuestionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Question.objects.all(); serializer_class = QuestionWriteSerializer; permission_classes = [permissions.IsAuthenticated, IsAdminUser]
class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer; permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        cid = self.request.query_params.get("course_id")
        return Review.objects.filter(course_id=cid).order_by("-created_at") if cid else Review.objects.none()
    def perform_create(self, serializer): serializer.save(user=self.request.user)


# ==============================================================================
#  UPDATED: EXPLAIN OR FAIL (TEXT ONLY TO AVOID RATE LIMITS)
# ==============================================================================

class ExplainOrFailAPIView(APIView):
    """
    SAFE Explain-Or-Fail endpoint
    - Text only
    - Per-user cooldown
    - Idempotent transcript handling
    - Gemini rate-limit safe
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lesson_id):
        # 1. Validate lesson
        try:
            lesson = Lesson.objects.get(pk=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)

        transcript = request.data.get("transcript", "").strip()
        if not transcript:
            return Response({"error": "Transcript required"}, status=400)

        user = request.user
        transcript_hash = hash_transcript(transcript)

        # 2. IDEMPOTENCY: Same transcript already evaluated
        existing_attempt = ExplanationAttempt.objects.filter(
            user=user,
            lesson=lesson,
            transcript_hash=transcript_hash
        ).first()

        if existing_attempt:
            return Response({
                "status": "cached",
                "data": {
                    "transcript": existing_attempt.transcript,
                    "feedback": existing_attempt.feedback,
                    "is_passed": existing_attempt.is_passed,
                    "module_completed": existing_attempt.is_passed
                }
            })

        # 3. COOLDOWN: prevent rapid retries
        last_attempt = ExplanationAttempt.objects.filter(
            user=user,
            lesson=lesson
        ).order_by("-created_at").first()

        if last_attempt:
            delta = timezone.now() - last_attempt.created_at
            if delta < timedelta(seconds=30):
                return Response(
                    {"error": "Please wait 30 seconds before retrying."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        # 4. Prompt
        prompt = f"""
You are a strict but fair Computer Science Professor.

LESSON TITLE:
"{lesson.title}"

LESSON SUMMARY:
"{lesson.content[:1200]}..."

STUDENT EXPLANATION:
"{transcript}"

TASK:
- PASS if the student correctly explains the core concept.
- FAIL if incorrect, vague, or irrelevant.

RETURN JSON ONLY:
{{
  "feedback": "One sentence feedback.",
  "is_passed": true/false
}}
"""

        model = genai.GenerativeModel(GEMINI_MODEL)

        # 5. Gemini call (RATE SAFE)
        try:
            response = gemini_safe_generate(model, prompt)
        except ResourceExhausted:
            return Response(
                {"error": "AI busy. Try again in 30 seconds."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except Exception:
            logger.exception("Gemini failure")
            return Response({"error": "AI evaluation failed."}, status=500)

        # 6. Parse
        try:
            result = extract_json_from_text(response.text)
        except Exception:
            return Response({"error": "Invalid AI response."}, status=500)

        is_passed = bool(result.get("is_passed", False))
        feedback = result.get("feedback", "")

        # 7. Save attempt
        attempt = ExplanationAttempt.objects.create(
            user=user,
            lesson=lesson,
            transcript=transcript,
            transcript_hash=transcript_hash,
            feedback=feedback,
            is_passed=is_passed
        )

        # 8. Unlock module if passed
        module_completed = False
        if is_passed:
            UserProgress.objects.update_or_create(
                user=user,
                module=lesson.module,
                course=lesson.module.course,
                defaults={
                    "is_completed": True,
                    "completed_at": timezone.now()
                }
            )
            module_completed = True

        return Response({
            "status": "success",
            "data": {
                "transcript": transcript,
                "feedback": feedback,
                "is_passed": is_passed,
                "module_completed": module_completed
            }
        })
# ==============================================================================
#  QUIZ SUBMISSION (SAME AS BEFORE)
# ==============================================================================

class QuizSubmissionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, module_id):
        try:
            module = Module.objects.get(pk=module_id)
            quiz = Quiz.objects.filter(module=module).first()
            if not quiz: return Response({"error": "No quiz found"}, status=404)
        except Module.DoesNotExist:
            return Response({"error": "Module not found"}, status=404)

        user_answers = request.data.get("answers", {})
        questions = quiz.questions.all()
        total_questions = questions.count()
        if total_questions == 0: return Response({"error": "Quiz has no questions"}, status=400)

        correct_count = 0
        results = []
        for question in questions:
            user_ans = user_answers.get(str(question.id))
            is_correct = (user_ans == question.correct_answer)
            if is_correct: correct_count += 1
            results.append({"question_id": question.id, "is_correct": is_correct, "correct_answer": question.correct_answer})
        
        score_percent = (correct_count / total_questions) * 100
        PASSING_SCORE = 70.0
        passed = score_percent >= PASSING_SCORE

        if passed:
            UserProgress.objects.update_or_create(
                user=request.user, module=module,
                defaults={'is_completed': True, 'completed_at': timezone.now()}
            )

        return Response({
            "score": score_percent, "passed": passed, "results": results, "next_module_unlocked": passed
        })