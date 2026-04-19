import pdfplumber
import re
from pathlib import Path

SECTION_PATTERNS = [
    "management.*discussion", "risk factors", "revenue", "operating income",
    "segment", "guidance", "outlook", "financial statements", "earnings"
]

def detect_section(text):
    text_lower = text.lower()
    for pattern in SECTION_PATTERNS:
        if re.search(pattern, text_lower):
            return pattern.split(".*")[0].strip()
    return "general"

def extract_tables(pdf_path):
    tables = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                try:
                    for table in page.extract_tables():
                        if table:
                            rows = [" | ".join(str(c) for c in row if c) for row in table if row]
                            if rows:
                                tables.append({"text": "\n".join(rows), "page": i+1, "section": "table"})
                except Exception:
                    pass
    except Exception as e:
        print(f"Table extraction error: {e}")
    return tables

def parse_pdf(pdf_path, company="unknown", year="unknown", doc_type="10-K"):
    chunks = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages")
            for page_num, page in enumerate(pdf.pages, start=1):
                try:
                    text = page.extract_text(x_tolerance=3, y_tolerance=3)
                    if not text or len(text.strip()) < 30:
                        continue
                    blocks = [b.strip() for b in re.split(r'\n{2,}', text) if len(b.strip()) > 40]
                    for block in blocks:
                        chunks.append({
                            "text": block,
                            "section": detect_section(block),
                            "page": page_num,
                            "company": company,
                            "year": year,
                            "doc_type": doc_type
                        })
                except Exception as e:
                    print(f"Page {page_num} error: {e}")
                    continue
        print(f"Extracted {len(chunks)} text chunks")
        tables = extract_tables(pdf_path)
        print(f"Extracted {len(tables)} table chunks")
        chunks.extend(tables)
    except Exception as e:
        print(f"Parser error: {e}")
    return chunks