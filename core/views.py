import hashlib
import json
import logging
import urllib.parse
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from io import BytesIO

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.db import transaction
from utils.email_service import (
    send_password_reset_email,
    send_verification_approved_email,
    send_verification_rejected_email,
    send_subject_approved_email,
    send_subject_rejected_email,
)
from django.http import FileResponse, JsonResponse
from django.shortcuts import render
from django.template.exceptions import TemplateDoesNotExist
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from django.db.models import Q

from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from utils.pdf import compile_pdfs_from_buffers
from utils.r2_storage import (
    R2NoSuchKeyError,
    R2StorageError,
    get_pyq_storage,
    get_verification_storage,
)

from .curriculum import get_expected_subjects, SUBJECT_CODE_TO_NAME, get_subject_name_by_code
from .models import PYQ, StudentVerification, Subject, SubjectRequest
from .permissions import IsAdminUser, IsVerifiedStudent
from .serializers import (
    PYQUploadHistorySerializer,
    RegisterSerializer,
    SubjectRequestSerializer,
    VerificationAdminDetailSerializer,
    VerificationAdminListSerializer,
    VerificationStatusSerializer,
)

logger = logging.getLogger(__name__)

User = get_user_model()
token_generator = PasswordResetTokenGenerator()

MAX_PDF_SIZE_MB = 10


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_verification_status(user):
    """Get the user's verification status string."""
    try:
        return user.verification.status
    except StudentVerification.DoesNotExist:
        return 'unverified'


def _user_response_data(user):
    """Standard user data dict included in auth responses."""
    return {
        'rno': user.rno,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'is_staff': bool(user.is_staff),
        'is_superuser': bool(getattr(user, 'is_superuser', False)),
        'verification_status': _get_verification_status(user),
    }



def _set_refresh_cookie(response, refresh_token):
    is_production = not settings.DEBUG
    response.set_cookie(
        key="refresh_token",
        value=str(refresh_token),
        httponly=True,
        secure=is_production,
        samesite="None" if is_production else "Lax",
        path="/",
    )


def _delete_refresh_cookie(response):
    is_production = not settings.DEBUG
    response.delete_cookie(
        key="refresh_token",
        path="/",
        samesite="None" if is_production else "Lax",
    )


def react_app(request):
    try:
        return render(request, "index.html")
    except TemplateDoesNotExist:
        return JsonResponse({
            "status": "healthy",
            "message": "GetPYQ JEC API is running.",
            "endpoints": {
                "auth": "/auth/",
                "upload": "/upload/",
                "download": "/download/",
                "admin": "/admin/",
            },
        })


# ─── Health Check ─────────────────────────────────────────────────────────────

class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return JsonResponse({"status": "healthy"})


# ─── Subjects API ─────────────────────────────────────────────────────────────

class SubjectListView(APIView):
    """
    GET /subjects/?branch=IT&semester=7
    Returns active (current) and past subjects for the given branch and semester.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        branch = request.GET.get("branch", "").strip().upper()
        semester = request.GET.get("semester", "").strip()

        if not branch or not semester:
            return Response(
                {"error": "Both 'branch' and 'semester' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            semester = int(semester)
            if not (1 <= semester <= 8):
                raise ValueError()
        except ValueError:
            return Response(
                {"error": "Semester must be an integer between 1 and 8."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branch_aliases = [branch]
        if branch == "CS":
            branch_aliases.append("CSE")
        elif branch == "CSE":
            branch_aliases.append("CS")

        if semester <= 2:
            branch_aliases.extend(["CommonForAllBranches", "COMMONFORALLBRANCHES"])
            sem_filter = [1, 2]
        else:
            sem_filter = [semester]

        current_qs = Subject.objects.filter(
            branch__in=branch_aliases,
            semester__in=sem_filter,
            is_current=True,
        ).order_by("code")

        past_qs = Subject.objects.filter(
            branch__in=branch_aliases,
            semester__in=sem_filter,
            is_current=False,
        ).order_by("code")

        seen_codes = set()
        current_subjects = []
        for s in current_qs:
            c = s.code.strip().upper()
            if c not in seen_codes:
                seen_codes.add(c)
                current_subjects.append({"code": s.code, "name": s.name, "is_current": True})

        past_subjects = []
        for s in past_qs:
            c = s.code.strip().upper()
            if c not in seen_codes:
                seen_codes.add(c)
                past_subjects.append({"code": s.code, "name": s.name, "is_current": False})

        # Also include any distinct subject codes from uploaded PYQs if not already present
        existing_codes = {s["code"].upper() for s in current_subjects} | {s["code"].upper() for s in past_subjects}
        extra_pyq_codes = (
            PYQ.objects.filter(branch__in=branch_aliases, semester__in=sem_filter)
            .exclude(subject_code__in=existing_codes)
            .values_list("subject_code", flat=True)
            .distinct()
        )
        for code in extra_pyq_codes:
            clean_code = code.strip().upper()
            if clean_code not in existing_codes:
                existing_codes.add(clean_code)
                name = get_subject_name_by_code(clean_code, clean_code)
                past_subjects.append({"code": clean_code, "name": name, "is_current": False})

        return Response({
            "branch": branch,
            "semester": semester,
            "current_subjects": current_subjects,
            "past_subjects": past_subjects,
        })


class SubjectRequestCreateView(APIView):
    """
    POST /subjects/request/
    Allows authenticated students to submit a request for an unlisted or past subject.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        branch = request.data.get("branch", "").strip()
        semester = request.data.get("semester")
        code = request.data.get("code", "").strip().upper()
        name = request.data.get("name", "").strip()

        if not branch or not semester or not code or not name:
            return Response(
                {"error": "Branch, semester, subject code, and subject name are all required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            semester = int(semester)
            if not (1 <= semester <= 8):
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {"error": "Semester must be an integer between 1 and 8."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branch_aliases = [branch]
        if branch == "CS":
            branch_aliases.append("CSE")
        elif branch == "CSE":
            branch_aliases.append("CS")

        if semester <= 2:
            branch_aliases.extend(["CommonForAllBranches", "COMMONFORALLBRANCHES"])

        # Check if already present in Subject database
        if Subject.objects.filter(branch__in=branch_aliases, semester=semester, code__iexact=code).exists():
            return Response(
                {"error": f"Subject with code '{code}' already exists in the curriculum for {branch} Semester {semester}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already pending review
        if SubjectRequest.objects.filter(
            branch__in=branch_aliases,
            semester=semester,
            code__iexact=code,
            status="pending",
        ).exists():
            return Response(
                {"error": f"A request for subject code '{code}' in {branch} Semester {semester} is already pending admin review."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject_req = SubjectRequest.objects.create(
            user=request.user,
            branch=branch,
            semester=semester,
            code=code,
            name=name,
            status="pending",
        )

        serializer = SubjectRequestSerializer(subject_req)
        return Response(
            {
                "message": f"Request to add '{code} - {name}' submitted successfully. It will be reviewed by an administrator.",
                "request": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Authentication ───────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        response = Response({
            "access": str(refresh.access_token),
            "user": _user_response_data(user),
        }, status=status.HTTP_201_CREATED)

        _set_refresh_cookie(response, refresh)
        return response


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        rno = request.data.get("rno")
        password = request.data.get("password")

        user = authenticate(request, username=rno, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "access": str(refresh.access_token),
                "user": _user_response_data(user),
            },
            status=status.HTTP_200_OK,
        )

        _set_refresh_cookie(response, refresh)
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response({"error": "No refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            access = str(refresh.access_token)
            return Response({"access": access}, status=status.HTTP_200_OK)
        except TokenError as e:
            logger.warning(f"TokenError on refresh: {e}")
            return Response({"error": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"message": "Logged out"}, status=status.HTTP_200_OK)
        _delete_refresh_cookie(response)
        return response


# ─── PYQ Upload (R2) ─────────────────────────────────────────────────────────

class UploadPYQView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated(), IsVerifiedStudent()]

    def get(self, request):
        branch = request.GET.get("branch")
        semester = request.GET.get("semester")
        subject_code = request.GET.get("subject_code")

        if not all([branch, semester, subject_code]):
            return Response(
                {"error": "Missing branch, semester, or subject_code query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            semester = int(semester)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid semester."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branch_clean = branch.strip()
        subject_code_clean = subject_code.strip().upper()

        is_common_sem = (semester <= 2) or (branch_clean.upper() in ("COMMONFORALLBRANCHES", "COMMON FOR ALL BRANCHES"))
        if is_common_sem:
            query_filter = {
                "branch__in": ["CommonForAllBranches", "COMMONFORALLBRANCHES"],
                "semester__in": [1, 2],
                "subject_code": subject_code_clean,
            }
        else:
            branch_aliases = [branch_clean]
            if branch_clean.upper() == "CS":
                branch_aliases.append("CSE")
            elif branch_clean.upper() == "CSE":
                branch_aliases.append("CS")

            query_filter = {
                "branch__in": branch_aliases,
                "semester": semester,
                "subject_code": subject_code_clean,
            }

        pyqs = (
            PYQ.objects.filter(**query_filter)
            .exclude(r2_object_key="")
            .filter(r2_object_key__isnull=False)
            .values("year", "exam_session")
            .distinct()
        )

        uploaded = [
            {
                "year": p["year"],
                "session": p["exam_session"].strip().capitalize(),
                "exam_session": p["exam_session"].strip().capitalize(),
            }
            for p in pyqs
        ]

        return Response({"uploaded": uploaded}, status=status.HTTP_200_OK)

    def post(self, request):
        branch = request.POST.get("branch")
        semester = request.POST.get("semester")
        subject_code = request.POST.get("subject_code")
        year = request.POST.get("year")
        exam_session = request.POST.get("exam_session")
        file = request.FILES.get("file")

        if not all([branch, semester, subject_code, year, exam_session, file]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not file.name.lower().endswith(".pdf"):
            return Response(
                {"error": "Only PDF files are allowed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > MAX_PDF_SIZE_MB * 1024 * 1024:
            return Response(
                {"error": f"PDF exceeds {MAX_PDF_SIZE_MB}MB limit"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            branch = branch.strip().upper()
            semester = int(semester)
            subject_code = subject_code.strip().upper()
            year = int(year)
            exam_session = exam_session.strip().capitalize()
            if exam_session not in ("April", "December"):
                raise ValueError("Exam session must be 'April' or 'December'")
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_common_sem = (semester <= 2) or (branch in ("COMMONFORALLBRANCHES", "COMMON FOR ALL BRANCHES"))
        if is_common_sem:
            branch = "COMMONFORALLBRANCHES"
            duplicate_filter = {
                "branch__in": ["CommonForAllBranches", "COMMONFORALLBRANCHES"],
                "semester__in": [1, 2],
                "subject_code": subject_code,
                "year": year,
                "exam_session": exam_session,
            }
        else:
            branch_aliases = [branch]
            if branch == "CS":
                branch_aliases.append("CSE")
            elif branch == "CSE":
                branch_aliases.append("CS")
            duplicate_filter = {
                "branch__in": branch_aliases,
                "semester": semester,
                "subject_code": subject_code,
                "year": year,
                "exam_session": exam_session,
            }

        if PYQ.objects.filter(**duplicate_filter).exists():
            return Response(
                {"error": "PYQ already exists for this subject/year/session"},
                status=status.HTTP_409_CONFLICT,
            )

        # Validate PDF magic header
        file_bytes = file.read()
        if not file_bytes.startswith(b"%PDF"):
            return Response(
                {"error": "Invalid file format. File content is not a valid PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate opaque object key and file hash
        object_key = f"pyqs/{branch}/{uuid.uuid4().hex}.pdf"
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Upload to R2
        try:
            storage = get_pyq_storage()
            storage.upload_object(
                key=object_key,
                data=file_bytes,
                content_type="application/pdf",
            )
        except R2StorageError as e:
            logger.error(f"R2 upload error: {e}")
            return Response(
                {"error": "File storage upload failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Resolve or auto-register Subject
        branch_aliases = [branch]
        if branch == "CS":
            branch_aliases.append("CSE")
        elif branch == "CSE":
            branch_aliases.append("CS")
        if is_common_sem:
            branch_aliases.extend(["CommonForAllBranches", "COMMONFORALLBRANCHES"])

        subj = Subject.objects.filter(
            branch__in=branch_aliases,
            semester__in=[1, 2] if is_common_sem else [semester],
            code=subject_code,
        ).first()

        if not subj:
            custom_name = request.POST.get("subject_name", "").strip() or get_subject_name_by_code(subject_code, subject_code)
            subj, _ = Subject.objects.get_or_create(
                branch=branch,
                semester=semester,
                code=subject_code,
                name=custom_name,
                defaults={"is_current": False},
            )

        # Save metadata to database with cleanup on failure
        try:
            pyq = PYQ.objects.create(
                subject=subj,
                branch=branch,
                semester=semester,
                subject_code=subject_code,
                year=year,
                exam_session=exam_session,
                r2_object_key=object_key,
                file_hash=file_hash,
                uploaded_by=request.user,
            )
        except Exception as db_err:
            logger.error(f"Database error saving PYQ: {db_err}. Cleaning up R2 object {object_key}.")
            try:
                storage.delete_object(object_key)
            except Exception as cleanup_err:
                logger.error(f"Failed to cleanup orphaned R2 object {object_key}: {cleanup_err}")

            return Response(
                {"error": "Failed to save PYQ record in database."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"success": True, "id": pyq.id},
            status=status.HTTP_201_CREATED,
        )


# ─── PYQ Download (R2 presigned URLs) ────────────────────────────────────────

class DownloadPYQView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        branch = request.GET.get("branch")
        semester = request.GET.get("semester")
        subject_code = request.GET.get("subject_code", "all")
        from_year = request.GET.get("from_year")
        to_year = request.GET.get("to_year")

        if not all([branch, semester, from_year, to_year]):
            return JsonResponse(
                {"error": "Missing required parameters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            semester = int(semester)
            from_year = int(from_year)
            to_year = int(to_year)
        except ValueError:
            return JsonResponse(
                {"error": "Invalid year or semester"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if from_year > to_year:
            return JsonResponse(
                {"error": "from_year cannot be greater than to_year"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_common_sem = (semester <= 2) or (branch.upper() in ("COMMONFORALLBRANCHES", "COMMON FOR ALL BRANCHES"))
        if is_common_sem:
            base_filter = {
                "branch__in": ["CommonForAllBranches", "COMMONFORALLBRANCHES"],
                "semester__in": [1, 2],
                "year__gte": from_year,
                "year__lte": to_year,
            }
        else:
            base_filter = {
                "branch": branch.upper(),
                "semester": semester,
                "year__gte": from_year,
                "year__lte": to_year,
            }

        # Query database for matching PYQs
        queryset = (
            PYQ.objects.filter(**base_filter)
            .exclude(r2_object_key="")
            .filter(r2_object_key__isnull=False)
        )

        if subject_code.lower() != "all":
            queryset = queryset.filter(subject_code=subject_code.upper())

        raw_pyqs = list(
            queryset.only("id", "r2_object_key", "year", "subject_code", "exam_session")
            .order_by("subject_code", "year", "exam_session")
        )

        # Deduplicate if duplicate records exist across sem 1 and sem 2
        seen_keys = set()
        pyqs = []
        for p in raw_pyqs:
            key = (p.subject_code.upper(), p.year, p.exam_session.lower())
            if key not in seen_keys:
                seen_keys.add(key)
                pyqs.append(p)

        all_years = set(range(from_year, to_year + 1))
        is_all_subjects = subject_code.lower() == "all"
        expected_subjects = get_expected_subjects(branch, semester) if is_all_subjects else []

        if not pyqs:
            missing_details = {}
            if is_all_subjects and expected_subjects:
                for y in range(from_year, to_year + 1):
                    missing_details[str(y)] = [
                        {"name": s_name, "code": s_code} for s_name, s_code in expected_subjects
                    ]
            return JsonResponse(
                {
                    "error": "PYQ missing",
                    "missing_years": sorted(all_years),
                    "missing_details": missing_details,
                },
                status=status.HTTP_404_NOT_FOUND,
            )



        # Download PDFs from R2 and merge
        try:
            storage = get_pyq_storage()

            def _download(pyq):
                try:
                    buf = storage.download_object(pyq.r2_object_key)
                    return (pyq, buf, None)
                except R2NoSuchKeyError as e:
                    logger.warning(
                        f"R2 object missing for PYQ id={pyq.id}, key='{pyq.r2_object_key}': {e}"
                    )
                    return (pyq, None, "missing")
                except Exception as e:
                    err_str = str(e).lower()
                    if "nosuchkey" in err_str or "not exist" in err_str or "404" in err_str:
                        logger.warning(
                            f"R2 object missing for PYQ id={pyq.id}, key='{pyq.r2_object_key}': {e}"
                        )
                        return (pyq, None, "missing")
                    logger.error(
                        f"Failed to download PYQ id={pyq.id}, key='{pyq.r2_object_key}': {e}",
                        exc_info=True,
                    )
                    return (pyq, None, "error")

            max_workers = min(len(pyqs), 5)
            if max_workers > 1:
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    download_results = list(executor.map(_download, pyqs))
            else:
                download_results = [_download(pyqs[0])]

            valid_buffers = []
            successful_pyqs = []
            for pyq, buf, status_flag in download_results:
                if buf is not None:
                    valid_buffers.append(buf)
                    successful_pyqs.append(pyq)

            # If all requested PYQs were missing in R2 or failed to download
            if not valid_buffers:
                logger.warning(
                    f"No PYQ files could be retrieved from R2 for branch={branch}, "
                    f"semester={semester}, subject_code={subject_code}, "
                    f"years={from_year}-{to_year}"
                )
                missing_details = {}
                if is_all_subjects and expected_subjects:
                    for y in range(from_year, to_year + 1):
                        missing_details[str(y)] = [
                            {"name": s_name, "code": s_code} for s_name, s_code in expected_subjects
                        ]
                return JsonResponse(
                    {
                        "error": "PYQ missing",
                        "missing_years": sorted(all_years),
                        "missing_details": missing_details,
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            merged_pdf = compile_pdfs_from_buffers(valid_buffers)
        except Exception as e:
            err_str = str(e).lower()
            if "nosuchkey" in err_str or "not exist" in err_str or "404" in err_str:
                return JsonResponse(
                    {
                        "error": "PYQ missing",
                        "missing_years": sorted(all_years),
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            logger.error(f"Download/Merge failed: {e}", exc_info=True)
            return JsonResponse(
                {"error": "Failed to merge PDF files. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Calculate missing years & details (years not in DB + years missing in R2)
        found_years = {p.year for p in successful_pyqs}
        found_pairs = {(p.year, p.subject_code.upper()) for p in successful_pyqs}

        missing_details = {}
        if is_all_subjects and expected_subjects:
            for y in range(from_year, to_year + 1):
                missing_for_year = []
                for s_name, s_code in expected_subjects:
                    if (y, s_code.upper()) not in found_pairs:
                        missing_for_year.append({"name": s_name, "code": s_code})
                if missing_for_year:
                    missing_details[str(y)] = missing_for_year
            missing_years = sorted(all_years - found_years)
        else:
            missing_years = sorted(all_years - found_years)

        filename = f"{branch.upper()}_sem{semester}_{subject_code.upper()}_{from_year}-{to_year}.pdf"
        response = FileResponse(
            merged_pdf,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )

        if missing_years:
            response["X-missing_years"] = ",".join(str(y) for y in missing_years)
        if missing_details:
            response["X-missing_details"] = urllib.parse.quote(json.dumps(missing_details))

        return response


# ─── Password Reset ──────────────────────────────────────────────────────────

class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email or not str(email).strip():
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = str(email).strip()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            logger.warning(f"Password reset requested for unregistered email: {email}")
            return Response(
                {"message": "If an account exists with this email, a reset link has been sent. The link is valid for 5 minutes only."},
                status=status.HTTP_200_OK,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)

        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
        reset_link = f"{frontend_base}/reset-password/{uid}/{token}"

        try:
            send_password_reset_email(
                user_name=user.name,
                user_email=user.email,
                reset_link=reset_link,
            )
            logger.info(f"Password reset email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {e.__class__.__name__}")
            return Response(
                {"error": "Failed to send password reset email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "If an account exists with this email, a reset link has been sent. The link is valid for 5 minutes only."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, uid, token):
        try:
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response({"error": "Invalid link"}, status=status.HTTP_400_BAD_REQUEST)

        if not token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

        new_password = request.data.get("password")
        if not new_password:
            return Response({"error": "Password required"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)


# ─── Student Verification ────────────────────────────────────────────────────

class VerificationStatusView(APIView):
    """GET — Returns current user's verification status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            verification = request.user.verification
        except StudentVerification.DoesNotExist:
            return Response({
                'status': 'unverified',
                'submitted_at': None,
                'reviewed_at': None,
                'rejection_reason': '',
            })

        serializer = VerificationStatusSerializer(verification)
        return Response(serializer.data)


class VerificationSubmitView(APIView):
    """
    POST — Upload ID card image, store in R2, set status='pending'.

    NEVER sets status to 'verified'. An administrator manually reviews the submission.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Check if user already has a pending or verified submission
        try:
            existing = user.verification
            if existing.status == 'verified':
                return Response(
                    {'error': 'Your account is already verified.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if existing.status == 'pending':
                return Response(
                    {'error': 'You already have a pending verification submission.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except StudentVerification.DoesNotExist:
            existing = None

        # Validate file
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'ID card image is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = settings.VERIFICATION_MAX_IMAGE_SIZE_MB * 1024 * 1024
        if file.size > max_size:
            return Response(
                {'error': f'Image exceeds {settings.VERIFICATION_MAX_IMAGE_SIZE_MB}MB limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.content_type not in settings.VERIFICATION_ALLOWED_IMAGE_TYPES:
            return Response(
                {'error': 'Only JPEG and PNG images are allowed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Read and validate actual image content
        file_bytes = file.read()
        if not self._validate_image_content(file_bytes):
            return Response(
                {'error': 'File content is not a valid image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate opaque R2 key (no PII in key)
        object_key = f"verification/{uuid.uuid4().hex}"

        # Upload to private R2 verification bucket
        try:
            storage = get_verification_storage()
            storage.upload_object(
                key=object_key,
                data=file_bytes,
                content_type=file.content_type,
            )
        except R2StorageError as e:
            logger.error(f"Verification image upload failed: {e}")
            return Response(
                {'error': 'Failed to upload verification image. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        now = datetime.now(timezone.utc)

        # Create or update verification record
        # Status is ALWAYS 'pending' — NEVER 'verified'
        verification_data = {
            'status': 'pending',
            'r2_object_key': object_key,
            'submitted_at': now,
            'reviewed_at': None,
            'reviewed_by': None,
            'rejection_reason': '',
        }

        if existing:
            # Delete old R2 object if exists
            old_key = existing.r2_object_key
            if old_key and old_key != object_key:
                try:
                    storage.delete_object(old_key)
                except R2StorageError:
                    logger.warning(f"Failed to delete old verification image: {old_key}")

            for attr, value in verification_data.items():
                setattr(existing, attr, value)
            existing.save()
            verification = existing
        else:
            verification = StudentVerification.objects.create(
                user=user,
                **verification_data,
            )

        return Response({
            'message': (
                'Your ID card has been submitted successfully and is pending '
                'manual verification by an administrator.'
            ),
            'status': verification.status,
        }, status=status.HTTP_201_CREATED)

    @staticmethod
    def _validate_image_content(file_bytes: bytes) -> bool:
        """Validate actual image content using Pillow — don't trust MIME type."""
        try:
            from PIL import Image
            img = Image.open(BytesIO(file_bytes))
            img.verify()
            return img.format in ('JPEG', 'PNG')
        except Exception:
            return False


class VerificationResubmitView(APIView):
    """POST — Resubmit after rejection."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        try:
            verification = user.verification
        except StudentVerification.DoesNotExist:
            return Response(
                {'error': 'No verification record found. Please submit first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification.status != 'rejected':
            return Response(
                {'error': f'Resubmission is only allowed for rejected verifications. Current status: {verification.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Delegate to the submit view logic
        return VerificationSubmitView().post(request)


# ─── Admin Verification Management ───────────────────────────────────────────

class VerificationListView(APIView):
    """GET — List verification submissions with filtering and pagination. Admin only."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        queryset = StudentVerification.objects.select_related('user', 'reviewed_by').all()

        # Filter by status
        status_filter = request.GET.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Search by roll number, name, or email
        search = request.GET.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(user__rno__icontains=search) |
                Q(user__name__icontains=search) |
                Q(user__email__icontains=search)
            )

        # Order by most recent submissions first
        queryset = queryset.order_by('-submitted_at')

        # Pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        verifications = queryset[start:end]
        serializer = VerificationAdminListSerializer(verifications, many=True)

        return Response({
            'results': serializer.data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
        })


class VerificationDetailView(APIView):
    """GET — Verification detail with presigned image URL and OCR results. Admin only."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk):
        try:
            verification = StudentVerification.objects.select_related(
                'user', 'reviewed_by'
            ).get(pk=pk)
        except StudentVerification.DoesNotExist:
            return Response(
                {'error': 'Verification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = VerificationAdminDetailSerializer(verification)
        data = serializer.data

        # Generate short-lived presigned URL for image access
        if verification.r2_object_key:
            try:
                storage = get_verification_storage()
                data['image_url'] = storage.generate_presigned_download_url(
                    verification.r2_object_key,
                    expiry=900,  # 15 minutes for admin review
                )
            except R2StorageError:
                data['image_url'] = None
                data['image_error'] = 'Failed to generate image access URL.'
        else:
            data['image_url'] = None

        return Response(data)


class VerificationApproveView(APIView):
    """
    POST — THE ONLY PATH to set status='verified'. Admin only.

    This is the sole approval mechanism in the entire system.
    OCR cannot call this. Students cannot call this. Only admins.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            with transaction.atomic():
                verification = (
                    StudentVerification.objects
                    .select_for_update()
                    .select_related('user')
                    .get(pk=pk)
                )

                if verification.status != 'pending':
                    return Response(
                        {'error': f'Cannot approve a submission with status: {verification.status}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                verification.status = 'verified'
                verification.reviewed_at = datetime.now(timezone.utc)
                verification.reviewed_by = request.user
                verification.rejection_reason = ''
                verification.save()

        except StudentVerification.DoesNotExist:
            return Response(
                {'error': 'Verification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Notify student via email
        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
        send_verification_approved_email(
            user_name=verification.user.name,
            user_email=verification.user.email,
            rno=verification.user.rno,
            frontend_base=frontend_base,
        )

        return Response({
            'message': f'Verification approved for {verification.user.rno}.',
            'status': 'verified',
        })


class VerificationRejectView(APIView):
    """POST — Reject verification with reason. Admin only."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'Rejection reason is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                verification = (
                    StudentVerification.objects
                    .select_for_update()
                    .select_related('user')
                    .get(pk=pk)
                )

                if verification.status not in ('pending', 'verified'):
                    return Response(
                        {'error': f'Cannot reject a submission with status: {verification.status}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                verification.status = 'rejected'
                verification.reviewed_at = datetime.now(timezone.utc)
                verification.reviewed_by = request.user
                verification.rejection_reason = reason
                verification.save()

        except StudentVerification.DoesNotExist:
            return Response(
                {'error': 'Verification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Notify student via email
        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
        send_verification_rejected_email(
            user_name=verification.user.name,
            user_email=verification.user.email,
            rno=verification.user.rno,
            reason=reason,
            frontend_base=frontend_base,
        )

        return Response({
            'message': f'Verification rejected for {verification.user.rno}.',
            'status': 'rejected',
            'reason': reason,
        })


class VerificationDeleteDocumentView(APIView):
    """DELETE — Delete verification document from R2 storage. Admin only."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            verification = StudentVerification.objects.get(pk=pk)
        except StudentVerification.DoesNotExist:
            return Response(
                {'error': 'Verification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not verification.r2_object_key:
            return Response(
                {'error': 'No document to delete.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        object_key = verification.r2_object_key

        try:
            storage = get_verification_storage()
            storage.delete_object(object_key)
        except R2StorageError as e:
            logger.error(f"Failed to delete verification document {object_key}: {e}")
            return Response(
                {'error': 'Failed to delete document from storage.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        verification.r2_object_key = ''
        verification.save(update_fields=['r2_object_key'])

        return Response({
            'message': f'Verification document deleted for {verification.user.rno}.',
        })





class PYQHistoryPagination(PageNumberPagination):
    """15 items per page for upload history pagination."""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class PYQUploadHistoryView(APIView):
    """
    GET /admin-api/pyqs/history/
    Lists uploaded PYQs for superusers, administrators, and staff.
    Default ordering: most recent to oldest (-uploaded_at, -id).
    Supports sorting ('recent' vs 'oldest') and filtering by branch, semester, year, subject_code, and search.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        queryset = PYQ.objects.select_related('uploaded_by').all()

        # Filtering
        branch = request.GET.get('branch', '').strip()
        if branch and branch.upper() != 'ALL':
            queryset = queryset.filter(branch__iexact=branch)

        semester = request.GET.get('semester', '').strip()
        if semester and semester.upper() != 'ALL':
            try:
                queryset = queryset.filter(semester=int(semester))
            except ValueError:
                pass

        year = request.GET.get('year', '').strip()
        if year and year.upper() != 'ALL':
            try:
                queryset = queryset.filter(year=int(year))
            except ValueError:
                pass

        subject_code = request.GET.get('subject_code', '').strip()
        if subject_code and subject_code.upper() != 'ALL':
            queryset = queryset.filter(subject_code__iexact=subject_code)

        search = request.GET.get('search', '').strip()
        if search:
            search_lower = search.lower()
            matching_codes = [
                code for code, name in SUBJECT_CODE_TO_NAME.items()
                if search_lower in name.lower() or search_lower in code.lower()
            ]
            search_query = (
                Q(uploaded_by__rno__icontains=search) |
                Q(subject_code__icontains=search)
            )
            if matching_codes:
                search_query |= Q(subject_code__in=matching_codes)
            queryset = queryset.filter(search_query)


        # Sorting: Default is most recent to oldest
        order = request.GET.get('order', 'recent').strip().lower()
        if order == 'oldest':
            queryset = queryset.order_by('uploaded_at', 'id')
        else:
            queryset = queryset.order_by('-uploaded_at', '-id')

        # Pagination: 15 per page
        paginator = PYQHistoryPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        serializer = PYQUploadHistorySerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)


class PYQDownloadUrlView(APIView):
    """
    GET /admin-api/pyqs/<int:pk>/download-url/
    Generates an on-demand presigned download URL for a single PYQ.
    Accessible only to superusers, administrators, and staff.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk):
        try:
            pyq = PYQ.objects.get(pk=pk)
        except PYQ.DoesNotExist:
            return Response({'error': 'PYQ not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not pyq.r2_object_key:
            return Response({'error': 'No file stored for this PYQ.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            storage = get_pyq_storage()
            download_url = storage.generate_presigned_download_url(pyq.r2_object_key, expiry=3600)
            filename = f"{pyq.branch}_sem{pyq.semester}_{pyq.subject_code}_{pyq.year}_{pyq.exam_session}.pdf"
            return Response({
                'id': pyq.id,
                'download_url': download_url,
                'filename': filename,
            })
        except R2StorageError as e:
            logger.error(f"Failed to generate presigned download URL for PYQ {pyq.id}: {e}")
            return Response({'error': 'Failed to generate download link.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Admin Unlisted Subject Management ────────────────────────────────────────

class AdminSubjectRequestListView(APIView):
    """
    GET /admin-api/subject-requests/
    List and filter subject addition requests. Admin only.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        queryset = SubjectRequest.objects.select_related("user", "reviewed_by").all()

        status_filter = request.GET.get("status", "").strip().lower()
        if status_filter and status_filter != "all":
            queryset = queryset.filter(status=status_filter)

        branch_filter = request.GET.get("branch", "").strip()
        if branch_filter and branch_filter.upper() != "ALL":
            queryset = queryset.filter(branch__iexact=branch_filter)

        semester_filter = request.GET.get("semester", "").strip()
        if semester_filter and semester_filter.upper() != "ALL":
            try:
                queryset = queryset.filter(semester=int(semester_filter))
            except ValueError:
                pass

        search = request.GET.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(user__rno__icontains=search)
                | Q(user__name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(code__icontains=search)
                | Q(name__icontains=search)
            )

        queryset = queryset.order_by("-submitted_at")

        try:
            page = max(1, int(request.GET.get("page", 1)))
        except ValueError:
            page = 1
        try:
            page_size = max(1, min(100, int(request.GET.get("page_size", 15))))
        except ValueError:
            page_size = 15

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        requests_page = queryset[start:end]
        serializer = SubjectRequestSerializer(requests_page, many=True)

        return Response({
            "results": serializer.data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        })


class AdminSubjectRequestApproveView(APIView):
    """
    POST /admin-api/subject-requests/<int:pk>/approve/
    Approves a subject addition request, creates/activates the Subject, and emails the requesting student.
    Admin only.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            with transaction.atomic():
                subject_req = (
                    SubjectRequest.objects
                    .select_for_update()
                    .select_related("user")
                    .get(pk=pk)
                )

                if subject_req.status != "pending":
                    return Response(
                        {"error": f"Cannot approve a request with status: {subject_req.status}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                subject_req.status = "approved"
                subject_req.reviewed_at = datetime.now(timezone.utc)
                subject_req.reviewed_by = request.user
                subject_req.rejection_reason = ""
                subject_req.save()

                # Add to Subject table as an approved past/unlisted subject (is_current=False)
                subject, created = Subject.objects.get_or_create(
                    branch=subject_req.branch,
                    semester=subject_req.semester,
                    code=subject_req.code,
                    defaults={
                        "name": subject_req.name,
                        "is_current": False,
                    },
                )
                if not created and not subject.name:
                    subject.name = subject_req.name
                    subject.save(update_fields=["name"])

        except SubjectRequest.DoesNotExist:
            return Response(
                {"error": "Subject request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Notify the student via email
        send_subject_approved_email(
            user_name=subject_req.user.name,
            user_email=subject_req.user.email,
            code=subject_req.code,
            name=subject_req.name,
            branch=subject_req.branch,
            semester=subject_req.semester,
        )

        return Response({
            "message": f"Subject '{subject_req.code} - {subject_req.name}' approved and added to curriculum.",
            "status": "approved",
        })


class AdminSubjectRequestRejectView(APIView):
    """
    POST /admin-api/subject-requests/<int:pk>/reject/
    Rejects a subject addition request with a reason and notifies the requesting student via email.
    Admin only.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response(
                {"error": "Rejection reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                subject_req = (
                    SubjectRequest.objects
                    .select_for_update()
                    .select_related("user")
                    .get(pk=pk)
                )

                if subject_req.status != "pending":
                    return Response(
                        {"error": f"Cannot reject a request with status: {subject_req.status}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                subject_req.status = "rejected"
                subject_req.reviewed_at = datetime.now(timezone.utc)
                subject_req.reviewed_by = request.user
                subject_req.rejection_reason = reason
                subject_req.save()

        except SubjectRequest.DoesNotExist:
            return Response(
                {"error": "Subject request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Notify the student via email
        send_subject_rejected_email(
            user_name=subject_req.user.name,
            user_email=subject_req.user.email,
            code=subject_req.code,
            name=subject_req.name,
            branch=subject_req.branch,
            semester=subject_req.semester,
            reason=reason,
        )

        return Response({
            "message": f"Subject request for '{subject_req.code}' was rejected.",
            "status": "rejected",
            "reason": reason,
        })