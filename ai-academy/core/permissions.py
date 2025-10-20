# core/permissions.py
from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        # Checks if the user is logged in, has a profile, and the role is 'ADMIN'
        return request.user and request.user.is_authenticated and request.user.profile.role == 'ADMIN'