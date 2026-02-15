import os
import json
from datetime import datetime
from django.conf import settings

BASE_DATA_DIR = os.path.join(settings.BASE_DIR, "data")
FILES_ROOT = os.path.join(BASE_DATA_DIR, "files")
META_DIR = os.path.join(BASE_DATA_DIR, "metadata")
META_FILE = os.path.join(META_DIR, "pyqs.json")

def ensure_base_dirs():
    os.makedirs(FILES_ROOT, exist_ok=True)
    os.makedirs(META_DIR, exist_ok=True)
    if not os.path.exists(META_FILE):
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
            
def load_metadata():
    ensure_base_dirs()
    with open(META_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
    
def save_metadata(data):
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
def normalize_branch(branch: str) -> str:
    return branch.strip().upper()

def normalize_session(session: str) -> str:
    s = session.strip().lower()
    if s not in ("april", "december"):
        raise ValueError("Invalid Exam Session")
    return s.capitalize()

def build_dir_path(branch: str, semester: int, subject_code: str) -> str:
    return os.path.join(
        FILES_ROOT,
        branch,
        f"sem{semester}",
        subject_code
    )
    
def build_file_path(branch: str, semester: int, subject_code: str, year: int, session: str) -> str:
    directory = build_dir_path(branch, semester, subject_code)
    filename = f"{year}_{session}.pdf"
    return directory, os.path.join(directory, filename)