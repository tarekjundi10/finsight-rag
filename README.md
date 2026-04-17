# FinSight RAG

AI-powered financial intelligence system for analyzing earnings reports and 10-K filings using Retrieval-Augmented Generation (RAG).

Live Demo: https://finsight-rag.vercel.app  
---

## Overview

FinSight RAG is a full-stack application that allows users to upload financial documents and query them using natural language. The system retrieves relevant information from documents and generates context-aware answers.

The project is designed to go beyond basic RAG implementations by focusing on structured financial data and real-world document analysis.

---

## Features

- Upload and process financial PDF documents
- Ask natural language questions about document content
- Semantic search using vector embeddings
- FastAPI backend for high-performance API handling
- React frontend with modern UI
- Modular architecture for scalability

---

## Architecture

Frontend (React + Vite)  
→ API Layer (FastAPI)  
→ Embedding and Retrieval (ChromaDB)  
→ Language Model (OpenAI)

---

## Tech Stack

Backend:
- FastAPI
- Python
- ChromaDB
- OpenAI API
- Uvicorn

Frontend:
- React (Vite)
- Tailwind CSS
- Axios

---

## Project Structure

    finsight-rag/
    ├── src/                 # Backend (FastAPI)
    ├── finsight-ui/         # Frontend (React)
    ├── chroma_db/           # Vector database
    ├── data/                # Uploaded files
    ├── requirements.txt
    ├── .env
    └── README.md

---

## Setup and Installation

### Clone the repository

    git clone https://github.com/tarekjundi10/finsight-rag.git
    cd finsight-rag

---

### Backend Setup

    python -m venv venv
    .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt

Create a `.env` file:

    OPENAI_API_KEY=your_api_key_here

Run backend:

    python -m uvicorn src.api.main:app --reload

Backend:
http://127.0.0.1:8000

Docs:
http://127.0.0.1:8000/docs

---

### Frontend Setup

    cd finsight-ui
    npm install
    npm run dev

Frontend:
http://localhost:5173

---

## Usage

1. Upload a financial document (e.g., 10-K report)
2. Click "Ingest Documents"
3. Ask questions about the document

Example queries:
- What is the total revenue?
- What are the key risk factors?
- How did operating income change year over year?

---

## Known Limitations

- Requires a valid OpenAI API key
- Performance depends on document size
- No authentication system implemented

---

## Future Improvements

- Multi-document comparison
- Financial table parsing
- Authentication system
- Docker deployment
- Performance optimization

---

## Project Value

This project demonstrates:

- End-to-end RAG system design
- Full-stack development
- AI integration in real applications
- Handling unstructured financial data
