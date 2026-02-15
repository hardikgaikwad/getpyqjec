from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ("rno", "email", "name", "role", "is_staff")
    list_filter = ("role", )
    fieldsets = (
        (None, {"fields": ("rno", "password")}),
        ("Personal info", {"fields": ("name", "email", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("rno", "email", "name", "role", "password1", "password2"),
        }),
    )
    search_fields = ("rno", "email")
    ordering = ("rno",)