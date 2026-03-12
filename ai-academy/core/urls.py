from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView,
    CourseGenerateAPIView,
    CourseListAPIView,
    CourseDetailAPIView,
    generate_single_module,
    ModuleCreateAPIView,
    ModuleDetailAPIView,
    LessonCreateAPIView,
    LessonDetailAPIView,
    QuizCreateAPIView,
    QuizDetailAPIView,
    QuestionCreateAPIView,
    QuestionDetailAPIView,
    ReviewListCreateView,
    # --- NEW IMPORTS ---
    ExplainOrFailAPIView,
    QuizSubmissionAPIView
)

urlpatterns = [
    # --- Auth URLs ---
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- Course URLs ---
    path('courses/generate/', CourseGenerateAPIView.as_view(), name='course-generate'),
    path('courses/', CourseListAPIView.as_view(), name='course-list'),
    path('courses/<int:pk>/', CourseDetailAPIView.as_view(), name='course-detail'),
    
    # --- AI Generator URL ---
    path('courses/<int:course_pk>/generate-module/', generate_single_module, name='generate-single-module'),
    
    # --- MODULE CRUD URLS ---
    path('modules/', ModuleCreateAPIView.as_view(), name='module-create'),
    path('modules/<int:pk>/', ModuleDetailAPIView.as_view(), name='module-detail'),
    
    # --- NEW: QUIZ SUBMISSION (Unlocks next module) ---
    path('modules/<int:module_id>/submit-quiz/', QuizSubmissionAPIView.as_view(), name='submit-quiz'),

    # --- LESSON CRUD URLS ---
    path('lessons/', LessonCreateAPIView.as_view(), name='lesson-create'),
    path('lessons/<int:pk>/', LessonDetailAPIView.as_view(), name='lesson-detail'),

    # --- NEW: EXPLAIN OR FAIL (Feynman Technique Audio Upload) ---
    path('lessons/<int:lesson_id>/explain/', ExplainOrFailAPIView.as_view(), name='explain-lesson'),

    # --- QUIZ CRUD URLS (Admin/Editor) ---
    path('quizzes/', QuizCreateAPIView.as_view(), name='quiz-create'),
    path('quizzes/<int:pk>/', QuizDetailAPIView.as_view(), name='quiz-detail'),

    # --- QUESTION CRUD URLS (Admin/Editor) ---
    path('questions/', QuestionCreateAPIView.as_view(), name='question-create'),
    path('questions/<int:pk>/', QuestionDetailAPIView.as_view(), name='question-detail'),
    
    # --- REVIEWS URL ---
    path('reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
]