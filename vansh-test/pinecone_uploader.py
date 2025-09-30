import json
import hashlib
import os
from typing import Dict, List, Any
import time
import requests
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
from embedding_generation import EmbeddingGenerator
# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")


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



class PineconeUploader:
    def __init__(self, api_key: str=os.getenv("PINECONE_API_KEY"),environment:str=os.getenv('PINECONE_ENVIRONMENT'),index_name: str = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")):
        self.api_key = api_key
        self.environment = environment
        self.index= index_name
        self.index_name = index_name
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.embedding_generator = EmbeddingGenerator()

    def __create_index_if_not_exists(self):
        """Create Pinecone index if it doesn't exist."""
        try:
            # Check if index exists
            if self.index in self.pc.list_indexes().names():
                print(f"✅ Index '{self.index}' already exists")
                return self.pc.Index(self.index)
            # Create new index
            print(f"🔄 Creating new index '{self.index}'...")
            self.pc.create_index(
                name=self.index,
                dimension=self.dim,  # OpenAI text-embedding-3-small embedding dimension
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=self.environment
                )
            )
            # Wait for index to be ready
            print("⏳ Waiting for index to be ready...")
            time.sleep(5)
            print(f"✅ Index '{self.index}' created successfully")
            return self.pc.Index(self.index)
        except Exception as e:
            print(f"❌ Failed to create index: {e}")
            raise e
    
    def __upload_chunks_to_pinecone(self, chunks_data: List[Dict], batch_size: int = 100):
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

                embeddings=[self.embedding_generator.generate(text,method=self.embedding_method) for text in texts]
                # embeddings = generate_openai_embeddings(texts)
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
                self.index.upsert(vectors=vectors)
                print(f"✅ Uploaded batch {i//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size}")
                
                # Rate limiting for OpenAI API
                time.sleep(0.1)
                
            except Exception as e:
                print(f"❌ Failed to upload batch {i//batch_size + 1}: {e}")
                continue
        
        print(f"✅ Successfully uploaded {total_chunks} chunks to Pinecone")


    def __prepare_chunk_for_upload(self,chunk_data: Dict, sheet_name: str, chunk_id: str) -> Dict:
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
            "id": f"{sheet_name}_{chunk_id}",
            "values": text_content,  # This will be replaced with actual embeddings
            "metadata": metadata
        }

    def __data_to_chunks(self,data: Dict):
        chunks_to_upload = []
        
        for sheet_name, sheet_data in data.get("sheets", {}).items():
            print(f"  Processing sheet: {sheet_name}")
            
            for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
                prepared_chunk = self.__prepare_chunk_for_upload(chunk_data, sheet_name, chunk_id)
                chunks_to_upload.append(prepared_chunk)
        return chunks_to_upload

    def upload_data(self, data: Dict,batch_size: int = 100,embedding_method: str = "openai"):
        """Upload chunks to Pinecone in batches."""
        self.embedding_method = embedding_method
        self.dim =self.embedding_generator.get_embedding_dim(embedding_method)
        chunks_to_upload = self.__data_to_chunks(data)
        self.index=self.__create_index_if_not_exists()        
        self.__upload_chunks_to_pinecone( chunks_to_upload, batch_size)

    def delete_index_if_exists(self):
        """Delete Pinecone index if it exists."""
        try:
            if self.index_name in self.pc.list_indexes().names():
                self.pc.delete_index(self.index_name)
                print(f" Deleted index: {self.index_name}")
            else:
                print(f" Index '{self.index_name}' does not exist, no need to delete")
        except Exception as e:
            print(f" Failed to delete index: {e}")

if __name__ == "__main__":
    # chunk_and_upload_to_pinecone(pinecone_index_name="skopeo-context-index-dense")
    index_data = load_anchored_index()
    skopeo_context_index_dense=PineconeUploader(index_name='skopeo-context-index-sparse')
    skopeo_context_index_dense.upload_data(index_data,embedding_method="sbert")
    # skopeo_context_index_dense.delete_index_if_exists()
