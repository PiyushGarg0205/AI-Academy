# core/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView,
    CourseGenerateAPIView,
)

urlpatterns = [
    # --- Auth URLs ---
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- Course URLs ---
    path('courses/generate/', CourseGenerateAPIView.as_view(), name='course-generate'),
    # The old 'courses/create/' path has been removed.
]