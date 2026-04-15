 
import chromadb
from openai import OpenAI
from dotenv import load_dotenv
import os, uuid

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma = chromadb.PersistentClient(path="./chroma_db")
collection = chroma.get_or_create_collection("finsight")

def embed_and_store(chunks):
    texts = [c["text"] for c in chunks]
    metadatas = [{k: v for k, v in c.items() if k != "text"} for c in chunks]
    ids = [str(uuid.uuid4()) for _ in chunks]

    for i in range(0, len(texts), 100):
        batch_texts = texts[i:i+100]
        response = client.embeddings.create(
            input=batch_texts,
            model="text-embedding-3-small"
        )
        embeddings = [r.embedding for r in response.data]
        collection.add(
            documents=batch_texts,
            embeddings=embeddings,
            metadatas=metadatas[i:i+100],
            ids=ids[i:i+100]
        )
    print(f"Stored {len(chunks)} chunks in Chroma")