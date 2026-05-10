from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.http import FileResponse, JsonResponse
from django.shortcuts import render
from django.contrib.auth import authenticate

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
        
        response = Response({
            "access": str(refresh.access_token),
            "user": {
                "rno": user.rno,
                "email": user.email,
                "name": user.name,
                "role": user.role,
            }
        }, status=201)
        
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=False, #change to True in prodcution
            samesite="Lax", #change to Strict in production
            path="/",
        )
        
        return response
        
class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        rno = request.data.get("rno")
        password = request.data.get("password")
        
        user = authenticate(request, username=rno, password=password)
        
        if user is None:
            return Response({"error": "Invalid credentials"}, status=401)
        
        refresh = RefreshToken.for_user(user)
        
        response = Response(
            {
                "access": str(refresh.access_token),
                "user": {
                    "rno": user.rno,
                    "email": user.email,
                    "name": user.name,
                    "role": user.role,
                },
            },
            status=200,
        )
        
        # set HttpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            secure=False, # True in production
            samesite="Lax",
        )
        
        return response
    
class RefreshView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        
        if not refresh_token:
            return Response({"error": "No refresh token"}, status=401)
        
        try:
            refresh = RefreshToken(refresh_token)
            access = str(refresh.access_token)
            
            return Response({"access": access}, status=200)
        
        except TokenError as e:
            print("TokenError:", str(e))
            return Response({"error": "Invalid refresh token"}, status=401)
        
class LogoutView(APIView):
    def post(self, request):
        response = Response({"message": "Logged out"}, status=200)
        
        response.delete_cookie("refresh_token")
        
        return response
        
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
    
    
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

from django.core.mail import send_mail

token_generator = PasswordResetTokenGenerator()

class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get("email")
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "If account exists, reset link sent"})
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)
        
        reset_link = f"http://localhost:5173/reset-password/{uid}/{token}/"
        
        send_mail(
            subject="Reset your GetPYQ password",
            message=f"Hello {user.name},\nClick the link to reset your password:\n{reset_link}\n\nIf you did not request this, ignore this email.",
            from_email=None,
            recipient_list=[user.email],
        )
        
        return Response({"message": "Reset link sent"})
    
from django.utils.http import urlsafe_base64_decode
    
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, uid, token):
        try:
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response({"error": "Invalid link"}, status=400)
        
        if not token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=400)
        
        new_password = request.data.get("password")
        if not new_password:
            return Response({"error": "Password required"}, status=400)
        
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Password reset successful"})