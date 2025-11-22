from django.db import models
from django.contrib.auth.models import User

# core/models.py

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
    # --- NEW ---
    class ModuleType(models.TextChoices):
        CONTENT = 'CONTENT', 'Content'
        ASSESSMENT = 'ASSESSMENT', 'Assessment'
    # -----------

    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField()
    
    # --- NEW ---
    module_type = models.CharField(
        max_length=20, 
        choices=ModuleType.choices, 
        default=ModuleType.CONTENT
    )
    # -----------

    class Meta:
        ordering = ['order']

    def __str__(self):
        # Updated string representation to be more informative
        return f"[{self.course.title}] - {self.title} ({self.get_module_type_display()})"

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField() # The main text content
    order = models.PositiveIntegerField(default=0)
    video_id = models.CharField(max_length=100, blank=True, null=True) # Optional YouTube video ID

    # --- REMOVED ---
    # The single mcq_question, mcq_options, and mcq_correct_answer fields
    # have been removed. This logic is now handled by the new Quiz/Question models.
    # ---------------

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

# --- NEW MODEL ---
class Quiz(models.Model):
    """
    A quiz, which is linked to a single 'ASSESSMENT' type Module.
    """
    # A module can only have one quiz, and a quiz belongs to only one module
    module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name='quiz')
    title = models.CharField(max_length=255, help_text="e.g., Module 1 Test")

    def __str__(self):
        return self.title

# --- NEW MODEL ---
class Question(models.Model):
    """
    A single multiple-choice question within a Quiz.
    """
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    # Stores a list of strings, e.g., ["Answer 1", "Answer 2", "Answer 3"]
    options = models.JSONField() 
    # Stores the correct answer string, e.g., "Answer 2"
    correct_answer = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.question_text[:50]