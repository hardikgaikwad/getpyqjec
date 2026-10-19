"""
Cloudflare R2 Storage Service — S3-compatible object storage via boto3.

Provides isolated storage operations for PYQ files and verification documents.
Two singleton instances are configured from Django settings:
  - pyq_storage     → getpyqjec-pyqs bucket
  - verification_storage → getpyqjec-verification bucket (private, no public access)

Never exposes credentials, never logs presigned URLs or sensitive data.
"""

import logging
import mimetypes
import sys
from io import BytesIO
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


class R2StorageError(Exception):
    """Raised when an R2 storage operation fails."""
    pass


class R2NoSuchKeyError(R2StorageError):
    """Raised when an object key does not exist in R2 (NoSuchKey or 404)."""
    pass


class R2StorageService:
    """
    Reusable S3-compatible storage client for Cloudflare R2.

    All operations target a single bucket configured at init time.
    """

    def __init__(self, bucket_name: str):
        endpoint = settings.R2_ENDPOINT_URL
        access_key = settings.R2_ACCESS_KEY_ID
        secret_key = settings.R2_SECRET_ACCESS_KEY

        if not all([endpoint, access_key, secret_key, bucket_name]):
            raise R2StorageError(
                "R2 storage is not configured. Set R2_ENDPOINT_URL, "
                "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and bucket name."
            )

        self.bucket_name = bucket_name
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",  # R2 uses 'auto' region
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    def upload_object(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        metadata: dict | None = None,
    ) -> dict:
        """
        Upload bytes to R2.

        Returns dict with 'key' and 'size'.
        Raises R2StorageError on failure.
        """
        try:
            extra_args = {"ContentType": content_type}
            if metadata:
                extra_args["Metadata"] = metadata

            self._client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                **extra_args,
            )
            return {"key": key, "size": len(data)}
        except (BotoCoreError, ClientError) as e:
            logger.error(f"R2 upload failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to upload object: {e}") from e

    def download_object(self, key: str) -> BytesIO:
        """
        Download an object from R2 into a BytesIO buffer.

        Raises R2StorageError on failure.
        """
        if not key or not str(key).strip():
            raise R2StorageError("Invalid R2 object key: key cannot be empty.")

        try:
            response = self._client.get_object(
                Bucket=self.bucket_name,
                Key=key,
            )
            buffer = BytesIO(response["Body"].read())
            buffer.seek(0)
            return buffer
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("NoSuchKey", "404"):
                logger.warning(f"R2 object not found for key '{key}': {error_code}")
                raise R2NoSuchKeyError(f"Object not found in R2: {key}") from e
            logger.error(f"R2 download failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to download object: {e}") from e
        except BotoCoreError as e:
            logger.error(f"R2 download failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to download object: {e}") from e

    def generate_presigned_download_url(
        self, key: str, expiry: int | None = None
    ) -> str:
        """
        Generate a short-lived presigned URL for downloading an object.

        Args:
            key: Object key in the bucket.
            expiry: URL lifetime in seconds (defaults to R2_PRESIGNED_URL_EXPIRY).

        Returns the presigned URL string.
        Raises R2StorageError on failure.
        """
        if expiry is None:
            expiry = settings.R2_PRESIGNED_URL_EXPIRY

        try:
            url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expiry,
            )
            return url
        except (BotoCoreError, ClientError) as e:
            logger.error(f"R2 presigned URL failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to generate presigned URL: {e}") from e

    def delete_object(self, key: str) -> bool:
        """
        Delete an object from R2.

        Returns True if the operation succeeded (including if object didn't exist).
        Raises R2StorageError on failure.
        """
        try:
            self._client.delete_object(
                Bucket=self.bucket_name,
                Key=key,
            )
            return True
        except (BotoCoreError, ClientError) as e:
            logger.error(f"R2 delete failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to delete object: {e}") from e

    def object_exists(self, key: str) -> bool:
        """
        Check whether an object exists in the bucket.

        Returns True if exists, False if not.
        Raises R2StorageError on unexpected errors.
        """
        try:
            self._client.head_object(
                Bucket=self.bucket_name,
                Key=key,
            )
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            logger.error(f"R2 head failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to check object existence: {e}") from e
        except BotoCoreError as e:
            logger.error(f"R2 head failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to check object existence: {e}") from e

    def get_object_metadata(self, key: str) -> dict:
        """
        Retrieve object metadata (size, content type, custom metadata).

        Returns dict with 'content_type', 'content_length', 'metadata', 'last_modified'.
        Raises R2StorageError on failure.
        """
        try:
            response = self._client.head_object(
                Bucket=self.bucket_name,
                Key=key,
            )
            return {
                "content_type": response.get("ContentType", ""),
                "content_length": response.get("ContentLength", 0),
                "metadata": response.get("Metadata", {}),
                "last_modified": response.get("LastModified"),
            }
        except (BotoCoreError, ClientError) as e:
            logger.error(f"R2 metadata failed for key '{key}': {type(e).__name__}")
            raise R2StorageError(f"Failed to get object metadata: {e}") from e


# ---------------------------------------------------------------------------
# Local Storage Fallback for Development and Testing
# ---------------------------------------------------------------------------
class LocalStorageService:
    """
    Local filesystem fallback storage service for development and testing.
    Mirrors the R2StorageService interface so contributors can run the app
    without Cloudflare R2 credentials.
    """

    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        media_root = Path(getattr(settings, "MEDIA_ROOT", settings.BASE_DIR / "media"))
        self.base_dir = media_root / bucket_name
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload_object(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        metadata: dict | None = None,
    ) -> dict:
        clean_key = key.lstrip("/")
        file_path = self.base_dir / clean_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(data)
        return {"key": clean_key, "size": len(data)}

    def download_object(self, key: str) -> BytesIO:
        if not key or not str(key).strip():
            raise R2StorageError("Invalid object key: key cannot be empty.")
        clean_key = key.lstrip("/")
        file_path = self.base_dir / clean_key
        if not file_path.exists():
            raise R2NoSuchKeyError(f"Object not found in local storage: {key}")
        return BytesIO(file_path.read_bytes())

    def generate_presigned_download_url(
        self, key: str, expiry: int | None = None
    ) -> str:
        clean_key = key.lstrip("/")
        media_url = getattr(settings, "MEDIA_URL", "/media/").rstrip("/")
        # In local development where the React dev server runs on port 5173,
        # prepend the Django backend URL so direct browser clicks resolve correctly.
        backend_host = getattr(settings, "BACKEND_HOST", "http://localhost:8000").rstrip("/")
        return f"{backend_host}{media_url}/{self.bucket_name}/{clean_key}"

    def delete_object(self, key: str) -> bool:
        clean_key = key.lstrip("/")
        file_path = self.base_dir / clean_key
        if file_path.exists():
            file_path.unlink()
        return True

    def object_exists(self, key: str) -> bool:
        clean_key = key.lstrip("/")
        return (self.base_dir / clean_key).exists()

    def get_object_metadata(self, key: str) -> dict:
        clean_key = key.lstrip("/")
        file_path = self.base_dir / clean_key
        if not file_path.exists():
            raise R2NoSuchKeyError(f"Object not found in local storage: {key}")
        stat = file_path.stat()
        mime, _ = mimetypes.guess_type(str(file_path))
        return {
            "content_type": mime or "application/octet-stream",
            "content_length": stat.st_size,
            "metadata": {},
            "last_modified": stat.st_mtime,
        }


# ---------------------------------------------------------------------------
# Singleton instances — lazily created to avoid import-time crashes when
# R2 is not configured (e.g. during tests with mocks).
# Falls back seamlessly to LocalStorageService when R2 keys are absent.
# ---------------------------------------------------------------------------
_pyq_storage = None
_verification_storage = None


def is_r2_configured() -> bool:
    """Check if all required Cloudflare R2 credentials are set."""
    if getattr(settings, "FORCE_LOCAL_STORAGE", False):
        return False
    endpoint = (getattr(settings, "R2_ENDPOINT_URL", "") or "").strip()
    access_key = (getattr(settings, "R2_ACCESS_KEY_ID", "") or "").strip()
    secret_key = (getattr(settings, "R2_SECRET_ACCESS_KEY", "") or "").strip()

    # Reject placeholder values from .env.example
    placeholders = {
        "your_r2_access_key_id",
        "your_r2_secret_access_key",
        "your_cloudflare_account_id",
        "",
    }
    if access_key in placeholders or secret_key in placeholders or "your_cloudflare_account_id" in endpoint:
        return False

    return bool(endpoint and access_key and secret_key)


def _ensure_local_fallback_allowed(purpose: str):
    """
    Refuse the local-disk fallback in production. On Render the disk is wiped on
    every deploy, so silently falling back would "succeed" and then lose files.
    """
    is_testing = "test" in sys.argv
    if getattr(settings, "DEBUG", False) or getattr(settings, "FORCE_LOCAL_STORAGE", False) or is_testing:
        return
    raise R2StorageError(
        f"Cloudflare R2 is not configured for {purpose} and DEBUG is False; "
        "refusing to fall back to local disk storage."
    )


def get_pyq_storage():
    """Get the PYQ bucket storage service instance (Cloudflare R2 or local fallback)."""
    global _pyq_storage
    if _pyq_storage is None:
        bucket = getattr(settings, "R2_PYQ_BUCKET", "getpyqjec-pyqs")
        if is_r2_configured():
            _pyq_storage = R2StorageService(bucket)
        else:
            _ensure_local_fallback_allowed("PYQs")
            logger.info("Cloudflare R2 not configured. Using LocalStorageService for PYQs.")
            _pyq_storage = LocalStorageService(bucket)
    return _pyq_storage


def get_verification_storage():
    """Get the verification bucket storage service instance (Cloudflare R2 or local fallback)."""
    global _verification_storage
    if _verification_storage is None:
        bucket = getattr(settings, "R2_VERIFICATION_BUCKET", "getpyqjec-verification")
        if is_r2_configured():
            _verification_storage = R2StorageService(bucket)
        else:
            _ensure_local_fallback_allowed("verification")
            logger.info("Cloudflare R2 not configured. Using LocalStorageService for verification.")
            _verification_storage = LocalStorageService(bucket)
    return _verification_storage
