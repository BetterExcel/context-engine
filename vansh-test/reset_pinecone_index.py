from pinecone import Pinecone
from pinecone_config import PINECONE_API_KEY, PINECONE_INDEX_NAME

def reset_pinecone_index():
    """Delete and recreate the Pinecone index with correct dimensions."""
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        print("✅ Pinecone initialized successfully")
        if PINECONE_INDEX_NAME in pc.list_indexes().names():
            pc.delete_index(PINECONE_INDEX_NAME)
        else:
            print(f"ℹ️  Index '{PINECONE_INDEX_NAME}' does not exist")        
    except Exception as e:
        print(f"❌ Failed to reset index: {e}")
        raise

if __name__ == "__main__":
    reset_pinecone_index()
