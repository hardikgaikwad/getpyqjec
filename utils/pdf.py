import pikepdf
from io import BytesIO

def compile_pdfs(file_paths):
    
    output = BytesIO()
    
    with pikepdf.Pdf.new() as merged_pdf:
        for path in file_paths:
            with pikepdf.Pdf.open(path) as pdf:
                merged_pdf.pages.extend(pdf.pages)
    
            merged_pdf.save(output)
    
    output.seek(0)
    return output