from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Avg
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Ensure these are imported from your models.py
from .models import (
    Course, Module, Lesson, Profile, Quiz, Question, Review, 
    ExplanationAttempt, UserProgress
)

# =====================================================================
#  AUTHENTICATION & USER SERIALIZERS
# =====================================================================

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.profile.role 
        return token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        Profile.objects.create(user=user, role=Profile.Role.STUDENT)
        return user

# =====================================================================
#  REVIEW SERIALIZER
# =====================================================================

class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'course', 'user', 'username', 'rating', 'comment', 'created_at']
        read_only_fields = ['user', 'created_at']

# =====================================================================
#  EXPLANATION / FEYNMAN SERIALIZER (NEW)
# =====================================================================

class ExplanationAttemptSerializer(serializers.ModelSerializer):
    """
    Used to return the results of the AI evaluation to the frontend.
    """
    class Meta:
        model = ExplanationAttempt
        fields = ['id', 'lesson', 'transcript', 'feedback', 'is_passed', 'created_at']
        read_only_fields = ['transcript', 'feedback', 'is_passed', 'created_at']

# =====================================================================
#  READ-ONLY NESTED SERIALIZERS (For Student Dashboard)
# =====================================================================

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'content', 'video_id', 'order']

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'correct_answer', 'order']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True) 

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'questions']

class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True) 
    quiz = QuizSerializer(read_only=True)
    
    # --- NEW FIELDS FOR LOCKING LOGIC ---
    is_locked = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'order', 'module_type', 'lessons', 'quiz', 'is_locked', 'is_completed']

    def get_is_completed(self, obj):
        """Checks if the current user has completed this module."""
        user = self.context.get('request').user
        if not user or not user.is_authenticated:
            return False
        return UserProgress.objects.filter(user=user, module=obj, is_completed=True).exists()

    def get_is_locked(self, obj):
        """
        Determines if the module is locked.
        Locked if the *previous* module is not completed.
        """
        user = self.context.get('request').user
        if not user or not user.is_authenticated:
            return True # Lock everything for guests
        
        # Admin bypass
        if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
            return False

        # 1. First module is always unlocked
        if obj.order == 1:
            return False

        # 2. Find the immediately preceding module
        prev_module = Module.objects.filter(
            course=obj.course, 
            order__lt=obj.order
        ).order_by('-order').first()

        # If no previous module exists (edge case), it's unlocked
        if not prev_module:
            return False

        # 3. Check if previous module is completed
        is_prev_done = UserProgress.objects.filter(
            user=user, 
            module=prev_module, 
            is_completed=True
        ).exists()

        return not is_prev_done

class CourseDetailSerializer(serializers.ModelSerializer):
    """
    The main serializer for the entire course structure.
    Includes modules, lessons, and the calculated Average Rating.
    """
    modules = ModuleSerializer(many=True, read_only=True) 
    creator_username = serializers.CharField(source='created_by.username', read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 
            'title', 
            'status', 
            'creator_username', 
            'average_rating', 
            'modules'
        ]

    def get_average_rating(self, obj):
        aggregate = obj.reviews.aggregate(Avg('rating'))
        avg = aggregate['rating__avg']
        return round(avg, 1) if avg else 0

# =====================================================================
#  WRITEABLE SERIALIZERS (For Admin Editor)
# =====================================================================

class ModuleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'order', 'module_type']

class LessonWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'module', 'title', 'content', 'video_id', 'order']

class QuizWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'module', 'title']

class QuestionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'quiz', 'question_text', 'options', 'correct_answer', 'order']