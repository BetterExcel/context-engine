import pinecone
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer, util
import numpy as np

# --- Initialize Pinecone ---
pinecone.init(api_key="YOUR_PINECONE_KEY", environment="us-east1-gcp")
index = pinecone.Index("hybrid-demo")

# --- Semantic Model ---
model = SentenceTransformer("all-MiniLM-L6-v2")

# --- BM25 Setup ---
docs = [
    "The Eiffel Tower is in Paris.",
    "The Louvre is a famous museum in France.",
    "Mount Everest is the tallest mountain."
]
tokenized_docs = [d.split(" ") for d in docs]
bm25 = BM25Okapi(tokenized_docs)

# Insert embeddings into Pinecone
for i, doc in enumerate(docs):
    emb = model.encode(doc).tolist()
    index.upsert([(str(i), emb, {"text": doc})])

# --- Query ---
query = "famous landmark in Paris"
query_emb = model.encode(query).tolist()

# Semantic search (Pinecone)
pinecone_res = index.query(vector=query_emb, top_k=3, include_metadata=True)
semantic_hits = {match["id"]: match["score"] for match in pinecone_res["matches"]}

# Lexical (BM25)
bm25_scores = bm25.get_scores(query.split())
bm25_norm = (bm25_scores - np.min(bm25_scores)) / (np.max(bm25_scores) - np.min(bm25_scores))

# Fuse results
alpha = 0.3  # 30% lexical, 70% semantic
hybrid_scores = {}
for i, doc in enumerate(docs):
    semantic = semantic_hits.get(str(i), 0.0)
    lexical = bm25_norm[i]
    hybrid_scores[doc] = alpha * lexical + (1 - alpha) * semantic

# Rank
ranked = sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)
for doc, score in ranked:
    print(f"{score:.3f} - {doc}")
