from pinecone import Pinecone
from pinecone_config import PINECONE_API_KEY, PINECONE_INDEX_NAME

def reset_pinecone_index():
    """Delete and recreate the Pinecone index with correct dimensions."""
    try:
        # Initialize Pinecone
        pc = Pinecone(api_key=PINECONE_API_KEY)
        print("✅ Pinecone initialized successfully")
        
        # Check if index exists
        if PINECONE_INDEX_NAME in pc.list_indexes().names():
            print(f"🔄 Deleting existing index '{PINECONE_INDEX_NAME}'...")
            pc.delete_index(PINECONE_INDEX_NAME)
            print(f"✅ Index '{PINECONE_INDEX_NAME}' deleted successfully")
        else:
            print(f"ℹ️  Index '{PINECONE_INDEX_NAME}' does not exist")
        
        print("✅ Index reset complete. You can now run pinecone_uploader.py to create a new index with correct dimensions.")
        
    except Exception as e:
        print(f"❌ Failed to reset index: {e}")
        raise

if __name__ == "__main__":
    reset_pinecone_index()
