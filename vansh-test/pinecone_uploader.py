import json
import hashlib
import os
from typing import Dict, List, Any
import time
import requests
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

def initialize_pinecone():
    """Initialize Pinecone client."""
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        print(f"✅ Pinecone initialized successfully")
        return pc
    except Exception as e:
        print(f"❌ Failed to initialize Pinecone: {e}")
        raise e

def create_index_if_not_exists(pc: Pinecone, index_name: str):
    """Create Pinecone index if it doesn't exist."""
    try:
        # Check if index exists
        if index_name in pc.list_indexes().names():
            print(f"✅ Index '{index_name}' already exists")
            return pc.Index(index_name)
        
        # Create new index
        print(f"🔄 Creating new index '{index_name}'...")
        pc.create_index(
            name=index_name,
            dimension=1536,  # OpenAI text-embedding-3-small embedding dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=PINECONE_ENVIRONMENT
            )
        )
        
        # Wait for index to be ready
        print("⏳ Waiting for index to be ready...")
        time.sleep(10)
        
        print(f"✅ Index '{index_name}' created successfully")
        return pc.Index(index_name)
        
    except Exception as e:
        print(f"❌ Failed to create index: {e}")
        raise e

def generate_openai_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using OpenAI API."""
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "input": texts,
            "model": OPENAI_EMBEDDING_MODEL
        }
        
        response = requests.post(
            "https://api.openai.com/v1/embeddings",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return [item["embedding"] for item in result["data"]]
        else:
            print(f"❌ OpenAI API error: {response.status_code} - {response.text}")
            raise Exception(f"OpenAI API error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Failed to generate OpenAI embeddings: {e}")
        raise e

def generate_chunk_id(sheet_name: str, chunk_id: str) -> str:
    """Generate unique ID for chunk."""
    return f"{sheet_name}_{chunk_id}"

def prepare_chunk_for_upload(chunk_data: Dict, sheet_name: str, chunk_id: str) -> Dict:
    """Prepare chunk data for Pinecone upload."""
    
    # Create metadata
    metadata = {
        "sheet_name": sheet_name,
        "chunk_id": chunk_id,
        "range": chunk_data.get("range", ""),
        "start_row": chunk_data.get("start_row", 0),
        "end_row": chunk_data.get("end_row", 0),
        "chunk_number": chunk_data.get("chunk_number", 0),
        "summary": chunk_data.get("summary", ""),
        "context": chunk_data.get("context", ""),
        "headers": json.dumps(chunk_data.get("headers", [])),
        "table_data": json.dumps(chunk_data.get("table", [])),
    }
    
    # Add any additional fields (like high_paying_companies)
    for key, value in chunk_data.items():
        if key not in ["range", "start_row", "end_row", "chunk_number", "summary", "context", "table"]:
            if isinstance(value, (str, int, float, bool)):
                metadata[key] = str(value)
            else:
                metadata[key] = json.dumps(value)
    
    # Create text content for embedding
    text_content = f"""
    Sheet: {sheet_name}
    Range: {chunk_data.get("range", "")}
    Summary: {chunk_data.get("summary", "")}
    Context: {chunk_data.get("context", "")}
    
    Table Data:
    {chr(10).join(chunk_data.get("table", []))}
    """
    
    return {
        "id": generate_chunk_id(sheet_name, chunk_id),
        "values": text_content,  # This will be replaced with actual embeddings
        "metadata": metadata
    }

def upload_chunks_to_pinecone(index, chunks_data: List[Dict], batch_size: int = 100):
    """Upload chunks to Pinecone in batches."""
    total_chunks = len(chunks_data)
    print(f"🔄 Uploading {total_chunks} chunks to Pinecone...")
    
    for i in range(0, total_chunks, batch_size):
        batch = chunks_data[i:i + batch_size]
        
        try:
            # Extract text content for embeddings
            texts = []
            for chunk in batch:
                # Get the text content that was stored in the "values" field
                text_content = chunk.get("values", "")
                texts.append(text_content)
            
            # Generate embeddings using OpenAI API
            print(f"🔄 Generating OpenAI embeddings for batch {i//batch_size + 1}...")
            embeddings = generate_openai_embeddings(texts)
            print(f"✅ Generated {len(embeddings)} embeddings")
            
            # Prepare vectors for upload
            vectors = []
            for j, chunk in enumerate(batch):
                vectors.append({
                    "id": chunk["id"],
                    "values": embeddings[j],  # OpenAI returns list directly
                    "metadata": chunk["metadata"]
                })
            
            # Upload batch
            index.upsert(vectors=vectors)
            print(f"✅ Uploaded batch {i//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size}")
            
            # Rate limiting for OpenAI API
            time.sleep(0.1)
            
        except Exception as e:
            print(f"❌ Failed to upload batch {i//batch_size + 1}: {e}")
            continue
    
    print(f"✅ Successfully uploaded {total_chunks} chunks to Pinecone")

def load_anchored_index(file_path: str = "anchored_index_output.json") -> Dict:
    """Load the anchored index from JSON file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        print(f"✅ Loaded anchored index with {len(data.get('sheets', {}))} sheets")
        return data
    except FileNotFoundError:
        print(f"❌ File '{file_path}' not found")
        raise
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON file: {e}")
        raise

def main():
    """Main function to upload anchored index to Pinecone."""
    print("🚀 Starting Pinecone upload process...")
    print("=" * 50)
    
    try:
        # Step 1: Load anchored index
        print("Step 1: Loading anchored index...")
        index_data = load_anchored_index()
        
        # Step 2: Initialize Pinecone
        print("\nStep 2: Initializing Pinecone...")
        pc = initialize_pinecone()
        
        # Step 3: Create or get index
        print("\nStep 3: Setting up Pinecone index...")
        index = create_index_if_not_exists(pc, PINECONE_INDEX_NAME)
        
        # Step 4: Prepare chunks for upload
        print("\nStep 4: Preparing chunks for upload...")
        chunks_to_upload = []
        
        for sheet_name, sheet_data in index_data.get("sheets", {}).items():
            print(f"  Processing sheet: {sheet_name}")
            
            for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
                prepared_chunk = prepare_chunk_for_upload(chunk_data, sheet_name, chunk_id)
                chunks_to_upload.append(prepared_chunk)
        
        print(f"  Prepared {len(chunks_to_upload)} chunks for upload")
        
        # Step 5: Upload to Pinecone
        print("\nStep 5: Uploading to Pinecone...")
        upload_chunks_to_pinecone(index, chunks_to_upload)
        
        print("\n🎉 Upload completed successfully!")
        print(f"📊 Total chunks uploaded: {len(chunks_to_upload)}")
        print(f"🔍 Index name: {PINECONE_INDEX_NAME}")
        
    except Exception as e:
        print(f"\n❌ Upload failed: {e}")
        raise

if __name__ == "__main__":
    main()
