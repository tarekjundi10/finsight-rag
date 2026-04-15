import streamlit as st
import tempfile, os
from src.ingestion.parser import parse_pdf
from src.ingestion.chunker import chunk_docs
from src.ingestion.embedder import embed_and_store
from src.generation.chain import ask

st.set_page_config(page_title="FinSight", page_icon=".", layout="wide")

st.markdown("""
<style>
.main-title { font-size: 2rem; font-weight: 600; margin-bottom: 0; }
.sub-title { color: #888; font-size: 1rem; margin-top: 0; margin-bottom: 2rem; }
.source-card { background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 12px; margin: 6px 0; font-size: 0.85rem; }
.source-meta { color: #888; font-size: 0.78rem; margin-bottom: 4px; }
</style>
""", unsafe_allow_html=True)

with st.sidebar:
    st.markdown("## Upload documents")
    st.markdown("Supported: Annual reports, 10-K, earnings call transcripts (PDF)")
    uploaded = st.file_uploader("Drop PDFs here", type="pdf", accept_multiple_files=True)
    company = st.text_input("Company name", placeholder="e.g. Apple")
    year = st.text_input("Year", placeholder="e.g. 2023")
    doc_type = st.selectbox("Document type", ["10-K", "10-Q", "Earnings Call", "Annual Report"])

    if st.button("Ingest documents", use_container_width=True):
        if not uploaded:
            st.warning("Please upload at least one PDF.")
        else:
            for file in uploaded:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(file.read())
                    tmp_path = tmp.name
                with st.spinner(f"Processing {file.name}..."):
                    docs = parse_pdf(tmp_path, company=company, year=year, doc_type=doc_type)
                    chunks = chunk_docs(docs)
                    embed_and_store(chunks)
                    os.unlink(tmp_path)
            st.success(f"Ingested {len(uploaded)} document(s) successfully.")

    st.markdown("---")
    st.markdown("#### Example questions")
    examples = [
        "What was the total revenue?",
        "What are the main risk factors?",
        "How did operating income change?",
        "What is the company's guidance?",
    ]
    for ex in examples:
        if st.button(ex, use_container_width=True):
            st.session_state["prefill"] = ex

st.markdown('<p class="main-title">FinSight</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-title">Financial document Q&A — upload reports, ask business questions, get cited answers</p>', unsafe_allow_html=True)

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if msg["role"] == "assistant" and "sources" in msg:
            with st.expander(f"Sources ({len(msg['sources'])})"):
                for s in msg["sources"]:
                    st.markdown(f"""<div class="source-card">
                        <div class="source-meta">{s['company']} · {s['year']} · {s['doc_type'] if 'doc_type' in s else ''} · Page {s['page']} · {s['section']}</div>
                        {s['preview']}...
                    </div>""", unsafe_allow_html=True)

prefill = st.session_state.pop("prefill", "")
query = st.chat_input("Ask a question about your documents...") or prefill

if query:
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)
    with st.chat_message("assistant"):
        with st.spinner("Searching documents..."):
            result = ask(query)
        st.markdown(result["answer"])
        if result["sources"]:
            with st.expander(f"Sources ({len(result['sources'])})"):
                for s in result["sources"]:
                    st.markdown(f"""<div class="source-card">
                        <div class="source-meta">{s['company']} · {s['year']} · Page {s['page']} · {s['section']}</div>
                        {s['preview']}...
                    </div>""", unsafe_allow_html=True)
    st.session_state.messages.append({
        "role": "assistant",
        "content": result["answer"],
        "sources": result["sources"]
    }) 
