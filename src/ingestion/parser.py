def parse_pdf(pdf_path, company="unknown", year="unknown", doc_type="10-K"):
    path = Path(pdf_path)
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