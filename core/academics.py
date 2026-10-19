"""
Academic scope rules shared by the subjects, upload and download endpoints.

Rules (taken from existing product behaviour):
  - Semesters 1 and 2 are common to all branches and form one group.
  - "CS" and "CSE" refer to the same branch.
"""

import re
from datetime import date

from .curriculum import SUBJECT_CODE_TO_NAME

COMMON_BRANCH = "COMMONFORALLBRANCHES"
COMMON_BRANCH_VALUES = ["CommonForAllBranches", COMMON_BRANCH]
COMMON_SEMESTERS = [1, 2]

# Each group lists every spelling that refers to the same branch.
_BRANCH_ALIAS_GROUPS = [("CSE", "CS")]


def is_common_scope(branch, semester):
    normalized = (branch or "").replace(" ", "").upper()
    return semester <= 2 or normalized == COMMON_BRANCH


def branch_aliases(branch):
    """All stored spellings of `branch` (upper-cased), canonical spelling first."""
    b = (branch or "").strip().upper()
    for group in _BRANCH_ALIAS_GROUPS:
        if b in group:
            return list(group)
    return [b]


def scope_filter(branch, semester, include_input_branch=False):
    """
    ORM filter kwargs (branch__in, semester__in) covering every row that belongs
    to the same academic scope as (branch, semester).
    """
    if is_common_scope(branch, semester):
        branches = list(COMMON_BRANCH_VALUES)
        if include_input_branch:
            b = (branch or "").strip()
            for value in (b, b.upper()):
                if value and value not in branches:
                    branches.append(value)
        return {"branch__in": branches, "semester__in": list(COMMON_SEMESTERS)}
    return {"branch__in": branch_aliases(branch), "semester__in": [semester]}


def subject_name_map(codes):
    """Resolve display names for subject codes with a single query (static fallback)."""
    from .models import Subject

    clean = {c.strip().upper() for c in codes if c}
    if not clean:
        return {}
    names = {code: SUBJECT_CODE_TO_NAME.get(code, code) for code in clean}
    from_db = set()
    for code, name in Subject.objects.filter(code__in=clean).values_list("code", "name"):
        key = code.strip().upper()
        if key not in from_db:  # keep the first match in model ordering, like .first()
            from_db.add(key)
            names[key] = name
    return names


# ── Upload field validation ─────────────────────────────────────────────────

VALID_BRANCHES = {"IT", "CSE", "CS", "ECE", "EE", "CE", "ME", "IP", "AIDS", "MT", COMMON_BRANCH}
EXAM_SESSIONS = ("April", "December")
MIN_PAPER_YEAR = 2000
_SUBJECT_CODE_RE = re.compile(r"^[A-Z0-9-]{2,20}$")


def canonical_branch(branch, semester):
    """The single spelling a paper's branch is stored under."""
    if is_common_scope(branch, semester):
        return COMMON_BRANCH
    return branch_aliases(branch)[0]


def validate_paper_identity(branch, semester, subject_code, year, exam_session):
    """
    Normalize and validate the fields that identify a paper.
    Returns a dict of clean values; raises ValueError with a user-facing message.
    """
    try:
        semester = int(semester)
        year = int(year)
    except (TypeError, ValueError):
        raise ValueError("Semester and year must be numbers.")

    if not 1 <= semester <= 8:
        raise ValueError("Semester must be between 1 and 8.")
    if not MIN_PAPER_YEAR <= year <= date.today().year:
        raise ValueError(f"Year must be between {MIN_PAPER_YEAR} and {date.today().year}.")

    branch = (branch or "").replace(" ", "").upper()
    if branch not in VALID_BRANCHES:
        raise ValueError("Unknown branch.")

    subject_code = (subject_code or "").strip().upper()
    if not _SUBJECT_CODE_RE.match(subject_code):
        raise ValueError("Invalid subject code.")

    exam_session = (exam_session or "").strip().capitalize()
    if exam_session not in EXAM_SESSIONS:
        raise ValueError("Exam session must be 'April' or 'December'.")

    return {
        "branch": canonical_branch(branch, semester),
        "semester": semester,
        "subject_code": subject_code,
        "year": year,
        "exam_session": exam_session,
    }
