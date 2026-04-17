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
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            for table in page.extract_tables():
                if table:
                    rows = [" | ".join(str(c) for c in row if c) for row in table]
                    tables.append({"text": "\n".join(rows), "page": i+1, "section": "table"})
    return tables

def parse_pdf(pdf_path, company="unknown", year="unknown", doc_type="10-K"):
    chunks = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if not text:
                    continue
                blocks = [b.strip() for b in text.split("\n\n") if len(b.strip()) > 50]
                for block in blocks:
                    chunks.append({
                        "text": block,
                        "section": detect_section(block),
                        "page": page_num,
                        "company": company,
                        "year": year,
                        "doc_type": doc_type
                    })
        chunks.extend(extract_tables(pdf_path))
    except Exception as e:
        print(f"Parser error: {e}")
    return chunks