# core/permissions.py
from rest_framework import permissions

# core/permissions.py
from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admins to edit objects,
    but allow any authenticated user to view them.
    """
    def has_permission(self, request, view):
        # First, ensure the user is logged in. If not, deny access.
        if not request.user or not request.user.is_authenticated:
            return False

        # If the request is a "safe" method (GET, HEAD, OPTIONS), allow access.
        # This lets students view the course details.
        if request.method in permissions.SAFE_METHODS:
            return True

        # If the request is an "unsafe" method (POST, PUT, PATCH, DELETE),
        # only allow it if the user is an admin.
        return hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN'

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users (used for course generation).
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'ADMIN'
        )