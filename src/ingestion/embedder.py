from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from openai import OpenAI
from dotenv import load_dotenv
import os, uuid

load_dotenv()

try:
    import streamlit as st
    api_key = st.secrets["OPENAI_API_KEY"]
except:
    api_key = os.getenv("OPENAI_API_KEY")

try:
    import streamlit as st
    qdrant_url = st.secrets["QDRANT_URL"]
    qdrant_api_key = st.secrets["QDRANT_API_KEY"]
except:
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

openai_client = OpenAI(api_key=api_key)
qdrant = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
COLLECTION = "finsight"

def ensure_collection():
    existing = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION not in existing:
        qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
        )

def embed_and_store(chunks):
    ensure_collection()
    texts = [c["text"] for c in chunks]
    metadatas = [{k: v for k, v in c.items() if k != "text"} for c in chunks]

    points = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i+100]
        response = openai_client.embeddings.create(
            input=batch,
            model="text-embedding-3-small"
        )
        for j, emb in enumerate(response.data):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=emb.embedding,
                payload={"text": batch[j], **metadatas[i+j]}
            ))

    qdrant.upsert(collection_name=COLLECTION, points=points)
    print(f"Stored {len(points)} chunks in Qdrant")