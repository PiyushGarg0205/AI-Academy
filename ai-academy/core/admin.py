# core/admin.py
from django.contrib import admin
from .models import Profile, Course, Module, Video, MCQ

# We define the inlines from the inside out: MCQ -> Video -> Module -> Course
class MCQInline(admin.TabularInline):
    model = MCQ
    extra = 1

class VideoInline(admin.TabularInline):
    model = Video
    # The 'inlines' attribute is not valid for TabularInline itself.
    # We will handle nesting by customizing the VideoAdmin if needed,
    # but for now, we'll keep it simple. MCQs will appear on the Video change page.
    extra = 1

class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1

# Now we define the main admin view for the Course model
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'status', 'created_at')
    list_filter = ('status', 'created_by')
    inlines = [ModuleInline]

# A custom admin for Videos to show MCQs
class VideoAdmin(admin.ModelAdmin):
    inlines = [MCQInline]

# Register your models with the custom admin classes
admin.site.register(Course, CourseAdmin)
admin.site.register(Profile)
admin.site.register(Module) # Registering Module, Video, MCQ is good for direct access
admin.site.register(Video, VideoAdmin)
admin.site.register(MCQ)