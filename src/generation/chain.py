from openai import OpenAI
from dotenv import load_dotenv
from src.retrieval.hybrid_retriever import search
from src.generation.prompt import build_prompt
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def ask(query, top_k=5):
    chunks = search(query, top_k=top_k)
    if not chunks:
        return {"answer": "No documents have been uploaded yet.", "sources": []}

    messages = build_prompt(query, chunks)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.1
    )
    answer = response.choices[0].message.content
    sources = [
        {
            "company": c["metadata"].get("company", "?"),
            "year": c["metadata"].get("year", "?"),
            "page": c["metadata"].get("page", "?"),
            "section": c["metadata"].get("section", "?"),
            "preview": c["text"][:150]
        }
        for c in chunks
    ]
    return {"answer": answer, "sources": sources} 
