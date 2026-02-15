import os
from django.conf import settings

FILES_ROOT = os.path.join(settings.BASE_DIR, "data", "files")

def get_pdfs(branch, semester, subject_code, from_year, to_year):
    
    base_path = os.path.join(
        FILES_ROOT,
        branch,
        f"sem{semester}"
    )
    
    if not os.path.exists(base_path):
        return []
    
    pdfs = []
    
    if subject_code and subject_code.lower() != "all":
        subject_dirs = [subject_code]
    else:
        subject_dirs = sorted(os.listdir(base_path))
        
    for subj in subject_dirs:
        subj_path = os.path.join(base_path, subj)
        if not os.path.isdir(subj_path):
            continue
        
        for file in os.listdir(subj_path):
            if not file.lower().endswith(".pdf"):
                continue
            
            try:
                year_str, session = file.replace(".pdf", "").split("_")
                year = int(year_str)
            except ValueError:
                continue
            
            if from_year <= year <= to_year:
                pdfs.append(os.path.join(subj_path, file))
                
    def sort_key(path):
        subject_code = os.path.basename(os.path.dirname(path))
        filename = os.path.basename(path).replace(".pdf", "")
        year_str, session = filename.split("_")
        
        year = int(year_str)
        session_order = 0 if session == "April" else 1
        
        return (subject_code, year, session_order)
    
    pdfs.sort(key=sort_key)
    return pdfs