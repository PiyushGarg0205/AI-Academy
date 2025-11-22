from django.contrib import admin
from .models import Profile, Course, Module, Lesson, Quiz, Question

# Unregister the old, non-existent models if they were there
# (This is good practice but optional, the main fix is the new registrations)
# admin.site.unregister(Video)
# admin.site.unregister(MCQ)

# Register the Profile model
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    search_fields = ('user__username',)

# Define inlines to allow editing related models within their parent

class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1 # Show one extra blank form for a new lesson

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1 # Show one extra blank form for a new question

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'module')
    inlines = [QuestionInline] # Allow editing questions from the quiz page

class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1 # Show one extra blank form for a new module

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'created_by__username')
    inlines = [ModuleInline] # Allow editing modules from the course page

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order', 'module_type')
    list_filter = ('module_type', 'course')
    search_fields = ('title',)
    # Conditionally show either Lesson or Quiz inlines based on type
    # This is advanced; for simplicity, we can just show lessons.
    inlines = [LessonInline] # You could add logic here to show QuizInline instead

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'order')
    list_filter = ('module',)
    search_fields = ('title',)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'quiz', 'order')
    list_filter = ('quiz',)
    search_fields = ('question_text',)