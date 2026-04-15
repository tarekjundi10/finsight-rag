import chromadb
from openai import OpenAI
from rank_bm25 import BM25Okapi
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma = chromadb.PersistentClient(path="./chroma_db")
collection = chroma.get_or_create_collection("finsight")

def get_query_embedding(query):
    response = client.embeddings.create(input=[query], model="text-embedding-3-small")
    return response.data[0].embedding

def reciprocal_rank_fusion(dense_results, bm25_results, k=60):
    scores = {}
    for rank, doc in enumerate(dense_results):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank + 1)
    for rank, doc in enumerate(bm25_results):
        scores[doc] = scores.get(doc, 0) + 1 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)

def search(query, top_k=5):
    all_docs = collection.get(include=["documents", "metadatas"])
    texts = all_docs["documents"]
    metadatas = all_docs["metadatas"]

    if not texts:
        return []

    tokenized = [t.lower().split() for t in texts]
    bm25 = BM25Okapi(tokenized)
    bm25_scores = bm25.get_scores(query.lower().split())
    bm25_ranked = [i for i in sorted(range(len(bm25_scores)), key=lambda x: bm25_scores[x], reverse=True)]

    query_vector = get_query_embedding(query)
    dense = collection.query(query_embeddings=[query_vector], n_results=min(top_k, len(texts)))
    dense_ids = dense["ids"][0]
    dense_texts = dense["documents"][0]
    dense_metas = dense["metadatas"][0]

    id_to_doc = {all_docs["ids"][i]: {"text": texts[i], "metadata": metadatas[i]} for i in range(len(texts))}
    bm25_ids = [all_docs["ids"][i] for i in bm25_ranked[:top_k]]

    fused = reciprocal_rank_fusion(dense_ids, bm25_ids)

    results = []
    for doc_id in fused[:top_k]:
        if doc_id in id_to_doc:
            results.append(id_to_doc[doc_id])
    return results 
