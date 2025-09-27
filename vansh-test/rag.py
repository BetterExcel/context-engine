from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from pinecone_config import PINECONE_API_KEY, PINECONE_INDEX_NAME

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
print(f"Connected to Pinecone index: {PINECONE_INDEX_NAME}")

# Initialize sentence transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")
def test_query(query="hello world test "):
    query = "hello world"   # change this as needed
    print(f"\nQuery: {query}\n")

    # Embed query
    query_emb = model.encode(query).tolist()

    # Query Pinecone for top 5 chunks
    res = index.query(vector=query_emb, top_k=5, include_metadata=True)

    # Display results
    print("Top 5 results:")
    for match in res["matches"]:
        metadata = match["metadata"]
        score = match["score"]
        chunk_id = match["id"]
        
        print(f"Score: {score:.3f} | ID: {chunk_id}")
        print(f"  Summary: {metadata.get('summary', 'N/A')}")
        print(f"  Context: {metadata.get('context', 'N/A')}")
        
        # Show table data preview
        table_data = metadata.get('table_data', '[]')
        if table_data != '[]':
            import json
            try:
                table_list = json.loads(table_data)
                if table_list:
                    print(f"  Table preview: {table_list[0][:100]}...")
            except:
                print(f"  Table preview: {table_data[:100]}...")
        
        # Show any extracted fields
        for key, value in metadata.items():
            if key not in ['summary', 'context', 'table_data', 'headers'] and not key.endswith('_confidence') and not key.endswith('_sources'):
                if isinstance(value, str) and len(value) > 50:
                    print(f"  {key}: {value[:50]}...")
                else:
                    print(f"  {key}: {value}")
        print()


if __name__ == "__main__":
    test_query()