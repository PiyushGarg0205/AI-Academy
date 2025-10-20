# core/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Course, Module, Video, MCQ, Profile

# This serializer is correct and should be kept for user registration.
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        Profile.objects.create(user=user, role=Profile.Role.STUDENT)
        return user

# =====================================================================
# ADD THE NEW NESTED SERIALIZERS BELOW
# =====================================================================

class MCQSerializer(serializers.ModelSerializer):
    """Serializes a single MCQ object."""
    class Meta:
        model = MCQ
        fields = ['id', 'question', 'options', 'correct_answer']

class VideoSerializer(serializers.ModelSerializer):
    """Serializes a Video, nesting all its related MCQs inside."""
    mcqs = MCQSerializer(many=True, read_only=True) # Nests a list of MCQs

    class Meta:
        model = Video
        fields = ['id', 'title', 'url', 'mcqs']

class ModuleSerializer(serializers.ModelSerializer):
    """Serializes a Module, nesting all its related Videos inside."""
    videos = VideoSerializer(many=True, read_only=True) # Nests a list of Videos

    class Meta:
        model = Module
        fields = ['id', 'title', 'order', 'videos']

class CourseDetailSerializer(serializers.ModelSerializer):
    """The main serializer that represents the entire course structure."""
    modules = ModuleSerializer(many=True, read_only=True) # Nests a list of Modules
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'status', 'created_by', 'modules']