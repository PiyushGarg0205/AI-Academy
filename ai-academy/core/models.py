from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

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
    class ModuleType(models.TextChoices):
        CONTENT = 'CONTENT', 'Content'
        ASSESSMENT = 'ASSESSMENT', 'Assessment'

    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = models.PositiveIntegerField()
    
    module_type = models.CharField(
        max_length=20, 
        choices=ModuleType.choices, 
        default=ModuleType.CONTENT
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"[{self.course.title}] - {self.title} ({self.get_module_type_display()})"

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField() # The main text content
    order = models.PositiveIntegerField(default=0)
    video_id = models.CharField(max_length=100, blank=True, null=True) # Optional YouTube video ID

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class Quiz(models.Model):
    """
    A quiz, which is linked to a single 'ASSESSMENT' type Module.
    """
    module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name='quiz')
    title = models.CharField(max_length=255, help_text="e.g., Module 1 Test")

    def __str__(self):
        return self.title

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

class Review(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent a user from reviewing the same course twice
        unique_together = ('course', 'user')

    def __str__(self):
        return f"{self.rating} stars - {self.course.title}"

# =========================================================
#  NEW MODELS FOR 'EXPLAIN OR FAIL' & 'LOCKING' FEATURES
# =========================================================

class ExplanationAttempt(models.Model):
    """
    Stores the user's explanation attempt (text-based).
    Evaluated by AI.
    """
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='explanations')
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # Optional: keep audio for future use (not required now)
    audio_file = models.FileField(
        upload_to='explanations/audio/',
        null=True,
        blank=True
    )

    transcript = models.TextField(
        help_text="User provided explanation transcript"
    )

    # 🔒 REQUIRED FOR IDEMPOTENCY & RATE-LIMIT SAFETY
    transcript_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text="SHA256 hash of normalized transcript"
    )

    feedback = models.TextField(
        blank=True,
        help_text="AI feedback on the explanation"
    )

    is_passed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "lesson", "transcript_hash"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {'PASS' if self.is_passed else 'FAIL'}"

class UserProgress(models.Model):
    """
    Tracks which modules a user has completed.
    Used to implement the Locking Mechanism (Next module locked until previous is done).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE) # Added for easier querying
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'module') # A user has one progress record per module

    def __str__(self):
        return f"{self.user.username} - {self.module.title} - {'Done' if self.is_completed else 'Pending'}"