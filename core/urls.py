from django.urls import path
from .views import (
    RegisterView,
    UploadPYQView,
    DownloadPYQView,
    DownloadLinksView,
    RequestPasswordResetView,
    ResetPasswordView,
    LoginView,
    RefreshView,
    LogoutView,
    HealthCheckView,
    SubjectListView,
    SubjectRequestCreateView,
    VerificationStatusView,
    VerificationSubmitView,
    VerificationResubmitView,
    VerificationListView,
    VerificationDetailView,
    VerificationApproveView,
    VerificationRejectView,
    VerificationDeleteDocumentView,
    PYQUploadHistoryView,
    PYQDownloadUrlView,
    AdminSubjectRequestListView,
    AdminSubjectRequestApproveView,
    AdminSubjectRequestRejectView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health"),
    path("subjects/", SubjectListView.as_view(), name="subject_list"),
    path("subjects/request/", SubjectRequestCreateView.as_view(), name="subject_request_create"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("upload/", UploadPYQView.as_view(), name="upload_pyq"),
    path("download/", DownloadPYQView.as_view(), name="download_pyq"),
    path("download/links/", DownloadLinksView.as_view(), name="download_links"),
    path("auth/forgot-password/", RequestPasswordResetView.as_view(), name="request_password_reset"),
    path("auth/reset-password/<uid>/<token>/", ResetPasswordView.as_view(), name="reset_password"),

    # Student verification endpoints
    path("verification/status/", VerificationStatusView.as_view(), name="verification_status"),
    path("verification/submit/", VerificationSubmitView.as_view(), name="verification_submit"),
    path("verification/resubmit/", VerificationResubmitView.as_view(), name="verification_resubmit"),

    # Admin verification management endpoints
    path("admin-api/verifications/", VerificationListView.as_view(), name="admin_verification_list"),
    path("admin-api/verifications/<int:pk>/", VerificationDetailView.as_view(), name="admin_verification_detail"),
    path("admin-api/verifications/<int:pk>/approve/", VerificationApproveView.as_view(), name="admin_verification_approve"),
    path("admin-api/verifications/<int:pk>/reject/", VerificationRejectView.as_view(), name="admin_verification_reject"),
    path("admin-api/verifications/<int:pk>/document/", VerificationDeleteDocumentView.as_view(), name="admin_verification_delete_document"),

    # Admin unlisted subject approval endpoints
    path("admin-api/subject-requests/", AdminSubjectRequestListView.as_view(), name="admin_subject_request_list"),
    path("admin-api/subject-requests/<int:pk>/approve/", AdminSubjectRequestApproveView.as_view(), name="admin_subject_request_approve"),
    path("admin-api/subject-requests/<int:pk>/reject/", AdminSubjectRequestRejectView.as_view(), name="admin_subject_request_reject"),

    # Admin PYQ upload history endpoints
    path("admin-api/pyqs/history/", PYQUploadHistoryView.as_view(), name="admin_pyq_upload_history"),
    path("admin-api/pyqs/<int:pk>/download-url/", PYQDownloadUrlView.as_view(), name="admin_pyq_download_url"),
]