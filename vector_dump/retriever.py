import pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import os

# --- Load environment ---
print(1)
load_dotenv()
api_key = os.getenv("PINECONE_API_KEY")
index_name = os.getenv("PINECONE_INDEX_NAME")
print(2)

# --- Initialize Pinecone ---
pinecone.init(api_key=api_key, environment="us-east1-gcp")
print(3)
index = pinecone.Index(index_name)
print(4)

print(f"Connected to Pinecone index: {index_name}")
# --- Semantic Model ---
model = SentenceTransformer("all-MiniLM-L6-v2")
print(5)

# --- Hardcoded test query ---
def test_query(query="hello world test "):
    query = ""   # change this as needed
    print(f"\nQuery: {query}\n")

    # Embed query
    query_emb = model.encode(query).tolist()

    # Query Pinecone for top 5 chunks
    res = index.query(vector=query_emb, top_k=5, include_metadata=True)

    # Display results
    print("Top 5 results:")
    for match in res["matches"]:
        doc_text = match["metadata"].get("text", "[no metadata]")
        print(f"Score: {match['score']:.3f} | ID: {match['id']} | Text: {doc_text}")


if __name__ == "__main__":
    test_query()
