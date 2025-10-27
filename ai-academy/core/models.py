from django.db import models
from django.contrib.auth.models import User

# core/models.py
from django.db import models
from django.contrib.auth.models import User

# Your Profile model should be here
class Profile(models.Model):
    """Extends the built-in User model to add roles."""
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        STUDENT = 'STUDENT', 'Student'

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.STUDENT)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Course(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PUBLISHED = 'PUBLISHED', 'Published'

    title = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Module(models.Model):
    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class Video(models.Model):
    module = models.ForeignKey(Module, related_name='videos', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    url = models.URLField()
    order = models.PositiveIntegerField()

    def __str__(self):
        return self.title

class MCQ(models.Model):
    video = models.ForeignKey(Video, related_name='mcqs', on_delete=models.CASCADE)
    question = models.TextField()
    options = models.JSONField()
    correct_answer = models.CharField(max_length=255)

    def __str__(self):
        return self.question[:50]
    
class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField() # The main text content
    order = models.PositiveIntegerField(default=0)

    # --- NEW FIELDS ---
    video_id = models.CharField(max_length=100, blank=True, null=True) # Optional YouTube video ID
    mcq_question = models.TextField(blank=True, null=True)
    mcq_options = models.JSONField(blank=True, null=True) # Will store a list like ["A", "B", "C"]
    mcq_correct_answer = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title