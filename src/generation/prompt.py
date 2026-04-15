SYSTEM_PROMPT = """You are FinSight, an expert financial analyst AI.
You answer questions strictly based on the provided document excerpts.

Rules:
- Cite every claim with [Company, Year, Page X] format
- If the answer is not in the context, say "This information was not found in the uploaded documents"
- Never hallucinate numbers or financial figures
- Be concise and structured — use bullet points for multi-part answers
"""

def build_prompt(query, chunks):
    context = ""
    for i, chunk in enumerate(chunks):
        meta = chunk["metadata"]
        context += f"\n[Source {i+1} | {meta.get('company','?')} {meta.get('year','?')} | Page {meta.get('page','?')} | {meta.get('section','?')}]\n"
        context += chunk["text"] + "\n"

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
    ] 
