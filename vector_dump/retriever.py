from dotenv import load_dotenv
import os
import pinecone
from vansh_test.rag import test_query   # semantic search function already defined in rag.py

load_dotenv()
api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME")

# --- Initialize Pinecone ---
pinecone.init(api_key=api_key, environment="us-east1-gcp")
index = pinecone.Index(index_name)
print(f"Connected to Pinecone index: {index_name}")


def hybrid_query(query: str, alpha: float = 0.5, top_k: int = 5):
    """
    Hybrid search: combines keyword (sparse) and semantic search (rag.test_1query).
    
    Args:
        query: The search query string
        alpha: Blend factor between semantic and keyword (0=keyword only, 1=semantic only).
        top_k: Number of docs to return
    """
    print(f"\n🔎 Hybrid Query: {query}\n")

    # Step 1: Run semantic search via rag.py
    semantic_res = test_query(query)   # assumes this returns Pinecone-like matches

    # Step 2: Run keyword-based sparse query
    sparse_res = index.query(
        vector=[0.0]*768,  # dummy vector, since we only want sparse match
        sparse_vector={"indices": list(range(len(query))), "values": [1.0] * len(query)},
        top_k=top_k,
        include_metadata=True
    )

    # Step 3: Blend scores manually (alpha controls weighting)
    blended = {}
    for match in semantic_res["matches"]:
        blended[match["id"]] = alpha * match["score"]

    for match in sparse_res["matches"]:
        if match["id"] in blended:
            blended[match["id"]] += (1 - alpha) * match["score"]
        else:
            blended[match["id"]] = (1 - alpha) * match["score"]

    # Step 4: Sort results by blended score
    final = sorted(blended.items(), key=lambda x: x[1], reverse=True)[:top_k]

    # Display
    print("📄 Top Hybrid Results:")
    for doc_id, score in final:
        print(f"ID: {doc_id} | Score: {score:.3f}")

    return final


if __name__ == "__main__":
    q = "5G network alarm troubleshooting"
    hybrid_query(q)
