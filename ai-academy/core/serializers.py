from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Course, Module, Lesson, Profile

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
        # Add custom claims
        token['username'] = user.username
        # Add role from the user's profile
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
        # Automatically create a student profile for the new user
        Profile.objects.create(user=user, role=Profile.Role.STUDENT)
        return user

# =====================================================================
#  NESTED SERIALIZERS FOR COURSE STRUCTURE
# =====================================================================

class LessonSerializer(serializers.ModelSerializer):
    """
    Serializes a single Lesson, including its content, video, and MCQ data.
    This is the deepest level of nesting.
    """
    class Meta:
        model = Lesson
        fields = [
            'id', 
            'title', 
            'content', 
            'video_id', 
            'mcq_question', 
            'mcq_options', 
            'mcq_correct_answer',
            'order'
        ]

class ModuleSerializer(serializers.ModelSerializer):
    """
    Serializes a Module, nesting all of its related Lessons inside.
    """
    # This is the key part: it nests a list of Lessons.
    lessons = LessonSerializer(many=True, read_only=True) 

    class Meta:
        model = Module
        fields = ['id', 'title', 'order', 'lessons']

class CourseDetailSerializer(serializers.ModelSerializer):
    """
    The main serializer that represents the entire course,
    nesting all of its Modules (which in turn nest their Lessons).
    """
    # This nests a list of Modules.
    modules = ModuleSerializer(many=True, read_only=True) 
    # Provides the username of the course creator.
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