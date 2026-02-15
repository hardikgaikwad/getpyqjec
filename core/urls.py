from django.urls import path
from .views import RegisterView, UploadPYQView, DownloadPYQView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("upload/", UploadPYQView.as_view(), name="upload_pyq"),
    path("download/", DownloadPYQView.as_view(), name="download_pyq")
]