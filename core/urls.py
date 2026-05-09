from django.urls import path
from .views import RegisterView, UploadPYQView, DownloadPYQView, RequestPasswordResetView, ResetPasswordView, LoginView, RefreshView, LogoutView


urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("upload/", UploadPYQView.as_view(), name="upload_pyq"),
    path("download/", DownloadPYQView.as_view(), name="download_pyq"),
    path("auth/forgot-password/", RequestPasswordResetView.as_view(), name="request_password_reset"),
    path("auth/reset-password/<uid>/<token>/", ResetPasswordView.as_view(), name="reset_password"),
]