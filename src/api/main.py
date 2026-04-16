from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from src.ingestion.parser import parse_pdf
from src.ingestion.chunker import chunk_docs
from src.ingestion.embedder import embed_and_store
from src.generation.chain import ask
import tempfile, os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    company: str = Form("unknown"),
    year: str = Form("unknown"),
    doc_type: str = Form("10-K")
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    docs = parse_pdf(tmp_path, company=company, year=year, doc_type=doc_type)
    chunks = chunk_docs(docs)
    embed_and_store(chunks)
    os.unlink(tmp_path)
    return {"status": "success", "chunks": len(chunks)}

@app.post("/ask")
async def ask_question(payload: dict):
    result = ask(payload["query"])
    return result

@app.get("/health")
async def health():
    return {"status": "ok"} 
