import os
import re
import json
import traceback
from dotenv import load_dotenv

import google.generativeai as genai
import googleapiclient.discovery

from django.db import transaction
from django.db.models import Q
from django.contrib.auth.models import User

from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

# Local imports
from .permissions import IsAdminUser, IsAdminOrReadOnly
from .models import Course, Module, Lesson, Profile, Quiz, Question
from .serializers import (
    CourseDetailSerializer,
    UserSerializer,
    ModuleWriteSerializer,
    LessonWriteSerializer,
    QuizWriteSerializer,
    QuestionWriteSerializer,
)

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY is not set in environment variables.")

genai.configure(api_key=GEMINI_API_KEY)


# ---------------------
# Helper: Robust JSON extraction
# ---------------------
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

    obj_match = None
    brace_stack = []
    start_idx = None
    for i, ch in enumerate(cleaned):
        if ch == "{":
            if start_idx is None:
                start_idx = i
            brace_stack.append(ch)
        elif ch == "}":
            if brace_stack:
                brace_stack.pop()
                if not brace_stack and start_idx is not None:
                    obj_match = cleaned[start_idx : i + 1]
                    break
    
    if obj_match:
        try:
            return json.loads(obj_match)
        except json.JSONDecodeError:
            pass
            
    raise json.JSONDecodeError("Unable to extract JSON from response text", doc=cleaned, pos=0)


# ---------------------
# AI Helpers (Gemini)
# ---------------------
def run_gemini_generation(model_name, prompt_text):
    model = genai.GenerativeModel(model_name)
    try:
        response = model.generate_content(prompt_text)
        raw_text = getattr(response, "text", None)
        if raw_text is None:
            raw_text = str(response)
        return raw_text
    except Exception as e:
        print(f"Gemini generation error with model {model_name}: {e}")
        raise


# ==============================================================================
#  NEW AI PIPELINE (HELPER FUNCTIONS)
# ==============================================================================

# === PIPELINE STEP 1: Get Module Titles ===
def generate_course_outline(prompt, num_modules):
    print(f"AI: Generating {num_modules} module titles for: {prompt}")
    model_name = "gemini-2.5-flash"
    full_prompt = f"""
Create a course outline for the topic: "{prompt}".
The course must have exactly {num_modules} content modules in a logical learning order.
Return ONLY a valid JSON object with a single key "modules", which is an array of objects.
Each object in the array should have a "title" for the module.
Example: {{"modules": [{{"title": "Introduction to AI"}}, {{"title": "Machine Learning Basics"}}]}}
"""
    raw = run_gemini_generation(model_name, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        return parsed.get("modules", [])
    except Exception as e:
        print("Error parsing course outline JSON:", e)
        return [{"title": f"Module {i+1}: {prompt} Part {i+1}"} for i in range(num_modules)]


# === PIPELINE STEP 2: Get Lesson Titles for a Module ===
def generate_lesson_plan_for_module(module_title, course_prompt, num_lessons):
    print(f"AI: Generating {num_lessons} lesson titles for module: {module_title}")
    model_name = "gemini-2.5-flash"
    full_prompt = f"""
You are a course curriculum designer for a course on "{course_prompt}".
Your task is to generate exactly {num_lessons} specific, teachable lesson titles 
for the module titled: "{module_title}".

Return ONLY a valid JSON object.

STRICT JSON FORMAT:
{{"lessons": [
    {{"title": "Lesson 1.1 Title"}},
    {{"title": "Lesson 1.2 Title"}},
    {{"title": "Lesson 1.3 Title"}}
]}}
"""
    raw = run_gemini_generation(model_name, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        return parsed.get("lessons", [])
    except Exception as e:
        print("Error parsing lesson plan JSON:", e)
        return [{"title": f"Lesson {i+1} for {module_title}"} for i in range(num_lessons)]


# === PIPELINE STEP 3: Get In-Depth Lesson Content ===
def generate_deep_lesson_content(lesson_title, module_title, course_prompt, video_candidates):
    print(f"AI: Writing deep content for lesson: {lesson_title}")
    model_name = "gemini-2.5-flash"

    video_options_str = ""
    if video_candidates:
        video_options_str = "AVAILABLE VIDEO OPTIONS (You MUST select one):\n"
        for i, vid in enumerate(video_candidates):
            video_options_str += f"{i+1}. Title: {vid['title']}\n   Channel: {vid['channelTitle']}\n   ID: {vid['video_id']}\n   Description: {vid['description'][:200]}...\n\n"
    else:
        video_options_str = "No videos available."

    full_prompt = f"""
You are an expert technical writer and educator for a course on "{course_prompt}".
Your current module is "{module_title}".

YOUR TASK:
1.  Review the list of AVAILABLE VIDEO OPTIONS below.
2.  Select the ONE video that is most relevant to the lesson topic: "{lesson_title}".
    Even if the video is only somewhat relevant, YOU MUST PICK ONE. Do not return null.
3.  Write a comprehensive, in-depth lesson on the topic: "{lesson_title}".

The lesson content MUST:
- Start with a clear, one-paragraph overview.
- Use simple HTML tags for formatting (e.g., <p>, <h2>, <h3>, <ul>, <li>, <code>, <pre>).
- Be at least 400-600 words long.
- Include detailed explanations, definitions, and analogies.
- Include practical code examples (<pre><code>...</code></pre>) if the topic is technical.

{video_options_str}

Return ONLY a single, valid JSON object.

STRICT JSON FORMAT:
{{
  "text_content": "<p>Detailed lesson content...</p>",
  "video_id": "THE_ID_OF_THE_CHOSEN_VIDEO"
}}
"""
    raw = run_gemini_generation(model_name, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        text_content = parsed.get("text_content") or parsed.get("content") or ""
        video_id = parsed.get("video_id")
        
        if (not video_id or str(video_id).lower() == "null") and video_candidates:
            print(f"   -> AI returned null video. Forcing fallback to: {video_candidates[0]['title']}")
            video_id = video_candidates[0]['video_id']
            
        return {"text_content": text_content, "video_id": video_id}
    except Exception as e:
        print("Error parsing deep lesson JSON:", e)
        fallback_vid = video_candidates[0]['video_id'] if video_candidates else None
        return {"text_content": f"<p>Content generation failed for {lesson_title}.</p>", "video_id": fallback_vid}


# === PIPELINE STEP 4: Generate Contextual Quiz ===
def generate_quiz_from_content(content_text, num_questions, suggested_title=""):
    print(f"AI: Generating a {num_questions}-question quiz...")
    model_name = "gemini-2.5-flash"
    safe_content = content_text[:25000]

    full_prompt = f"""
CONTEXT: You are a quiz generation bot. You will be given a block of text
that represents lessons from an online course OR a user prompt describing what to test.

YOUR TASK:
1.  Read the provided text content.
2.  Generate a concise, professional 'quiz_title' based on the content.
    (e.g., if content is about React Hooks, title should be "React Hooks Assessment").
    Do NOT simply copy the content text as the title.
3.  Generate a quiz with exactly {num_questions} multiple-choice questions
    that are directly based on the provided text.
4.  Each question must have 4 'options' (as a JSON list of strings).
5.  One of these options must be the 'correct_answer' (as a string).
6.  Return ONLY a single, valid JSON object.

If a suggested title was provided: "{suggested_title}", use it ONLY if it is short and professional. 
Otherwise, generate a better one.

STRICT JSON FORMAT:
{{
  "quiz_title": "Generated Professional Title",
  "questions": [
    {{
      "question_text": "Question?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }}
  ]
}}

---
CONTENT TO TEST:
{safe_content}
---
"""
    raw = run_gemini_generation(model_name, full_prompt)
    try:
        parsed = extract_json_from_text(raw)
        if "questions" not in parsed: 
             if isinstance(parsed, list): return {"quiz_title": "Assessment", "questions": parsed}
             return {"quiz_title": "Assessment", "questions": []}
        return parsed
    except Exception:
        return {"quiz_title": "Assessment", "questions": []}


# === YOUTUBE HELPERS ===
def search_youtube(query, max_results=20):
    if not YOUTUBE_API_KEY:
        print("YouTube API Key is not set.")
        return []

    try:
        youtube = googleapiclient.discovery.build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        request = youtube.search().list(
            part="snippet",
            q=f"{query} tutorial",
            type="video",
            maxResults=max_results,
            videoDefinition="high",
        )
        response = request.execute()

        videos = []
        for item in response.get("items", []):
            snippet = item["snippet"]
            videos.append(
                {
                    "video_id": item["id"]["videoId"],
                    "title": snippet["title"],
                    "description": snippet["description"],
                    "channelTitle": snippet["channelTitle"],
                }
            )
        return videos
    except Exception as e:
        print(f"An error occurred with YouTube API search: {e}")
        return []


# === DB HELPER: SAVE PIPELINE ===
@transaction.atomic
def save_course_pipeline(course_title, user, generated_modules, intermediate_quizzes, ultimate_quiz):
    print("DB: Saving course...")
    course = Course.objects.create(title=course_title, created_by=user)

    num_content_modules = len(generated_modules)
    num_test_modules = len(intermediate_quizzes)

    test_injection_points = []
    if num_test_modules > 0 and num_content_modules > 0:
        num_test_modules = min(num_test_modules, num_content_modules)
        modules_per_test = num_content_modules // num_test_modules
        for i in range(num_test_modules):
            injection_index = (i + 1) * modules_per_test - 1
            test_injection_points.append(injection_index)

    module_order = 1
    quiz_index = 0

    for i, module_data in enumerate(generated_modules):
        # 1. Save Content Module
        content_module = Module.objects.create(
            course=course,
            title=module_data["title"],
            order=module_order,
            module_type=Module.ModuleType.CONTENT,
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

        # 2. Inject Test Module
        if i in test_injection_points and quiz_index < len(intermediate_quizzes):
            quiz_data = intermediate_quizzes[quiz_index]
            quiz_index += 1
            
            test_module = Module.objects.create(
                course=course,
                title=quiz_data.get("quiz_title", f"Test: {module_data['title']}"),
                order=module_order,
                module_type=Module.ModuleType.ASSESSMENT,
            )
            module_order += 1

            quiz_obj = Quiz.objects.create(
                module=test_module,
                title=quiz_data.get("quiz_title", f"Test: {module_data['title']}"),
            )

            for k, q_data in enumerate(quiz_data.get("questions", [])):
                Question.objects.create(
                    quiz=quiz_obj,
                    question_text=q_data.get("question_text"),
                    options=q_data.get("options"),
                    correct_answer=q_data.get("correct_answer"),
                    order=k + 1,
                )

    # 3. Save Ultimate Test
    ultimate_module = Module.objects.create(
        course=course,
        title=ultimate_quiz.get("quiz_title", "Ultimate Final Test"),
        order=module_order,
        module_type=Module.ModuleType.ASSESSMENT,
    )
    ultimate_quiz_obj = Quiz.objects.create(
        module=ultimate_module, title=ultimate_quiz.get("quiz_title", "Ultimate Final Test")
    )
    for k, q_data in enumerate(ultimate_quiz.get("questions", [])):
        Question.objects.create(
            quiz=ultimate_quiz_obj,
            question_text=q_data.get("question_text"),
            options=q_data.get("options"),
            correct_answer=q_data.get("correct_answer"),
            order=k + 1,
        )

    return course


# ==============================================================================
#  AUTH & REGISTRATION VIEWS
# ==============================================================================

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer


# ==============================================================================
#  AI GENERATION VIEWS
# ==============================================================================

class CourseGenerateAPIView(APIView):
    """
    The new multi-stage AI Course Generation pipeline.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        prompt = request.data.get("prompt")
        num_content_modules = int(request.data.get("num_content_modules", 3))
        num_lessons_per_module = int(request.data.get("num_lessons_per_module", 3))
        num_test_modules = int(request.data.get("num_test_modules", 1))

        if not prompt:
            return Response({"error": "Prompt is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            print("✅ [1/5] Generating course outline...")
            module_outline = generate_course_outline(prompt, num_content_modules)

            generated_modules = []
            all_lesson_content = ""
            course_title = prompt

            print("✅ [2/5] Generating all lesson content (iteratively)...")
            for module_info in module_outline:
                module_title = module_info["title"]
                lesson_titles = generate_lesson_plan_for_module(module_title, prompt, num_lessons_per_module)
                generated_lessons = []
                module_content_blob = ""

                for lesson_info in lesson_titles:
                    lesson_title = lesson_info["title"]
                    
                    # 👇 --- FIX HERE --- 👇
                    # Include COURSE TITLE in search to prevent context loss
                    # e.g., "Setting up env Intro to Django tutorial" instead of "Setting up env tutorial"
                    video_candidates = search_youtube(f"{lesson_title} {course_title} tutorial", max_results=20)
                    # ----------------------
                    
                    lesson_data = generate_deep_lesson_content(
                        lesson_title, 
                        module_title, 
                        prompt, 
                        video_candidates
                    )

                    lesson_data["title"] = lesson_title
                    generated_lessons.append(lesson_data)
                    module_content_blob += f"Topic: {lesson_title}\nContent: {lesson_data.get('text_content', '')}\n\n"

                generated_modules.append({"title": module_title, "lessons": generated_lessons, "content_blob": module_content_blob})
                all_lesson_content += module_content_blob

            print(f"✅ [3/5] Generating {num_test_modules} intermediate quizzes...")
            intermediate_quizzes = []
            if num_test_modules > 0 and num_content_modules > 0:
                num_test_modules = min(num_test_modules, num_content_modules)
                modules_per_test = num_content_modules // num_test_modules

                for i in range(num_test_modules):
                    start_index = i * modules_per_test
                    end_index = (i + 1) * modules_per_test if (i < num_test_modules - 1) else num_content_modules
                    chunk_modules = generated_modules[start_index:end_index]
                    chunk_content = "".join([m["content_blob"] for m in chunk_modules])

                    if chunk_content:
                        quiz_title = f"Test: Modules {start_index+1}-{end_index}"
                        quiz_json = generate_quiz_from_content(chunk_content, 5, quiz_title)
                        intermediate_quizzes.append(quiz_json)

            print("✅ [4.5] Generating ultimate final test...")
            ultimate_quiz = generate_quiz_from_content(all_lesson_content, 10, f"Ultimate Final Test: {prompt}")

            print("✅ [5/5] Saving entire course to database...")
            new_course = save_course_pipeline(course_title, request.user, generated_modules, intermediate_quizzes, ultimate_quiz)

            print("🎉 Course generation complete!")
            serializer = CourseDetailSerializer(new_course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
@transaction.atomic
def generate_single_module(request, course_pk):
    try:
        course = Course.objects.get(pk=course_pk)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

    prompt = request.data.get("prompt")
    module_type = request.data.get("module_type", "CONTENT")

    if not prompt:
        return Response({"error": "Prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        last_module_order = course.modules.all().count()

        if module_type == "CONTENT":
            print(f"✅ [1/3] Generating single CONTENT module: {prompt}")
            num_lessons = int(request.data.get("num_lessons", 3))

            print("✅ [2/3] Generating lesson plan...")
            lesson_titles = generate_lesson_plan_for_module(prompt, course.title, num_lessons)

            generated_lessons = []
            for lesson_info in lesson_titles:
                lesson_title = lesson_info["title"]
                
                # 👇 --- FIX HERE --- 👇
                # Include COURSE TITLE in search
                video_candidates = search_youtube(f"{lesson_title} {course.title} tutorial", max_results=20)
                # ----------------------
                
                lesson_data = generate_deep_lesson_content(
                    lesson_title, 
                    prompt, 
                    course.title, 
                    video_candidates
                )

                lesson_data["title"] = lesson_title
                generated_lessons.append(lesson_data)

            print("✅ [3/3] Saving new module...")
            new_module = Module.objects.create(
                course=course,
                title=prompt,
                order=last_module_order + 1,
                module_type=Module.ModuleType.CONTENT,
            )

            for j, lesson_data in enumerate(generated_lessons):
                Lesson.objects.create(
                    module=new_module,
                    title=lesson_data.get("title", "Untitled Lesson"),
                    content=lesson_data.get("text_content", ""),
                    order=j + 1,
                    video_id=lesson_data.get("video_id"),
                )
        
        elif module_type == "ASSESSMENT":
            print(f"✅ [1/3] Generating single TEST module: {prompt}")
            quiz_json = generate_quiz_from_content(
                content_text=f"Generate a test based on this specific topic request: {prompt}", 
                num_questions=5, 
                suggested_title="" 
            )
            
            final_title = quiz_json.get("quiz_title", prompt)

            new_module = Module.objects.create(
                course=course,
                title=final_title,
                order=last_module_order + 1,
                module_type=Module.ModuleType.ASSESSMENT,
            )
            
            quiz_obj = Quiz.objects.create(
                module=new_module,
                title=final_title 
            )
            
            for k, q_data in enumerate(quiz_json.get("questions", [])):
                Question.objects.create(
                    quiz=quiz_obj,
                    question_text=q_data.get("question_text"),
                    options=q_data.get("options"),
                    correct_answer=q_data.get("correct_answer"),
                    order=k + 1,
                )

        serializer = CourseDetailSerializer(course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==============================================================================
#  CRUD VIEWS
# ==============================================================================
class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
            return Course.objects.all().order_by('-created_at')
        
        return Course.objects.filter(
            Q(status='PUBLISHED') | Q(created_by=user)
        ).order_by('-created_at')


class CourseDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
            return Course.objects.all()
        
        return Course.objects.filter(
            Q(status='PUBLISHED') | Q(created_by=user)
        )

class ModuleCreateAPIView(generics.CreateAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class ModuleDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Module.objects.all()
    serializer_class = ModuleWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class LessonCreateAPIView(generics.CreateAPIView):
    queryset = Lesson.objects.all()
    serializer_class = LessonWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class LessonDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Lesson.objects.all()
    serializer_class = LessonWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class QuizCreateAPIView(generics.CreateAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class QuizDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class QuestionCreateAPIView(generics.CreateAPIView):
    queryset = Question.objects.all()
    serializer_class = QuestionWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

class QuestionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Question.objects.all()
    serializer_class = QuestionWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]