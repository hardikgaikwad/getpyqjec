from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import StudentVerification, PYQ, SubjectRequest
from .curriculum import SUBJECT_CODE_TO_NAME

User = get_user_model()


class PYQUploadHistorySerializer(serializers.ModelSerializer):
    """Admin PYQ upload history serializer returning lean metadata and contributor roll number."""

    uploaded_by_rno = serializers.CharField(source='uploaded_by.rno', read_only=True, default='—')
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = PYQ
        fields = (
            'id',
            'branch',
            'semester',
            'subject_code',
            'subject_name',
            'year',
            'exam_session',
            'uploaded_at',
            'uploaded_by_rno',
        )
        read_only_fields = fields

    def get_subject_name(self, obj):
        # obj.subject is select_related by the view, so this costs no extra query.
        if obj.subject_id and obj.subject:
            return obj.subject.name
        return SUBJECT_CODE_TO_NAME.get(obj.subject_code.strip().upper(), obj.subject_code)



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ("rno", "email", "name", "password")

    def validate(self, attrs):
        candidate = User(rno=attrs.get("rno"), email=attrs.get("email"), name=attrs.get("name"))
        try:
            validate_password(attrs.get("password"), user=candidate)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            rno=validated_data["rno"],
            email=validated_data["email"],
            name=validated_data["name"],
            password=validated_data["password"],
        )


class VerificationStatusSerializer(serializers.ModelSerializer):
    """Read-only status for the authenticated student."""

    class Meta:
        model = StudentVerification
        fields = (
            'status',
            'submitted_at',
            'reviewed_at',
            'rejection_reason',
        )
        read_only_fields = fields


class VerificationAdminListSerializer(serializers.ModelSerializer):
    """Admin list view — minimal fields for moderation queue."""

    user_rno = serializers.CharField(source='user.rno', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = StudentVerification
        fields = (
            'id',
            'user_rno',
            'user_name',
            'user_email',
            'status',
            'submitted_at',
        )
        read_only_fields = fields


class VerificationAdminDetailSerializer(serializers.ModelSerializer):
    """
    Admin detail view — student details and verification status.
    """

    user_rno = serializers.CharField(source='user.rno', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    reviewed_by_rno = serializers.SerializerMethodField()

    class Meta:
        model = StudentVerification
        fields = (
            'id',
            'user_rno',
            'user_name',
            'user_email',
            'status',
            'submitted_at',
            'reviewed_at',
            'reviewed_by_rno',
            'rejection_reason',
        )
        read_only_fields = fields

    def get_reviewed_by_rno(self, obj):
        return obj.reviewed_by.rno if obj.reviewed_by else None


class SubjectRequestSerializer(serializers.ModelSerializer):
    user_rno = serializers.CharField(source='user.rno', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    reviewed_by_rno = serializers.CharField(source='reviewed_by.rno', read_only=True, default='—')

    class Meta:
        model = SubjectRequest
        fields = (
            'id',
            'user_rno',
            'user_name',
            'user_email',
            'branch',
            'semester',
            'code',
            'name',
            'status',
            'submitted_at',
            'reviewed_at',
            'reviewed_by_rno',
            'rejection_reason',
        )
        read_only_fields = fields