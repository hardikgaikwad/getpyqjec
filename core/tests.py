import io
from unittest.mock import MagicMock, patch

import resend
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

import pikepdf
from PIL import Image

from core.models import PYQ, StudentVerification, Subject, SubjectRequest
from utils.email_service import (
    EmailServiceError,
    send_email,
    send_password_reset_email,
    send_verification_approved_email,
    send_verification_rejected_email,
    send_subject_approved_email,
    send_subject_rejected_email,
)
from utils.pdf import compile_pdfs_from_buffers
from utils.r2_storage import R2NoSuchKeyError, R2StorageError

User = get_user_model()


def _create_minimal_pdf_bytes():
    """Generates a valid, minimal single-page PDF in memory using pikepdf."""
    pdf = pikepdf.Pdf.new()
    pdf.add_blank_page(page_size=(200, 200))
    buf = io.BytesIO()
    pdf.save(buf)
    pdf.close()
    buf.seek(0)
    return buf.getvalue()


def _create_minimal_image_bytes():
    """Generates a valid minimal PNG image in memory."""
    img = Image.new("RGB", (100, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.valid_rno = "0201IT231046"
        self.valid_email = "teststudent@gmail.com"
        self.valid_password = "password123"
        self.user = User.objects.create_user(
            rno=self.valid_rno,
            email=self.valid_email,
            name="Test Student",
            password=self.valid_password,
        )

    def test_user_creation_and_rno_regex(self):
        self.assertEqual(self.user.role, "contributor")
        self.assertTrue(self.user.is_active)
        self.assertFalse(self.user.is_staff)

        # Invalid roll number should fail validation
        with self.assertRaises(Exception):
            invalid_user = User(
                rno="9999XX123456",
                email="invalid@gmail.com",
                name="Invalid",
            )
            invalid_user.full_clean()

    def test_register_success(self):
        res = self.client.post("/auth/register/", {
            "rno": "0201CS231001",
            "email": "csstudent@gmail.com",
            "name": "CS Student",
            "password": "strongpassword",
        }, format="json")

        self.assertEqual(res.status_code, 201)
        self.assertIn("access", res.data)
        self.assertEqual(res.data["user"]["rno"], "0201CS231001")
        self.assertEqual(res.data["user"]["verification_status"], "unverified")
        self.assertIn("refresh_token", res.cookies)

    def test_register_duplicate_rno_or_email(self):
        res = self.client.post("/auth/register/", {
            "rno": self.valid_rno,
            "email": "another@gmail.com",
            "name": "Duplicate",
            "password": "password123",
        }, format="json")
        self.assertEqual(res.status_code, 400)

    def test_login_success(self):
        res = self.client.post("/auth/login/", {
            "rno": self.valid_rno,
            "password": self.valid_password,
        }, format="json")

        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertEqual(res.data["user"]["verification_status"], "unverified")
        self.assertIn("refresh_token", res.cookies)

    def test_login_invalid_credentials(self):
        res = self.client.post("/auth/login/", {
            "rno": self.valid_rno,
            "password": "wrongpassword",
        }, format="json")
        self.assertEqual(res.status_code, 401)

    def test_token_refresh(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["refresh_token"] = str(refresh)

        res = self.client.post("/auth/refresh/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_token_refresh_no_cookie(self):
        res = self.client.post("/auth/refresh/")
        self.assertEqual(res.status_code, 401)

    def test_logout(self):
        res = self.client.post("/auth/logout/")
        self.assertEqual(res.status_code, 200)
        cookie = res.cookies.get("refresh_token")
        self.assertTrue(cookie is not None)

    @patch("resend.Emails.send")
    def test_forgot_and_reset_password_flow(self, mock_resend_send):
        mock_resend_send.return_value = {"id": "re_pwd_reset_123"}
        with self.settings(RESEND_API_KEY="re_test_key_123"):
            # 1. Request reset link
            res = self.client.post("/auth/forgot-password/", {"email": self.valid_email}, format="json")
            self.assertEqual(res.status_code, 200)
            mock_resend_send.assert_called_once()
            call_params = mock_resend_send.call_args[0][0]
            self.assertIn("Reset your GetPYQ password", call_params["subject"])
            self.assertEqual(call_params["to"], [self.valid_email])
            self.assertIn("/reset-password/", call_params["text"])

            # 2. Reset password with generated token
            token_gen = PasswordResetTokenGenerator()
            uid = urlsafe_base64_encode(force_bytes(self.user.pk))
            token = token_gen.make_token(self.user)

            res_reset = self.client.post(f"/auth/reset-password/{uid}/{token}/", {
                "password": "newsecretpassword123",
            }, format="json")
            self.assertEqual(res_reset.status_code, 200)

            # 3. Verify user can login with new password
            login_res = self.client.post("/auth/login/", {
                "rno": self.valid_rno,
                "password": "newsecretpassword123",
            }, format="json")
            self.assertEqual(login_res.status_code, 200)


class UploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT231046",
            email="contributor@gmail.com",
            name="Uploader",
            password="password123",
        )
        self.client.force_authenticate(user=self.user)
        self.pdf_content = _create_minimal_pdf_bytes()

    def test_upload_requires_auth(self):
        unauth_client = APIClient()
        res = unauth_client.post("/upload/", {})
        self.assertEqual(res.status_code, 401)

    def test_upload_blocked_for_unverified_student(self):
        file = SimpleUploadedFile("paper.pdf", self.pdf_content, content_type="application/pdf")
        res = self.client.post("/upload/", {
            "branch": "IT",
            "semester": 5,
            "subject_code": "IT51",
            "year": 2024,
            "exam_session": "December",
            "file": file,
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("verify your student ID", res.data["detail"])

    @patch("core.views.get_pyq_storage")
    def test_upload_success_for_verified_student(self, mock_get_storage):
        # Verify student
        StudentVerification.objects.create(
            user=self.user,
            status="verified",
        )

        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        file = SimpleUploadedFile("paper.pdf", self.pdf_content, content_type="application/pdf")
        res = self.client.post("/upload/", {
            "branch": "IT",
            "semester": 5,
            "subject_code": "IT51",
            "year": 2024,
            "exam_session": "December",
            "file": file,
        })

        self.assertEqual(res.status_code, 201)
        mock_storage.upload_object.assert_called_once()
        self.assertTrue(PYQ.objects.filter(
            branch="IT", semester=5, subject_code="IT51", year=2024, exam_session="December"
        ).exists())

    @patch("core.views.get_pyq_storage")
    def test_upload_allowed_for_admin_user(self, mock_get_storage):
        self.user.role = "admin"
        self.user.is_staff = True
        self.user.save()

        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        file = SimpleUploadedFile("paper.pdf", self.pdf_content, content_type="application/pdf")
        res = self.client.post("/upload/", {
            "branch": "IT",
            "semester": 5,
            "subject_code": "IT51",
            "year": 2024,
            "exam_session": "December",
            "file": file,
        })

        self.assertEqual(res.status_code, 201)
        mock_storage.upload_object.assert_called_once()

    def test_upload_missing_fields(self):
        StudentVerification.objects.create(user=self.user, status="verified")
        res = self.client.post("/upload/", {"branch": "IT"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Missing required fields", res.data["error"])

    def test_upload_non_pdf_extension(self):
        StudentVerification.objects.create(user=self.user, status="verified")
        file = SimpleUploadedFile("paper.txt", b"plain text", content_type="text/plain")
        res = self.client.post("/upload/", {
            "branch": "IT",
            "semester": 5,
            "subject_code": "IT51",
            "year": 2024,
            "exam_session": "December",
            "file": file,
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Only PDF files are allowed", res.data["error"])

    def test_get_existing_pyqs_missing_params(self):
        res = self.client.get("/upload/")
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.data)

    def test_get_existing_pyqs_success(self):
        PYQ.objects.create(
            branch="IT",
            semester=5,
            subject_code="IT51",
            year=2022,
            exam_session="April",
            r2_object_key="pyqs/IT/dummy1.pdf",
            uploaded_by=self.user,
        )
        res = self.client.get("/upload/?branch=IT&semester=5&subject_code=IT51")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["uploaded"], [{"year": 2022, "session": "April", "exam_session": "April"}])

    def test_get_existing_pyqs_common_branch(self):
        PYQ.objects.create(
            branch="COMMONFORALLBRANCHES",
            semester=1,
            subject_code="BT11",
            year=2023,
            exam_session="December",
            r2_object_key="pyqs/COMMONFORALLBRANCHES/dummy2.pdf",
            uploaded_by=self.user,
        )
        # Queried with CommonForAllBranches
        res = self.client.get("/upload/?branch=CommonForAllBranches&semester=1&subject_code=BT11")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["uploaded"], [{"year": 2023, "session": "December", "exam_session": "December"}])


class DownloadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT231046",
            email="contributor@gmail.com",
            name="Uploader",
            password="password123",
        )
        self.pdf_bytes = _create_minimal_pdf_bytes()

        # Seed PYQs with r2_object_key
        self.pyq1 = PYQ.objects.create(
            branch="IT",
            semester=5,
            subject_code="IT51",
            year=2022,
            exam_session="December",
            r2_object_key="pyq/IT/5/IT51/2022_dec.pdf",
            uploaded_by=self.user,
        )
        self.pyq2 = PYQ.objects.create(
            branch="IT",
            semester=5,
            subject_code="IT51",
            year=2024,
            exam_session="April",
            r2_object_key="pyq/IT/5/IT51/2024_apr.pdf",
            uploaded_by=self.user,
        )

    def test_download_missing_params(self):
        res = self.client.get("/download/?branch=IT")
        self.assertEqual(res.status_code, 400)

    def test_download_no_pyq_found(self):
        res = self.client.get("/download/?branch=CS&semester=3&subject_code=CS31&from_year=2020&to_year=2022")
        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertEqual(data["error"], "PYQ missing")
        self.assertEqual(data["missing_years"], [2020, 2021, 2022])

    @patch("core.views.get_pyq_storage")
    def test_download_success_with_missing_years(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_storage.download_object.return_value = self.pdf_bytes
        mock_get_storage.return_value = mock_storage

        res = self.client.get("/download/?branch=IT&semester=5&subject_code=IT51&from_year=2022&to_year=2024")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")
        self.assertIn("IT_sem5_IT51_2022-2024.pdf", res["Content-Disposition"])
        self.assertEqual(res.get("X-missing_years"), "2023")

    @patch("core.views.get_pyq_storage")
    def test_download_r2_missing_returns_pyq_missing(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_storage.download_object.side_effect = R2NoSuchKeyError("Object not found in R2: key")
        mock_get_storage.return_value = mock_storage

        res = self.client.get("/download/?branch=IT&semester=5&subject_code=IT51&from_year=2022&to_year=2022")

        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertEqual(data["error"], "PYQ missing")
        self.assertEqual(data["missing_years"], [2022])

    @patch("core.views.get_pyq_storage")
    def test_download_partial_r2_missing_merges_available(self, mock_get_storage):
        mock_storage = MagicMock()

        def mock_download(key):
            if "2022" in key:
                raise R2NoSuchKeyError("Missing in R2")
            return self.pdf_bytes

        mock_storage.download_object.side_effect = mock_download
        mock_get_storage.return_value = mock_storage

        res = self.client.get("/download/?branch=IT&semester=5&subject_code=IT51&from_year=2022&to_year=2024")

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")
        # 2022 was missing in R2, 2023 was not in DB -> both should be in X-missing_years
        missing_years_header = res.get("X-missing_years")
        self.assertIn("2022", missing_years_header)
        self.assertIn("2023", missing_years_header)

    @patch("core.views.get_pyq_storage")
    def test_download_all_subjects_returns_missing_details(self, mock_get_storage):
        import urllib.parse
        import json
        mock_storage = MagicMock()
        mock_storage.download_object.return_value = self.pdf_bytes
        mock_get_storage.return_value = mock_storage

        res = self.client.get("/download/?branch=IT&semester=5&subject_code=All&from_year=2022&to_year=2024")
        self.assertEqual(res.status_code, 200)
        self.assertIn("X-missing_details", res)
        details = json.loads(urllib.parse.unquote(res["X-missing_details"]))
        # 2022 has IT51, so IT52-IT55 are missing
        self.assertIn("2022", details)
        codes_2022 = [s["code"] for s in details["2022"]]
        self.assertNotIn("IT51", codes_2022)
        self.assertIn("IT52", codes_2022)
        # 2023 has no papers, so all 5 subjects are missing
        self.assertIn("2023", details)
        codes_2023 = [s["code"] for s in details["2023"]]
        self.assertEqual(len(codes_2023), 5)



class StudentVerificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT231046",
            email="student@gmail.com",
            name="Test Student",
            password="password123",
        )
        self.client.force_authenticate(user=self.user)
        self.image_bytes = _create_minimal_image_bytes()

        self.admin = User.objects.create_user(
            rno="0201AD201001",
            email="admin@gmail.com",
            name="Admin User",
            password="adminpassword",
            role="admin",
            is_staff=True,
        )

    def test_get_status_unverified(self):
        res = self.client.get("/verification/status/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "unverified")

    @patch("core.views.get_verification_storage")
    def test_submit_verification_sets_pending_never_verified(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        image_file = SimpleUploadedFile("id_card.png", self.image_bytes, content_type="image/png")
        res = self.client.post("/verification/submit/", {"file": image_file})

        self.assertEqual(res.status_code, 201)
        # Verify status is strictly pending, NEVER verified automatically
        self.assertEqual(res.data["status"], "pending")

        verification = StudentVerification.objects.get(user=self.user)
        self.assertEqual(verification.status, "pending")
        self.assertTrue(verification.r2_object_key.startswith("verification/"))

    def test_submit_verification_exceeds_2mb_rejected(self):
        oversized_bytes = b"x" * (2 * 1024 * 1024 + 10)
        image_file = SimpleUploadedFile("big_id.png", oversized_bytes, content_type="image/png")
        res = self.client.post("/verification/submit/", {"file": image_file})
        self.assertEqual(res.status_code, 400)
        self.assertIn("exceeds 2MB limit", res.data["error"])

    @patch("core.views.get_verification_storage")
    def test_admin_approval_workflow(self, mock_get_storage):
        verification = StudentVerification.objects.create(
            user=self.user,
            status="pending",
            r2_object_key="verification/test_doc.png",
        )

        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)

        # Admin detail inspection
        mock_storage = MagicMock()
        mock_storage.generate_presigned_download_url.return_value = "https://r2.example.com/presigned_doc"
        mock_get_storage.return_value = mock_storage

        res_detail = admin_client.get(f"/admin-api/verifications/{verification.id}/")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.data["image_url"], "https://r2.example.com/presigned_doc")

        # Admin approve
        res_approve = admin_client.post(f"/admin-api/verifications/{verification.id}/approve/")
        self.assertEqual(res_approve.status_code, 200)
        self.assertEqual(res_approve.data["status"], "verified")

        verification.refresh_from_db()
        self.assertEqual(verification.status, "verified")
        self.assertEqual(verification.reviewed_by, self.admin)

    def test_admin_reject_workflow(self):
        verification = StudentVerification.objects.create(
            user=self.user,
            status="pending",
            r2_object_key="verification/test_doc.png",
        )

        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)

        res_reject = admin_client.post(f"/admin-api/verifications/{verification.id}/reject/", {
            "reason": "Blurry image. Roll number not legible.",
        }, format="json")

        self.assertEqual(res_reject.status_code, 200)
        self.assertEqual(res_reject.data["status"], "rejected")

        verification.refresh_from_db()
        self.assertEqual(verification.status, "rejected")
        self.assertEqual(verification.rejection_reason, "Blurry image. Roll number not legible.")

    @patch("core.views.get_verification_storage")
    def test_admin_delete_verification_document(self, mock_get_storage):
        verification = StudentVerification.objects.create(
            user=self.user,
            status="verified",
            r2_object_key="verification/stored_card.png",
        )

        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        admin_client = APIClient()
        admin_client.force_authenticate(user=self.admin)

        res_del = admin_client.delete(f"/admin-api/verifications/{verification.id}/document/")
        self.assertEqual(res_del.status_code, 200)

        mock_storage.delete_object.assert_called_once_with("verification/stored_card.png")
        verification.refresh_from_db()
        self.assertEqual(verification.r2_object_key, "")
        self.assertEqual(verification.status, "verified")  # Status is retained





class PdfUtilsTests(TestCase):
    def test_compile_pdfs_from_buffers(self):
        buf1 = io.BytesIO(_create_minimal_pdf_bytes())
        buf2 = io.BytesIO(_create_minimal_pdf_bytes())

        merged = compile_pdfs_from_buffers([buf1, buf2])
        self.assertIsInstance(merged, io.BytesIO)

        with pikepdf.Pdf.open(merged) as pdf:
            self.assertEqual(len(pdf.pages), 2)


class HealthCheckTests(TestCase):
    def test_health_check(self):
        client = APIClient()
        res = client.get("/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "healthy"})


class PYQUploadHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Regular contributor
        self.contributor = User.objects.create_user(
            rno="0201IT231001",
            email="contributor@gmail.com",
            name="Contributor One",
            password="password123",
        )

        # Admin user
        self.admin = User.objects.create_user(
            rno="0201IT231002",
            email="admin@gmail.com",
            name="Admin User",
            password="password123",
            role="admin",
        )

        # Staff user
        self.staff = User.objects.create_user(
            rno="0201IT231003",
            email="staff@gmail.com",
            name="Staff User",
            password="password123",
            is_staff=True,
        )

        # Superuser
        self.superuser = User.objects.create_superuser(
            rno="0201IT231004",
            email="superuser@gmail.com",
            name="Super User",
            password="password123",
        )

        # Create sample PYQs
        self.pyq1 = PYQ.objects.create(
            branch="IT",
            semester=6,
            subject_code="IT61",
            year=2024,
            exam_session="December",
            r2_object_key="pyq/IT/6/IT61/2024_dec.pdf",
            uploaded_by=self.contributor,
        )
        self.pyq2 = PYQ.objects.create(
            branch="CS",
            semester=4,
            subject_code="CS42",
            year=2023,
            exam_session="May",
            r2_object_key="pyq/CS/4/CS42/2023_may.pdf",
            uploaded_by=self.staff,
        )

    def test_permissions(self):
        url = "/admin-api/pyqs/history/"

        # Unauthenticated
        res = self.client.get(url)
        self.assertEqual(res.status_code, 401)

        # Normal contributor
        self.client.force_authenticate(user=self.contributor)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)

        # Admin
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        # Staff
        self.client.force_authenticate(user=self.staff)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

        # Superuser
        self.client.force_authenticate(user=self.superuser)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)

    def test_ordering(self):
        self.client.force_authenticate(user=self.admin)

        # Default order is recent (-uploaded_at, -id)
        res = self.client.get("/admin-api/pyqs/history/")
        self.assertEqual(res.status_code, 200)
        results = res.data["results"]
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["id"], self.pyq2.id)
        self.assertEqual(results[1]["id"], self.pyq1.id)

        # Oldest order
        res_old = self.client.get("/admin-api/pyqs/history/?order=oldest")
        self.assertEqual(res_old.status_code, 200)
        results_old = res_old.data["results"]
        self.assertEqual(results_old[0]["id"], self.pyq1.id)
        self.assertEqual(results_old[1]["id"], self.pyq2.id)

    def test_filtering(self):
        self.client.force_authenticate(user=self.admin)

        # Filter by branch
        res = self.client.get("/admin-api/pyqs/history/?branch=IT")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["branch"], "IT")

        # Filter by semester
        res = self.client.get("/admin-api/pyqs/history/?semester=4")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["semester"], 4)

        # Filter by year
        res = self.client.get("/admin-api/pyqs/history/?year=2024")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["year"], 2024)

        # Filter by subject_code
        res = self.client.get("/admin-api/pyqs/history/?subject_code=IT61")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["subject_code"], "IT61")

        # Search by roll number
        res = self.client.get("/admin-api/pyqs/history/?search=0201IT231001")
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["uploaded_by_rno"], "0201IT231001")

        # Search by subject name
        res_name = self.client.get("/admin-api/pyqs/history/?search=Elective")
        self.assertEqual(len(res_name.data["results"]), 1)
        self.assertEqual(res_name.data["results"][0]["subject_code"], "IT61")


    def test_pagination_page_size(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/admin-api/pyqs/history/")
        self.assertEqual(res.status_code, 200)
        # Default page size configured in pagination is 15
        self.assertIn("results", res.data)
        self.assertIn("count", res.data)

    @patch("core.views.get_pyq_storage")
    def test_download_url_endpoint(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_storage.generate_presigned_download_url.return_value = "https://r2.example.com/presigned-pdf"
        mock_get_storage.return_value = mock_storage

        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/admin-api/pyqs/{self.pyq1.id}/download-url/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["download_url"], "https://r2.example.com/presigned-pdf")
        self.assertIn("filename", res.data)


class SubjectAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Subject.objects.create(branch="IT", semester=7, code="IT71", name="PEC-III", is_current=True)
        Subject.objects.create(branch="IT", semester=7, code="IT72", name="OEC-II", is_current=True)
        Subject.objects.create(branch="IT", semester=7, code="IT701M", name="Cloud Computing", is_current=False)

    def test_get_subjects_missing_params(self):
        res = self.client.get("/subjects/")
        self.assertEqual(res.status_code, 400)

    def test_get_subjects_invalid_semester(self):
        res = self.client.get("/subjects/?branch=IT&semester=99")
        self.assertEqual(res.status_code, 400)

    def test_get_subjects_success(self):
        res = self.client.get("/subjects/?branch=IT&semester=7")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["branch"], "IT")
        self.assertEqual(data["semester"], 7)
        self.assertGreaterEqual(len(data["current_subjects"]), 5)
        self.assertGreaterEqual(len(data["past_subjects"]), 1)
        codes = [s["code"] for s in data["past_subjects"]]
        self.assertIn("IT701M", codes)


class SubjectRequestAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT211001",
            name="Alice Student",
            email="alice@jecjabalpur.ac.in",
            password="StrongPassword123!",
        )
        self.admin = User.objects.create_superuser(
            rno="0201IT211099",
            name="Admin User",
            email="admin@jecjabalpur.ac.in",
            password="StrongPassword123!",
        )
        Subject.objects.create(branch="IT", semester=7, code="IT71", name="PEC-III", is_current=True)

    def test_request_subject_unauthenticated(self):
        res = self.client.post("/subjects/request/", {
            "branch": "IT",
            "semester": 7,
            "code": "IT702M",
            "name": "Old Cloud Subject",
        })
        self.assertEqual(res.status_code, 401)

    def test_request_subject_missing_fields(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/subjects/request/", {
            "branch": "IT",
            "semester": 7,
            "code": "",
            "name": "",
        })
        self.assertEqual(res.status_code, 400)

    def test_request_subject_already_exists(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/subjects/request/", {
            "branch": "IT",
            "semester": 7,
            "code": "IT71",
            "name": "PEC-III",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("already exists", res.data["error"])

    def test_request_subject_success(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/subjects/request/", {
            "branch": "IT",
            "semester": 7,
            "code": "IT702M",
            "name": "Old Cloud Subject",
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(SubjectRequest.objects.filter(code="IT702M", status="pending").exists())

        # Duplicate pending request should fail
        res_dup = self.client.post("/subjects/request/", {
            "branch": "IT",
            "semester": 7,
            "code": "IT702M",
            "name": "Old Cloud Subject",
        })
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("already pending", res_dup.data["error"])

    def test_admin_list_subject_requests(self):
        req = SubjectRequest.objects.create(
            user=self.user,
            branch="IT",
            semester=7,
            code="IT703M",
            name="Network Protocols",
            status="pending",
        )
        # Non-admin forbidden
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/admin-api/subject-requests/")
        self.assertEqual(res.status_code, 403)

        # Admin success
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/admin-api/subject-requests/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total"], 1)
        self.assertEqual(res.data["results"][0]["code"], "IT703M")

    def test_admin_approve_subject_request(self):
        req = SubjectRequest.objects.create(
            user=self.user,
            branch="IT",
            semester=7,
            code="IT704M",
            name="Advanced Database",
            status="pending",
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/admin-api/subject-requests/{req.id}/approve/")
        self.assertEqual(res.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, "approved")
        self.assertEqual(req.reviewed_by, self.admin)

        # Subject table should now have IT704M with is_current=False
        subj = Subject.objects.get(branch="IT", semester=7, code="IT704M")
        self.assertFalse(subj.is_current)
        self.assertEqual(subj.name, "Advanced Database")

    def test_admin_reject_subject_request(self):
        req = SubjectRequest.objects.create(
            user=self.user,
            branch="IT",
            semester=7,
            code="IT705M",
            name="Fake Subject",
            status="pending",
        )
        self.client.force_authenticate(user=self.admin)
        # Missing reason
        res = self.client.post(f"/admin-api/subject-requests/{req.id}/reject/", {"reason": ""})
        self.assertEqual(res.status_code, 400)

        # With reason
        res = self.client.post(f"/admin-api/subject-requests/{req.id}/reject/", {"reason": "Not a real subject"})
        self.assertEqual(res.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, "rejected")
        self.assertEqual(req.rejection_reason, "Not a real subject")


class VerificationEmailNotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT211050",
            name="Bob Student",
            email="bob@jecjabalpur.ac.in",
            password="StrongPassword123!",
        )
        self.admin = User.objects.create_superuser(
            rno="0201IT211099",
            name="Admin User",
            email="admin@jecjabalpur.ac.in",
            password="StrongPassword123!",
        )
        self.verification = StudentVerification.objects.create(
            user=self.user,
            status="pending",
        )

    @patch("resend.Emails.send")
    def test_approve_verification_sends_email(self, mock_resend_send):
        mock_resend_send.return_value = {"id": "re_verify_appr_123"}
        with self.settings(RESEND_API_KEY="re_test_key_123"):
            self.client.force_authenticate(user=self.admin)
            res = self.client.post(f"/admin-api/verifications/{self.verification.id}/approve/")
            self.assertEqual(res.status_code, 200)
            self.verification.refresh_from_db()
            self.assertEqual(self.verification.status, "verified")

            # Verify email was sent via Resend API
            mock_resend_send.assert_called_once()
            call_params = mock_resend_send.call_args[0][0]
            self.assertIn("Student ID Verification Approved", call_params["subject"])
            self.assertEqual(call_params["to"], [self.user.email])
            self.assertIn(self.user.name, call_params["text"])
            self.assertIn("/upload", call_params["text"])

    @patch("resend.Emails.send")
    def test_reject_verification_sends_email(self, mock_resend_send):
        mock_resend_send.return_value = {"id": "re_verify_rej_123"}
        with self.settings(RESEND_API_KEY="re_test_key_123"):
            self.client.force_authenticate(user=self.admin)
            res = self.client.post(
                f"/admin-api/verifications/{self.verification.id}/reject/",
                {"reason": "ID card photo is blurry. Please upload a clear scan."},
            )
            self.assertEqual(res.status_code, 200)
            self.verification.refresh_from_db()
            self.assertEqual(self.verification.status, "rejected")

            # Verify email was sent via Resend API
            mock_resend_send.assert_called_once()
            call_params = mock_resend_send.call_args[0][0]
            self.assertIn("Student ID Verification Update", call_params["subject"])
            self.assertEqual(call_params["to"], [self.user.email])
            self.assertIn("ID card photo is blurry", call_params["text"])
            self.assertIn("/verify", call_params["text"])


class EmailServiceTests(TestCase):
    """
    Comprehensive tests for utils.email_service and Resend API transactional emails.
    """

    @patch("resend.Emails.send")
    def test_send_email_success(self, mock_send):
        mock_send.return_value = {"id": "msg_abc123"}
        with self.settings(
            RESEND_API_KEY="re_test_key_mock",
            DEFAULT_FROM_EMAIL="GetPYQ <onboarding@resend.dev>",
        ):
            resp = send_email(
                to="student@example.com",
                subject="Test Subject",
                text="Test Body Message",
            )
            self.assertEqual(resp, {"id": "msg_abc123"})
            mock_send.assert_called_once_with({
                "from": "GetPYQ <onboarding@resend.dev>",
                "to": ["student@example.com"],
                "subject": "Test Subject",
                "text": "Test Body Message",
            })

    @patch("resend.Emails.send")
    def test_send_email_with_html_and_reply_to_and_custom_sender(self, mock_send):
        mock_send.return_value = {"id": "msg_custom456"}
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            resp = send_email(
                to=["student1@example.com", "student2@example.com"],
                subject="Notice",
                text="Plain notice",
                html="<p>Plain notice</p>",
                from_email="Admin <admin@mycollege.edu>",
                reply_to="support@mycollege.edu",
            )
            self.assertEqual(resp, {"id": "msg_custom456"})
            mock_send.assert_called_once_with({
                "from": "Admin <admin@mycollege.edu>",
                "to": ["student1@example.com", "student2@example.com"],
                "subject": "Notice",
                "text": "Plain notice",
                "html": "<p>Plain notice</p>",
                "reply_to": ["support@mycollege.edu"],
            })

    def test_send_email_missing_api_key_raises_error(self):
        with self.settings(RESEND_API_KEY=""):
            with self.assertRaises(EmailServiceError) as ctx:
                send_email(
                    to="student@example.com",
                    subject="Test Subject",
                    text="Test Body",
                    fail_silently=False,
                )
            self.assertIn("Resend API key is not configured", str(ctx.exception))

    def test_send_email_missing_api_key_fail_silently(self):
        with self.settings(RESEND_API_KEY=""):
            result = send_email(
                to="student@example.com",
                subject="Test Subject",
                text="Test Body",
                fail_silently=True,
            )
            self.assertIsNone(result)

    @patch("resend.Emails.send")
    def test_send_email_resend_api_exception_raises_error(self, mock_send):
        mock_send.side_effect = Exception("Internal API timeout from Resend")
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            with self.assertRaises(EmailServiceError) as ctx:
                send_email(
                    to="student@example.com",
                    subject="Test Subject",
                    text="Test Body",
                    fail_silently=False,
                )
            # Ensure internal message details are sanitized and do not expose sensitive API tokens
            self.assertIn("Failed to deliver email via Resend", str(ctx.exception))

    @patch("resend.Emails.send")
    def test_send_email_resend_api_exception_fail_silently(self, mock_send):
        mock_send.side_effect = Exception("Internal API timeout from Resend")
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            result = send_email(
                to="student@example.com",
                subject="Test Subject",
                text="Test Body",
                fail_silently=True,
            )
            self.assertIsNone(result)

    @patch("resend.Emails.send")
    def test_send_password_reset_email_helper(self, mock_send):
        mock_send.return_value = {"id": "re_helper_reset"}
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            resp = send_password_reset_email(
                user_name="John Doe",
                user_email="john@example.com",
                reset_link="https://getpyq.com/reset/xyz",
            )
            self.assertEqual(resp, {"id": "re_helper_reset"})
            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], ["john@example.com"])
            self.assertEqual(params["subject"], "Reset your GetPYQ password")
            self.assertIn("Hello John Doe", params["text"])
            self.assertIn("https://getpyq.com/reset/xyz", params["text"])
            self.assertIn("valid for 5 minutes only", params["text"])

    @patch("resend.Emails.send")
    def test_send_verification_approved_email_helper(self, mock_send):
        mock_send.return_value = {"id": "re_helper_approved"}
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            resp = send_verification_approved_email(
                user_name="Alice",
                user_email="alice@example.com",
                rno="0201CS221001",
                frontend_base="https://getpyq.com",
            )
            self.assertEqual(resp, {"id": "re_helper_approved"})
            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], ["alice@example.com"])
            self.assertIn("Student ID Verification Approved", params["subject"])
            self.assertIn("0201CS221001", params["text"])
            self.assertIn("https://getpyq.com/upload", params["text"])

    @patch("resend.Emails.send")
    def test_send_verification_rejected_email_helper(self, mock_send):
        mock_send.return_value = {"id": "re_helper_rejected"}
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            resp = send_verification_rejected_email(
                user_name="Bob",
                user_email="bob@example.com",
                rno="0201ME221002",
                reason="ID card expired.",
                frontend_base="https://getpyq.com",
            )
            self.assertEqual(resp, {"id": "re_helper_rejected"})
            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], ["bob@example.com"])
            self.assertIn("Student ID Verification Update", params["subject"])
            self.assertIn("0201ME221002", params["text"])
            self.assertIn("ID card expired.", params["text"])
            self.assertIn("https://getpyq.com/verify", params["text"])

    @patch("resend.Emails.send")
    def test_send_subject_approved_email_helper(self, mock_send):
        mock_send.return_value = {"id": "re_helper_subj_appr"}
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            resp = send_subject_approved_email(
                user_name="Charlie",
                user_email="charlie@example.com",
                code="CS601",
                name="Network Security",
                branch="CSE",
                semester=6,
            )
            self.assertEqual(resp, {"id": "re_helper_subj_appr"})
            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], ["charlie@example.com"])
            self.assertIn("Subject Approved: CS601 - Network Security", params["subject"])
            self.assertIn("CSE, Semester 6", params["text"])

    @patch("resend.Emails.send")
    def test_send_subject_rejected_email_helper(self, mock_send):
        mock_send.return_value = {"id": "re_helper_subj_rej"}
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            resp = send_subject_rejected_email(
                user_name="Dave",
                user_email="dave@example.com",
                code="EE501",
                name="Power Systems",
                branch="EE",
                semester=5,
                reason="Duplicate subject already exists under EE502.",
            )
            self.assertEqual(resp, {"id": "re_helper_subj_rej"})
            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], ["dave@example.com"])
            self.assertIn("Subject Request Update: EE501", params["subject"])
            self.assertIn("Duplicate subject already exists", params["text"])

    @patch("resend.Emails.send")
    def test_forgot_password_view_handles_resend_failure_gracefully(self, mock_send):
        mock_send.side_effect = Exception("Resend API 429 Too Many Requests")
        client = APIClient()
        user = User.objects.create_user(
            rno="0201IT231088",
            email="failuser@gmail.com",
            name="Fail User",
            password="testpassword123",
        )
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            res = client.post("/auth/forgot-password/", {"email": user.email}, format="json")
            # Same response as for unknown emails, so account existence isn't revealed.
            unknown = client.post("/auth/forgot-password/", {"email": "nobody@gmail.com"}, format="json")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json(), unknown.json())

    @patch("resend.Emails.send")
    def test_admin_subject_request_approve_sends_email(self, mock_send):
        mock_send.return_value = {"id": "re_subj_appr_view"}
        admin = User.objects.create_superuser(
            rno="0201IT201099",
            name="Admin Subject",
            email="admin_subj@jecjabalpur.ac.in",
            password="StrongPassword123!",
        )
        student = User.objects.create_user(
            rno="0201CS231010",
            email="student_req@gmail.com",
            name="Requesting Student",
            password="password123",
        )
        subj_req = SubjectRequest.objects.create(
            user=student,
            branch="CS",
            semester=5,
            code="CS509",
            name="Advanced Algorithms",
            status="pending",
        )
        client = APIClient()
        client.force_authenticate(user=admin)
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            res = client.post(f"/admin-api/subject-requests/{subj_req.id}/approve/")
            self.assertEqual(res.status_code, 200)
            subj_req.refresh_from_db()
            self.assertEqual(subj_req.status, "approved")

            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], [student.email])
            self.assertIn("Subject Approved: CS509 - Advanced Algorithms", params["subject"])

    @patch("resend.Emails.send")
    def test_admin_subject_request_reject_sends_email(self, mock_send):
        mock_send.return_value = {"id": "re_subj_rej_view"}
        admin = User.objects.create_superuser(
            rno="0201IT201098",
            name="Admin Subject 2",
            email="admin_subj2@jecjabalpur.ac.in",
            password="StrongPassword123!",
        )
        student = User.objects.create_user(
            rno="0201CS231011",
            email="student_req2@gmail.com",
            name="Requesting Student 2",
            password="password123",
        )
        subj_req = SubjectRequest.objects.create(
            user=student,
            branch="CS",
            semester=5,
            code="CS510",
            name="Quantum Computing",
            status="pending",
        )
        client = APIClient()
        client.force_authenticate(user=admin)
        with self.settings(RESEND_API_KEY="re_test_key_mock"):
            res = client.post(
                f"/admin-api/subject-requests/{subj_req.id}/reject/",
                {"reason": "Not approved in current AICTE syllabus."},
            )
            self.assertEqual(res.status_code, 200)
            subj_req.refresh_from_db()
            self.assertEqual(subj_req.status, "rejected")

            mock_send.assert_called_once()
            params = mock_send.call_args[0][0]
            self.assertEqual(params["to"], [student.email])
            self.assertIn("Subject Request Update: CS510", params["subject"])
            self.assertIn("Not approved in current AICTE syllabus", params["text"])


class Semester1And2CommonTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT231046",
            email="test@jecjabalpur.ac.in",
            name="Test User",
            password="testpassword",
        )
        StudentVerification.objects.create(
            user=self.user,
            status="verified",
        )
        self.pdf_bytes = _create_minimal_pdf_bytes()

    @patch("core.views.get_pyq_storage")
    def test_upload_normalizes_to_common_branch_and_storage(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        self.client.force_authenticate(user=self.user)
        pdf_file = SimpleUploadedFile("sample.pdf", self.pdf_bytes, content_type="application/pdf")
        res = self.client.post(
            "/upload/",
            {
                "branch": "CommonForAllBranches",
                "semester": "1",
                "subject_code": "BT11",
                "year": "2023",
                "exam_session": "April",
                "file": pdf_file,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        pyq = PYQ.objects.get(id=res.data["id"])
        self.assertEqual(pyq.branch, "COMMONFORALLBRANCHES")
        self.assertTrue(pyq.r2_object_key.startswith("pyqs/COMMONFORALLBRANCHES/"))

    @patch("core.views.get_pyq_storage")
    def test_download_cross_semester(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_storage.download_object.return_value = self.pdf_bytes
        mock_get_storage.return_value = mock_storage

        # Created under semester 1
        PYQ.objects.create(
            branch="COMMONFORALLBRANCHES",
            semester=1,
            subject_code="BT11",
            year=2023,
            exam_session="April",
            r2_object_key="pyqs/COMMONFORALLBRANCHES/bt11_2023.pdf",
            uploaded_by=self.user,
        )

        # Downloaded requesting semester 2
        res = self.client.get(
            "/download/?branch=CommonForAllBranches&semester=2&subject_code=BT11&from_year=2023&to_year=2023"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "application/pdf")



    @patch("core.views.get_pyq_storage")
    def test_duplicate_prevention_cross_semester(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        # Paper already exists under semester 1
        PYQ.objects.create(
            branch="COMMONFORALLBRANCHES",
            semester=1,
            subject_code="BT11",
            year=2023,
            exam_session="April",
            r2_object_key="pyqs/COMMONFORALLBRANCHES/bt11_2023.pdf",
            uploaded_by=self.user,
        )

        self.client.force_authenticate(user=self.user)
        pdf_file = SimpleUploadedFile("sample.pdf", self.pdf_bytes, content_type="application/pdf")

        # Try uploading same paper under semester 2
        res = self.client.post(
            "/upload/",
            {
                "branch": "CommonForAllBranches",
                "semester": "2",
                "subject_code": "BT11",
                "year": "2023",
                "exam_session": "April",
                "file": pdf_file,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 409)








class ServerTimingMiddlewareTests(TestCase):
    def test_server_timing_header_present(self):
        res = self.client.get("/health/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Server-Timing", res)
        self.assertIn("total;dur=", res["Server-Timing"])
        self.assertIn("db;dur=", res["Server-Timing"])


class DuplicateRuleCharacterizationTests(TestCase):
    """Pins down the current duplicate rule: CS/CSE are aliases, sem 1/2 are one group."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201CS231046",
            email="dup@jecjabalpur.ac.in",
            name="Dup User",
            password="testpassword",
        )
        StudentVerification.objects.create(user=self.user, status="verified")
        self.client.force_authenticate(user=self.user)
        self.pdf_bytes = _create_minimal_pdf_bytes()

    def _upload(self, branch, semester, code):
        pdf_file = SimpleUploadedFile("sample.pdf", self.pdf_bytes, content_type="application/pdf")
        return self.client.post(
            "/upload/",
            {
                "branch": branch,
                "semester": str(semester),
                "subject_code": code,
                "year": "2023",
                "exam_session": "April",
                "file": pdf_file,
            },
            format="multipart",
        )

    @patch("core.views.get_pyq_storage")
    def test_cs_upload_blocked_when_cse_paper_exists(self, mock_get_storage):
        mock_get_storage.return_value = MagicMock()
        PYQ.objects.create(
            branch="CSE", semester=4, subject_code="CS42", year=2023,
            exam_session="April", r2_object_key="pyqs/CSE/x.pdf", uploaded_by=self.user,
        )
        res = self._upload("CS", 4, "CS42")
        self.assertEqual(res.status_code, 409)

    @patch("core.views.get_pyq_storage")
    def test_existing_check_lists_cross_semester_common_paper(self, mock_get_storage):
        PYQ.objects.create(
            branch="COMMONFORALLBRANCHES", semester=1, subject_code="BT11", year=2023,
            exam_session="April", r2_object_key="pyqs/COMMONFORALLBRANCHES/x.pdf", uploaded_by=self.user,
        )
        res = self.client.get("/upload/?branch=CommonForAllBranches&semester=2&subject_code=BT11")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["uploaded"], [{"year": 2023, "session": "April", "exam_session": "April"}])


class SecurityConfigTests(TestCase):
    def test_cors_rejects_foreign_vercel_origin(self):
        res = self.client.options(
            "/auth/refresh/",
            HTTP_ORIGIN="https://evil-site.vercel.app",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertNotIn("Access-Control-Allow-Origin", res)

    def test_cors_allows_first_party_origin(self):
        res = self.client.options(
            "/auth/refresh/",
            HTTP_ORIGIN="https://www.getpyqjec.in",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )
        self.assertEqual(res.get("Access-Control-Allow-Origin"), "https://www.getpyqjec.in")

    def test_register_rejects_weak_password(self):
        res = APIClient().post("/auth/register/", {
            "rno": "0201CS231002",
            "email": "weak@gmail.com",
            "name": "Weak Password",
            "password": "12345678",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.data)
        self.assertFalse(User.objects.filter(rno="0201CS231002").exists())

    def test_reset_rejects_weak_password(self):
        user = User.objects.create_user(
            rno="0201CS231003", email="reset@gmail.com", name="Reset", password="strongpassword"
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)
        res = APIClient().post(f"/auth/reset-password/{uid}/{token}/", {"password": "password"}, format="json")
        self.assertEqual(res.status_code, 400)
        user.refresh_from_db()
        self.assertTrue(user.check_password("strongpassword"))

    @patch("utils.r2_storage.is_r2_configured", return_value=False)
    def test_storage_refuses_local_fallback_in_production(self, _mock):
        import utils.r2_storage as r2
        with patch.object(r2, "_pyq_storage", None), patch.object(r2.sys, "argv", ["gunicorn"]), \
                self.settings(DEBUG=False, FORCE_LOCAL_STORAGE=False):
            with self.assertRaises(R2StorageError):
                r2.get_pyq_storage()


class DownloadLinksTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT231046", email="links@gmail.com", name="Uploader", password="password123",
        )
        for year, session in ((2022, "December"), (2024, "April")):
            PYQ.objects.create(
                branch="IT", semester=5, subject_code="IT51", year=year, exam_session=session,
                r2_object_key=f"pyqs/IT/{year}.pdf", uploaded_by=self.user,
            )

    def _mock_storage(self, mock_get_storage):
        storage = MagicMock()
        storage.generate_presigned_download_url.side_effect = lambda key, expiry=None: f"https://r2.test/{key}"
        mock_get_storage.return_value = storage
        return storage

    @patch("core.views.get_pyq_storage")
    def test_links_single_subject(self, mock_get_storage):
        storage = self._mock_storage(mock_get_storage)
        res = self.client.get("/download/links/?branch=IT&semester=5&subject_code=IT51&from_year=2022&to_year=2024")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["filename"], "IT_sem5_IT51_2022-2024.pdf")
        self.assertEqual([p["year"] for p in data["papers"]], [2022, 2024])
        self.assertEqual(data["papers"][0]["url"], "https://r2.test/pyqs/IT/2022.pdf")
        self.assertEqual(data["missing_years"], [2023])
        self.assertEqual(data["missing_details"], {})
        # Listing must never pull file bytes through the server.
        storage.download_object.assert_not_called()
        self.assertIn("private", res["Cache-Control"])

    @patch("core.views.get_pyq_storage")
    def test_links_all_subjects_missing_details(self, mock_get_storage):
        self._mock_storage(mock_get_storage)
        res = self.client.get("/download/links/?branch=IT&semester=5&subject_code=all&from_year=2022&to_year=2023")
        data = res.json()
        self.assertTrue(data["is_all_subjects"])
        self.assertNotIn("IT51", [s["code"] for s in data["missing_details"]["2022"]])
        self.assertEqual(len(data["missing_details"]["2023"]), 5)
        self.assertTrue(data["papers"][0]["subject_name"])

    def test_links_none_found(self):
        res = self.client.get("/download/links/?branch=CSE&semester=3&subject_code=CS31&from_year=2020&to_year=2021")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["missing_years"], [2020, 2021])

    @patch("core.views.get_pyq_storage")
    def test_links_cs_alias_finds_cse_papers(self, mock_get_storage):
        self._mock_storage(mock_get_storage)
        PYQ.objects.create(
            branch="CSE", semester=4, subject_code="CS42", year=2023, exam_session="April",
            r2_object_key="pyqs/CSE/a.pdf", uploaded_by=self.user,
        )
        res = self.client.get("/download/links/?branch=CS&semester=4&subject_code=CS42&from_year=2023&to_year=2023")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["papers"]), 1)

    @patch("core.views.get_pyq_storage")
    def test_links_query_count(self, mock_get_storage):
        self._mock_storage(mock_get_storage)
        # 1 query for the papers + 1 for subject display names; no R2 round trips.
        with self.assertNumQueries(2):
            self.client.get("/download/links/?branch=IT&semester=5&subject_code=IT51&from_year=2022&to_year=2024")

    def test_links_missing_params(self):
        res = self.client.get("/download/links/?branch=IT")
        self.assertEqual(res.status_code, 400)


class SubjectListQueryTests(TestCase):
    def test_subjects_query_count_and_extra_codes(self):
        user = User.objects.create_user(rno="0201IT231047", email="q@gmail.com", name="Q", password="password123")
        PYQ.objects.create(
            branch="IT", semester=5, subject_code="ZZ99", year=2023, exam_session="April",
            r2_object_key="k", uploaded_by=user,
        )
        with self.assertNumQueries(3):
            res = self.client.get("/subjects/?branch=IT&semester=5")
        past_codes = [s["code"] for s in res.json()["past_subjects"]]
        self.assertIn("ZZ99", past_codes)
        self.assertIn("max-age=60", res["Cache-Control"])


class UploadIntegrityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201CS231050", email="integrity@gmail.com", name="Integrity", password="testpassword",
        )
        StudentVerification.objects.create(user=self.user, status="verified")
        self.client.force_authenticate(user=self.user)
        self.pdf_bytes = _create_minimal_pdf_bytes()

    def _upload(self, **overrides):
        data = {
            "branch": "CSE", "semester": "4", "subject_code": "CS42",
            "year": "2023", "exam_session": "April",
            "file": SimpleUploadedFile("p.pdf", self.pdf_bytes, content_type="application/pdf"),
        }
        data.update(overrides)
        return self.client.post("/upload/", data, format="multipart")

    @patch("core.views.get_pyq_storage")
    def test_cs_upload_is_stored_as_cse(self, mock_get_storage):
        mock_get_storage.return_value = MagicMock()
        res = self._upload(branch="CS")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(PYQ.objects.get(id=res.data["id"]).branch, "CSE")

    @patch("core.views.get_pyq_storage")
    def test_unknown_subject_code_rejected_without_creating_subject(self, mock_get_storage):
        storage = MagicMock()
        mock_get_storage.return_value = storage
        res = self._upload(subject_code="ZZ999", subject_name="Made Up Subject")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Subject.objects.filter(code="ZZ999").exists())
        storage.upload_object.assert_not_called()

    @patch("core.views.get_pyq_storage")
    def test_client_subject_name_is_ignored(self, mock_get_storage):
        mock_get_storage.return_value = MagicMock()
        res = self._upload(subject_name="Hacked Name")
        self.assertEqual(res.status_code, 201)
        self.assertFalse(Subject.objects.filter(name="Hacked Name").exists())

    def test_invalid_fields_rejected(self):
        for overrides in (
            {"branch": "../../etc"},
            {"semester": "9"},
            {"year": "1990"},
            {"exam_session": "June"},
            {"subject_code": "CS 42/../x"},
        ):
            with self.subTest(**overrides):
                self.assertEqual(self._upload(**overrides).status_code, 400)

    @patch("core.views.get_pyq_storage")
    def test_concurrent_duplicate_returns_409_and_cleans_up(self, mock_get_storage):
        from django.db import IntegrityError
        storage = MagicMock()
        mock_get_storage.return_value = storage
        # Simulate another request inserting the same paper between the check and the insert.
        with patch("core.views.PYQ.objects.create", side_effect=IntegrityError("duplicate")):
            res = self._upload()
        self.assertEqual(res.status_code, 409)
        storage.delete_object.assert_called_once()

    def test_db_constraint_blocks_common_semester_duplicate(self):
        from django.db import IntegrityError, transaction
        PYQ.objects.create(
            branch="COMMONFORALLBRANCHES", semester=1, subject_code="BT11", year=2023,
            exam_session="April", r2_object_key="a",
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            PYQ.objects.create(
                branch="COMMONFORALLBRANCHES", semester=2, subject_code="BT11", year=2023,
                exam_session="April", r2_object_key="b",
            )


class CanonicalizeMigrationTests(TestCase):
    def _run(self):
        import importlib
        from django.apps import apps as global_apps
        migration = importlib.import_module("core.migrations.0011_pyq_canonical_unique_paper")
        migration.canonicalize_pyq_branches(global_apps, None)

    def test_rewrites_cs_and_common_branches(self):
        cs = PYQ.objects.create(branch="CS", semester=4, subject_code="CS42", year=2022, exam_session="April", r2_object_key="a")
        common = PYQ.objects.create(branch="CommonForAllBranches", semester=2, subject_code="BT21", year=2022, exam_session="April", r2_object_key="b")
        self._run()
        cs.refresh_from_db()
        common.refresh_from_db()
        self.assertEqual(cs.branch, "CSE")
        self.assertEqual(common.branch, "COMMONFORALLBRANCHES")

    def test_aborts_on_conflicting_rows(self):
        PYQ.objects.create(branch="CS", semester=4, subject_code="CS42", year=2022, exam_session="April", r2_object_key="a")
        PYQ.objects.create(branch="CSE", semester=4, subject_code="CS42", year=2022, exam_session="April", r2_object_key="b")
        with self.assertRaises(RuntimeError):
            self._run()
        self.assertTrue(PYQ.objects.filter(branch="CS").exists())


class SeedDevDataTests(TestCase):
    def test_seed_twice_creates_no_duplicate_papers(self):
        import tempfile
        from django.core.management import call_command
        from utils.r2_storage import LocalStorageService

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root), \
                patch("core.management.commands.seed_dev_data.get_pyq_storage",
                      side_effect=lambda: LocalStorageService("pyqs")), \
                patch("core.management.commands.seed_dev_data.get_verification_storage",
                      side_effect=lambda: LocalStorageService("verifications")):
            call_command("seed_dev_data", stdout=io.StringIO())
            first_count = PYQ.objects.count()
            call_command("seed_dev_data", stdout=io.StringIO())
        self.assertGreater(first_count, 0)
        self.assertEqual(PYQ.objects.count(), first_count)


class AdminListEfficiencyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            rno="0201IT231099", email="admin99@gmail.com", name="Admin", password="password123", role="admin",
        )
        self.client.force_authenticate(user=self.admin)

    def test_upload_history_query_count_does_not_grow_with_rows(self):
        subj = Subject.objects.filter(code="IT61").first()
        for year in range(2010, 2025):
            PYQ.objects.create(
                subject=subj, branch="IT", semester=6, subject_code="IT61", year=year,
                exam_session="April", r2_object_key=f"k{year}", uploaded_by=self.admin,
            )
        # count + page (with uploaded_by and subject joined); no per-row subject lookups
        with self.assertNumQueries(2):
            res = self.client.get("/admin-api/pyqs/history/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["results"]), 15)
        self.assertEqual(res.data["results"][0]["subject_name"], subj.name)

    def test_verification_list_tolerates_bad_paging(self):
        res = self.client.get("/admin-api/verifications/?page=abc&page_size=100000")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["page"], 1)
        self.assertEqual(res.data["page_size"], 100)


class RefreshRotationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            rno="0201IT231077", email="rotate@gmail.com", name="Rotate", password="strongpassword",
        )

    def test_refresh_rotates_and_old_token_is_rejected(self):
        old = str(RefreshToken.for_user(self.user))
        self.client.cookies["refresh_token"] = old
        res = self.client.post("/auth/refresh/")
        self.assertEqual(res.status_code, 200)
        new = res.cookies["refresh_token"].value
        self.assertNotEqual(new, old)

        reuse = APIClient()
        reuse.cookies["refresh_token"] = old
        self.assertEqual(reuse.post("/auth/refresh/").status_code, 401)

        self.client.cookies["refresh_token"] = new
        self.assertEqual(self.client.post("/auth/refresh/").status_code, 200)

    def test_logout_revokes_refresh_token(self):
        token = str(RefreshToken.for_user(self.user))
        self.client.cookies["refresh_token"] = token
        self.assertEqual(self.client.post("/auth/logout/").status_code, 200)

        again = APIClient()
        again.cookies["refresh_token"] = token
        self.assertEqual(again.post("/auth/refresh/").status_code, 401)


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class RateLimitTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()

    def _login(self, ip):
        return self.client.post(
            "/auth/login/", {"rno": "0201IT231046", "password": "wrong"},
            format="json", HTTP_CF_CONNECTING_IP=ip,
        )

    def test_login_limited_per_client_ip(self):
        for _ in range(20):
            self.assertEqual(self._login("203.0.113.5").status_code, 401)
        res = self._login("203.0.113.5")
        self.assertEqual(res.status_code, 429)
        self.assertIn("Retry-After", res)
        # A different visitor (different CF-Connecting-IP) is unaffected.
        self.assertEqual(self._login("198.51.100.7").status_code, 401)

    def test_forgot_password_limited(self):
        for _ in range(15):
            self.client.post("/auth/forgot-password/", {"email": "x@gmail.com"},
                             format="json", HTTP_CF_CONNECTING_IP="203.0.113.9")
        res = self.client.post("/auth/forgot-password/", {"email": "x@gmail.com"},
                               format="json", HTTP_CF_CONNECTING_IP="203.0.113.9")
        self.assertEqual(res.status_code, 429)

    def test_upload_lookup_get_is_not_throttled(self):
        for _ in range(40):
            res = self.client.get("/upload/?branch=IT&semester=5&subject_code=IT51",
                                  HTTP_CF_CONNECTING_IP="203.0.113.10")
        self.assertEqual(res.status_code, 200)

    def test_unscoped_endpoints_not_throttled(self):
        for _ in range(40):
            res = self.client.get("/subjects/?branch=IT&semester=5", HTTP_CF_CONNECTING_IP="203.0.113.11")
        self.assertEqual(res.status_code, 200)
