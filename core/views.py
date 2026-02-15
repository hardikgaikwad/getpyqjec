from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import FileResponse, JsonResponse
from django.shortcuts import render

import os
from datetime import datetime, timezone

from utils.storage import (
    load_metadata,
    save_metadata,
    normalize_branch,
    normalize_session,
    build_file_path,
)
from utils.finder import get_pdfs
from utils.pdf import compile_pdfs

MAX_PDF_SIZE_MB = 10

from .serializers import RegisterSerializer

from django.contrib.auth import get_user_model

User = get_user_model()


# Create your views here.

def react_app(request):
    return render(request, "index.html")

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "rno": user.rno,
                    "email": user.email,
                    "name": user.name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )
        
class UploadPYQView(APIView):
    permission_classes = [IsAuthenticated]
    
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
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not file.name.lower().endswith(".pdf"):
            return Response(
                {"error": "Only PDF files are allowed"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if file.size > MAX_PDF_SIZE_MB * 1024 * 1024:
            return Response(
                {"error": f"PDF exceeds {MAX_PDF_SIZE_MB}MB limit"},
                 status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            branch = normalize_branch(branch)
            semester = int(semester)
            year = int(year)
            exam_session = normalize_session(exam_session)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        directory, file_path = build_file_path(
            branch, semester, subject_code, year, exam_session
        )
        
        if os.path.exists(file_path):
            return Response(
                {"error": "PYQ already exists for this subject/year/session"},
                status=status.HTTP_409_CONFLICT
            )
            
        os.makedirs(directory, exist_ok=True)
        try:
            with open(file_path, "wb") as dest:
                for chunk in file.chunks():
                    dest.write(chunk)
        except Exception:
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response(
                {"error": "Failed to save file"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        metadata = load_metadata()
        metadata.append({
            "branch": branch,
            "semester": semester,
            "subject_code": subject_code,
            "year": year,
            "exam_session": exam_session,
            "file_path": file_path.replace("\\", "/"),
            "uploaded_by": request.user.rno,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        })
        save_metadata(metadata)
        
        return Response(
            {
                "success": True,
                "path": file_path.replace("\\", "/")
            },
            status=status.HTTP_201_CREATED
        )
        
class DownloadPYQView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        branch = request.GET.get("branch")
        semester = request.GET.get("semester")
        subject_code = request.GET.get("subject_code", "all")
        from_year = request.GET.get("from_year")
        to_year = request.GET.get("to_year")
        
        if not all([branch, semester, subject_code, from_year, to_year]):
            return JsonResponse(
                {"error": "Missing required parameters"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            semester = int(semester)
            from_year = int(from_year)
            to_year = int(to_year)
        except ValueError:
            return JsonResponse(
                {"error": "Invalid year or semester"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pdf_paths = get_pdfs(
            branch=branch.upper(),
            semester=semester,
            subject_code=subject_code,
            from_year=from_year,
            to_year=to_year,
        )
        
        if not pdf_paths:
            return JsonResponse(
                {"error": "No PYQs for given selection"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        merged_pdf = compile_pdfs(pdf_paths)
        
        filename = (
            f"{branch}_sem{semester}_"
            f"{subject_code}_"
            f"{from_year}-{to_year}.pdf"
        )
        
        return FileResponse(
            merged_pdf,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf"
        )