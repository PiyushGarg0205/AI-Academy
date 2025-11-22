from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Course, Module, Lesson, Profile, Quiz, Question

# =====================================================================
#  AUTHENTICATION & USER SERIALIZERS
# =====================================================================

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Customizes the JWT token to include the user's role.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.profile.role 
        return token

class UserSerializer(serializers.ModelSerializer):
    """
    Handles user registration, creating both a User and a Profile.
    """
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
#  READ-ONLY NESTED SERIALIZERS (For Student Dashboard)
# =====================================================================

class LessonSerializer(serializers.ModelSerializer):
    """
    Serializes a single Lesson. (Now simpler)
    """
    class Meta:
        model = Lesson
        fields = [
            'id', 
            'title', 
            'content', 
            'video_id', 
            'order'
        ]

# --- NEW ---
class QuestionSerializer(serializers.ModelSerializer):
    """
    Serializes a single Quiz Question.
    """
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'options', 'correct_answer', 'order']

# --- NEW ---
class QuizSerializer(serializers.ModelSerializer):
    """
    Serializes a Quiz, nesting all of its Questions.
    """
    questions = QuestionSerializer(many=True, read_only=True) 

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'questions']

class ModuleSerializer(serializers.ModelSerializer):
    """
    Serializes a Module, nesting EITHER its Lessons OR its Quiz
    based on the module_type.
    """
    lessons = LessonSerializer(many=True, read_only=True) 
    quiz = QuizSerializer(read_only=True) # This will be null if it's a CONTENT module

    class Meta:
        model = Module
        # Added 'module_type' and 'quiz'
        fields = ['id', 'title', 'order', 'module_type', 'lessons', 'quiz']

class CourseDetailSerializer(serializers.ModelSerializer):
    """
    The main serializer for the entire course structure.
    This will automatically pick up the changes from ModuleSerializer.
    """
    modules = ModuleSerializer(many=True, read_only=True) 
    creator_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 
            'title', 
            'status', 
            'creator_username', 
            'modules'
        ]

# =====================================================================
#  WRITEABLE SERIALIZERS (For Admin Editor)
# =====================================================================

class ModuleWriteSerializer(serializers.ModelSerializer):
    """
    Simple serializer for CREATING/UPDATING a Module.
    """
    class Meta:
        model = Module
        # Added 'module_type'
        fields = ['id', 'course', 'title', 'order', 'module_type']

class LessonWriteSerializer(serializers.ModelSerializer):
    """
    Simple serializer for CREATING/UPDATING a Lesson.
    """
    class Meta:
        model = Lesson
        # MCQ fields are now removed
        fields = ['id', 'module', 'title', 'content', 'video_id', 'order']

# --- NEW ---
class QuizWriteSerializer(serializers.ModelSerializer):
    """
    Simple serializer for CREATING/UPDATING a Quiz.
    """
    class Meta:
        model = Quiz
        fields = ['id', 'module', 'title']

# --- NEW ---
class QuestionWriteSerializer(serializers.ModelSerializer):
    """
    Simple serializer for CREATING/UPDATING a Question.
    """
    class Meta:
        model = Question
        fields = ['id', 'quiz', 'question_text', 'options', 'correct_answer', 'order']