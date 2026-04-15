 
from langchain_text_splitters import RecursiveCharacterTextSplitter
splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

def chunk_docs(docs):
    chunks = []
    for doc in docs:
        splits = splitter.split_text(doc["text"])
        for split in splits:
            chunks.append({**doc, "text": split})
    return chunks