"""
Academic scope rules shared by the subjects, upload and download endpoints.

Rules (taken from existing product behaviour):
  - Semesters 1 and 2 are common to all branches and form one group.
  - "CS" and "CSE" refer to the same branch.
"""

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
