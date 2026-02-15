from django.contrib import admin
from django.urls import path, include, re_path
from core.views import react_app


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("core.urls")),
    re_path(r"^.*$", react_app)
]
