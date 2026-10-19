import hashlib
import io
import logging
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageDraw

from core.models import User, Subject, PYQ, StudentVerification, SubjectRequest
from core.academics import scope_filter
from utils.r2_storage import get_pyq_storage, get_verification_storage, LocalStorageService

logger = logging.getLogger(__name__)


def generate_sample_pdf(title: str, subject_code: str, year: int, session: str) -> bytes:
    """Generate a valid sample 1-page PDF using pikepdf or minimal PDF specification."""
    try:
        import pikepdf
        pdf = pikepdf.new()
        pdf.add_blank_page(page_size=(595.276, 841.890))  # Standard A4 size
        buf = io.BytesIO()
        pdf.save(buf)
        buf.seek(0)
        return buf.getvalue()
    except Exception:
        # Fallback to raw valid minimal PDF specification
        content = f"Jabalpur Engineering College - {subject_code} ({year} {session}) - {title}"
        return (
            b"%PDF-1.4\n"
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n"
            b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
            b"5 0 obj<</Length 80>>stream\n"
            b"BT /F1 16 Tf 50 720 Td (" + content[:70].encode("ascii", "ignore") + b") Tj ET\n"
            b"endstream\nendobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n0000000213 00000 n \n0000000281 00000 n \n"
            b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n415\n%%EOF\n"
        )


def generate_sample_id_image() -> bytes:
    """Generate a sample student ID card image for local verification review testing."""
    img = Image.new("RGB", (420, 260), color="#1e1b2e")
    draw = ImageDraw.Draw(img)
    # Draw simple ID card representation
    draw.rectangle([10, 10, 410, 250], outline="#a855f7", width=2)
    draw.rectangle([20, 20, 400, 60], fill="#3b2d54")
    draw.text((30, 32), "JABALPUR ENGINEERING COLLEGE", fill="#f3e8ff")
    draw.text((30, 80), "STUDENT ID CARD (DEMO MOCK)", fill="#c084fc")
    draw.rectangle([30, 110, 110, 210], fill="#2d283e", outline="#c084fc")
    draw.text((45, 155), "[PHOTO]", fill="#94a3b8")
    draw.text((130, 115), "Name: Priya Patel", fill="#EFEEE8")
    draw.text((130, 140), "Roll: 0201ME231012", fill="#EFEEE8")
    draw.text((130, 165), "Branch: Mechanical Engg", fill="#EFEEE8")
    draw.text((130, 190), "Session: 2023-2027", fill="#a855f7")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


class Command(BaseCommand):
    help = "Seeds database with demo users, sample PYQ papers with actual PDF files, and verification requests for local development."

    def handle(self, *args, **options):
        db_engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite" not in db_engine:
            raise CommandError(
                f"SAFETY ABORT: seed_dev_data can ONLY be run against local SQLite! "
                f"Current database engine is '{db_engine}'. "
                "Ensure CONTRIBUTOR_MODE=True is set in .env."
            )

        pyq_storage = get_pyq_storage()
        verification_storage = get_verification_storage()

        if not isinstance(pyq_storage, LocalStorageService):
            raise CommandError(
                "SAFETY ABORT: seed_dev_data can ONLY be run with local disk storage! "
                "Cloudflare R2 is currently active. Ensure CONTRIBUTOR_MODE=True is set in .env."
            )

        self.stdout.write(self.style.NOTICE(">>> Starting development database seeding..."))

        # -------------------------------------------------------------------
        # 1. Seed Users
        # -------------------------------------------------------------------
        # Admin User
        admin_user, created = User.objects.get_or_create(
            rno="0201IT211001",
            defaults={
                "email": "admin@jecjabalpur.ac.in",
                "name": "JEC Admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("admin123")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.role = "admin"
        admin_user.save()
        StudentVerification.objects.update_or_create(
            user=admin_user,
            defaults={"status": "verified", "reviewed_at": timezone.now()},
        )
        self.stdout.write(self.style.SUCCESS(f"  [+] Admin account ready: {admin_user.email} (Password: admin123)"))

        # Verified Student User
        student_user, _ = User.objects.get_or_create(
            rno="0201CS221045",
            defaults={
                "email": "student@jecjabalpur.ac.in",
                "name": "Rahul Sharma",
                "role": "contributor",
            },
        )
        student_user.set_password("student123")
        student_user.save()
        StudentVerification.objects.update_or_create(
            user=student_user,
            defaults={"status": "verified", "reviewed_at": timezone.now()},
        )
        self.stdout.write(self.style.SUCCESS(f"  [+] Verified Student ready: {student_user.email} (Password: student123)"))

        # Pending Verification Student User (for testing admin moderation)
        pending_user, _ = User.objects.get_or_create(
            rno="0201ME231012",
            defaults={
                "email": "pending@jecjabalpur.ac.in",
                "name": "Priya Patel",
                "role": "contributor",
            },
        )
        pending_user.set_password("student123")
        pending_user.save()

        # Upload sample student ID card image
        mock_id_key = "verification/demo_student_id.png"
        id_image_bytes = generate_sample_id_image()
        try:
            verification_storage.upload_object(
                key=mock_id_key,
                data=id_image_bytes,
                content_type="image/png",
            )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Warning uploading mock ID: {e}"))

        StudentVerification.objects.update_or_create(
            user=pending_user,
            defaults={
                "status": "pending",
                "r2_object_key": mock_id_key,
                "submitted_at": timezone.now(),
            },
        )
        self.stdout.write(self.style.SUCCESS(f"  [+] Pending Review Student ready: {pending_user.email} (Password: student123)"))

        # -------------------------------------------------------------------
        # 2. Seed Sample Subject Requests (for testing unlisted subject approval)
        # -------------------------------------------------------------------
        sub_req, _ = SubjectRequest.objects.get_or_create(
            user=student_user,
            code="CS508",
            defaults={
                "branch": "CS",
                "semester": 5,
                "name": "Cloud Computing & DevOps",
                "status": "pending",
            },
        )
        self.stdout.write(self.style.SUCCESS("  [+] Sample unlisted subject request created (CS508)"))

        # -------------------------------------------------------------------
        # 3. Seed Sample PYQ Papers with Real PDF Files
        # -------------------------------------------------------------------
        sample_subjects = Subject.objects.filter(is_current=True)
        if not sample_subjects.exists():
            self.stdout.write(self.style.WARNING("  No subjects found. Running subject seed first..."))
            from core.curriculum import SUBJECTS, SUBJECT_CODE_TO_NAME
            SEMESTER_MAP = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8}
            for branch_key, semesters in SUBJECTS.items():
                for sem_key, subject_list in semesters.items():
                    sem_num = SEMESTER_MAP.get(sem_key)
                    if not sem_num:
                        continue
                    for name, code in subject_list:
                        Subject.objects.get_or_create(
                            branch=branch_key,
                            semester=sem_num,
                            code=str(code).strip().upper(),
                            name=str(name).strip(),
                            defaults={'is_current': True},
                        )

        # Select subjects to attach papers to, explicitly including 1st-year common subjects
        target_subjects = []
        # Ensure common 1st-year subjects are targeted
        for code in ["BT11", "BT12", "BT14", "BT23"]:
            sub = Subject.objects.filter(code=code).first()
            if sub:
                target_subjects.append(sub)

        # Also add higher semester sample subjects
        for branch, sem in [("CSE", 3), ("CSE", 4), ("IT", 3), ("ME", 3)]:
            sub = Subject.objects.filter(branch=branch, semester=sem).first()
            if sub and sub not in target_subjects:
                target_subjects.append(sub)

        pyq_count = 0
        paper_specs = [
            (2023, "December"),
            (2022, "December"),
            (2021, "April"),
        ]

        for subj in target_subjects:
            is_common = subj.semester <= 2 or subj.branch in ("CommonForAllBranches", "COMMONFORALLBRANCHES")
            storage_branch = "COMMONFORALLBRANCHES" if is_common else subj.branch
            db_branch = "COMMONFORALLBRANCHES" if is_common else subj.branch

            for year, session in paper_specs:
                object_key = f"pyqs/{storage_branch}/sample_{subj.code}_{year}_{session}.pdf"
                pdf_bytes = generate_sample_pdf(subj.name, subj.code, year, session)
                file_hash = hashlib.sha256(pdf_bytes).hexdigest()

                try:
                    pyq_storage.upload_object(
                        key=object_key,
                        data=pdf_bytes,
                        content_type="application/pdf",
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  Error uploading sample PDF for {subj.code}: {e}"))

                # Match across the semester 1/2 group so re-seeding never creates a
                # second copy of a common paper (blocked by the pyq_unique_paper constraint).
                existing = PYQ.objects.filter(
                    **scope_filter(db_branch, subj.semester),
                    subject_code=subj.code,
                    year=year,
                    exam_session=session,
                ).first()
                fields = {
                    "subject": subj,
                    "r2_object_key": object_key,
                    "file_hash": file_hash,
                    "uploaded_by": admin_user,
                }
                if existing:
                    PYQ.objects.filter(pk=existing.pk).update(**fields)
                else:
                    PYQ.objects.create(
                        branch=db_branch,
                        semester=subj.semester,
                        subject_code=subj.code,
                        year=year,
                        exam_session=session,
                        **fields,
                    )
                pyq_count += 1

        self.stdout.write(self.style.SUCCESS(f"  [+] {pyq_count} sample PYQ papers seeded with generated PDF files."))

        # -------------------------------------------------------------------
        # Summary Credentials Output
        # -------------------------------------------------------------------
        self.stdout.write("\n" + "=" * 62)
        self.stdout.write(self.style.SUCCESS("DEV SEED DATA COMPLETE! READY TO TEST"))
        self.stdout.write("=" * 62)
        self.stdout.write("Admin Account:     admin@jecjabalpur.ac.in   / admin123")
        self.stdout.write("Verified Student:  student@jecjabalpur.ac.in / student123")
        self.stdout.write("Pending Student:   pending@jecjabalpur.ac.in / student123")
        self.stdout.write("-" * 62)
        self.stdout.write("Sample PYQs available for:")
        for subj in target_subjects:
            self.stdout.write(f"   * {subj.branch} - Semester {subj.semester} - {subj.code} ({subj.name})")
        self.stdout.write("=" * 62 + "\n")
