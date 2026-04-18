from qdrant_client import QdrantClient
from openai import OpenAI
from rank_bm25 import BM25Okapi
from dotenv import load_dotenv
import os

load_dotenv()

try:
    import streamlit as st
    api_key = st.secrets["OPENAI_API_KEY"]
    qdrant_url = st.secrets["QDRANT_URL"]
    qdrant_api_key = st.secrets["QDRANT_API_KEY"]
except:
    api_key = os.getenv("OPENAI_API_KEY")
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

openai_client = OpenAI(api_key=api_key)
qdrant = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
COLLECTION = "finsight"

def get_query_embedding(query):
    response = openai_client.embeddings.create(
        input=[query],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def reciprocal_rank_fusion(dense_ids, bm25_ids, k=60):
    scores = {}
    for rank, doc_id in enumerate(dense_ids):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    for rank, doc_id in enumerate(bm25_ids):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)

def search(query, top_k=5):
    try:
        all_points = qdrant.scroll(
            collection_name=COLLECTION,
            limit=1000,
            with_payload=True,
            with_vectors=False
        )[0]

        if not all_points:
            return []

        texts = [p.payload.get("text", "") for p in all_points]
        ids = [str(p.id) for p in all_points]
        payloads = [p.payload for p in all_points]

        tokenized = [t.lower().split() for t in texts]
        bm25 = BM25Okapi(tokenized)
        bm25_scores = bm25.get_scores(query.lower().split())
        bm25_ranked_ids = [ids[i] for i in sorted(
            range(len(bm25_scores)),
            key=lambda x: bm25_scores[x],
            reverse=True
        )[:top_k]]

        query_vector = get_query_embedding(query)
        dense_results = qdrant.search(
            collection_name=COLLECTION,
            query_vector=query_vector,
            limit=top_k
        )
        dense_ids = [str(r.id) for r in dense_results]

        fused = reciprocal_rank_fusion(dense_ids, bm25_ranked_ids)

        id_to_payload = {ids[i]: payloads[i] for i in range(len(ids))}
        results = []
        for doc_id in fused[:top_k]:
            if doc_id in id_to_payload:
                payload = id_to_payload[doc_id]
                results.append({
                    "text": payload.get("text", ""),
                    "metadata": {k: v for k, v in payload.items() if k != "text"}
                })
        return results

    except Exception as e:
        print(f"Retrieval error: {e}")
        return []