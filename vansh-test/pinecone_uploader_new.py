import json
import hashlib
import os
from typing import Dict, List, Any
import time
import requests
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
from embedding_generation import EmbeddingGenerator
from reranker import ReRanker

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
        
        # Debug: Print sheet names and chunk counts
        for sheet_name, sheet_data in data.get('sheets', {}).items():
            chunk_count = len(sheet_data.get('anchors', {}))
            print(f"  📊 Sheet '{sheet_name}': {chunk_count} chunks")
        
        return data
    except FileNotFoundError:
        print(f"❌ File '{file_path}' not found")
        raise
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON file: {e}")
        raise

def get_chunk_ranges(results: Dict) -> List[str]:
    """Extract ranges from the anchored index results."""
    ranges = []
    for matches in results.get("matches", []):
        metadata = matches.get("metadata", {})
        if "range" in metadata:
            ranges.append(metadata["range"])
    return ranges

class PineconeUploader:
    def __init__(self, api_key: str=os.getenv("PINECONE_API_KEY"),environment:str=os.getenv('PINECONE_ENVIRONMENT'),index_name: str = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")):
        self.api_key = api_key
        self.environment = environment
        self.index_name = index_name
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.index= self.pc.Index(index_name)  
        self.embedding_generator = EmbeddingGenerator()
        self.re_ranker= ReRanker()
        
    def __create_index_if_not_exists(self):
        """Create Pinecone index if it doesn't exist."""
        try:
            # Check if index exists
            if self.index_name in self.pc.list_indexes().names():
                print(f"✅ Index '{self.index_name}' already exists")
                return self.pc.Index(self.index_name)
            # Create new index
            print(f"🔄 Creating new index '{self.index_name}'...")
            self.pc.create_index(
                name=self.index_name,
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
            print(f"✅ Index '{self.index_name}' created successfully")
            return self.pc.Index(self.index_name)
        except Exception as e:
            print(f"❌ Failed to create index: {e}")
            raise e
    
    def __upload_chunks_to_pinecone(self, chunks_data: List[Dict], batch_size: int = 100):
        """Upload chunks to Pinecone in batches."""
        total_chunks = len(chunks_data)
        print(f"🔄 Uploading {total_chunks} chunks to Pinecone...")
        
        # Debug: Print all chunk IDs that will be uploaded
        print("📋 Chunks to be uploaded:")
        for i, chunk in enumerate(chunks_data):
            print(f"  {i+1}. {chunk['id']}")
        
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
                print(f"🔄 Generating {self.embedding_method} embeddings for batch {i//batch_size + 1}...")

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
        
        # Add any additional fields (like high_paying_companies, canadian_companies, etc.)
        for key, value in chunk_data.items():
            if key not in ["range", "start_row", "end_row", "chunk_number", "summary", "context", "table", "formulas"]:
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
        """Convert data to chunks for upload - IMPROVED to catch all chunks."""
        chunks_to_upload = []
        
        print("🔍 Processing sheets for upload:")
        for sheet_name, sheet_data in data.get("sheets", {}).items():
            anchors = sheet_data.get("anchors", {})
            print(f"  📊 Sheet '{sheet_name}': {len(anchors)} chunks found")
            
            for chunk_id, chunk_data in anchors.items():
                print(f"    📄 Processing chunk: {chunk_id}")
                prepared_chunk = self.__prepare_chunk_for_upload(chunk_data, sheet_name, chunk_id)
                chunks_to_upload.append(prepared_chunk)
                print(f"      ✅ Prepared: {prepared_chunk['id']}")
        
        print(f"📋 Total chunks prepared for upload: {len(chunks_to_upload)}")
        return chunks_to_upload
    
    def __rerank_results(self, results: List[Dict], query: str, method: str = "cross_encoder", top_k: int = 5) -> List[Dict]:
        """Rerank Pinecone results using the ReRanker class."""
        try:
            print(f"🔄 Reranking {len(results)} results using {method}...")

            # Extract docs (use metadata summary/context if available)
            docs = []
            for r in results:
                meta = r.get("metadata", {})
                text = meta.get("text") or meta.get("summary") or meta.get("context") or str(meta)
                docs.append(text)

            # Run reranker
            reranked = self.re_ranker.rerank(query, docs, method=method, top_k=top_k)

            # Map reranked docs back to Pinecone matches
            doc_to_result = { 
                (r.get("metadata", {}).get("text") or r.get("metadata", {}).get("summary") or str(r.get("metadata"))): r 
                for r in results 
            }

            reranked_results = []
            for item in reranked:
                doc = item["doc"]
                if doc in doc_to_result:
                    updated = doc_to_result[doc].copy()
                    updated["rerank_score"] = item["score"]
                    reranked_results.append(updated)

            print("✅ Reranking completed")
            for rr in reranked_results:
                print(f" - ID: {rr['id']}, base={rr['score']:.4f}, rerank={rr['rerank_score']:.4f}")

            return reranked_results

        except Exception as e:
            print(f"❌ Failed to rerank results: {e}")
            return results

    def upload_data(self, data: Dict,batch_size: int = 100,embedding_method: str = "openai"):
        """Upload chunks to Pinecone in batches - IMPROVED VERSION."""
        self.embedding_method = embedding_method
        self.dim =self.embedding_generator.get_embedding_dim(embedding_method)
        
        print(f"🚀 Starting upload process with {embedding_method} embeddings...")
        
        chunks_to_upload = self.__data_to_chunks(data)
        
        if not chunks_to_upload:
            print("❌ No chunks to upload!")
            return
            
        self.index=self.__create_index_if_not_exists()        
        self.__upload_chunks_to_pinecone(chunks_to_upload, batch_size)

    def delete_index_if_exists(self):
        """Delete Pinecone index if it exists."""
        try:
            if self.index_name in self.pc.list_indexes().names():
                self.pc.delete_index(self.index_name)
                print(f"✅ Deleted index: {self.index_name}")
            else:
                print(f"ℹ️  Index '{self.index_name}' does not exist, no need to delete")
        except Exception as e:
            print(f"❌ Failed to delete index: {e}")

    def query_index(self, query: str, top_k: int = 5,rerank_method: str = 'cohere',embedding_method: str = "openai"):
        """Query Pinecone index."""
        try:
            # Generate embedding for the query
            self.embedding_method = embedding_method or "openai"
            print(f"🔄 Generating embedding for query: '{query}' using {self.embedding_method}...")
            query_embedding = self.embedding_generator.generate(query,method=self.embedding_method)
            # query_embedding = generate_openai_query_embedding(query)
            print("✅ Query embedding generated successfully")
            
            # Query Pinecone
            print(f"🔍 Querying Pinecone index '{self.index_name}'...")
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            print(f"✅ Retrieved {len(results['matches'])} results")
            print("📋 Results:")
            
            if rerank_method and rerank_method != 'None':
                # Note: Reranker implementation needs to be fixed separately
                print("🔄 Reranking functionality available but needs implementation fix")
                # results=self.re_ranker.rerank(query,results=[],method=rerank_method,top_k=top_k)
                # print("🔄 Reranked Results:")
                
            for match in results['matches']:
                print(f" - ID: {match['id']}, Score: {match['score']:.4f}")
                # Print key metadata
                metadata = match.get('metadata', {})
                if 'summary' in metadata:
                    print(f"   Summary: {metadata['summary'][:100]}...")
                if 'sheet_name' in metadata:
                    print(f"   Sheet: {metadata['sheet_name']}")
                    
            return results
        except Exception as e:
            print(f"❌ Failed to query index: {e}")
            return None

class HybridSearcher:
    def __init__(self,sparse_index:PineconeUploader,dense_index:PineconeUploader, alpha: float = 0.5, top_k: int = 5):
        self.alpha = alpha
        self.top_k = top_k
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        self.sparse_index = sparse_index
        self.dense_index = dense_index
        
    def hybrid_query(self, query: str,sparse_embedding_method: str = "sbert",dense_embedding_method: str = "openai"):
        """
        Hybrid search: combines keyword (sparse) and semantic search (dense).   
        Args:
            query: The search query string
        """
        sparse_result=self.sparse_index.query_index(query,top_k=self.top_k,embedding_method=sparse_embedding_method)
        dense_result=self.dense_index.query_index(query,top_k=self.top_k,embedding_method=dense_embedding_method)

        # Step 3: Blend scores manually (alpha controls weighting)
        chunked_results={ "sparse":sparse_result,"dense":dense_result}
        return chunked_results
        pass

        
if __name__ == "__main__":
    # chunk_and_upload_to_pinecone(pinecone_index_name="skopeo-context-index-dense")
    print("🚀 Loading anchored index data...")
    index_data = load_anchored_index()
    
    # Initialize uploader
    skopeo_context_index_dense=PineconeUploader(index_name='skopeo-context-index-dense')
    # skopeo_context_index_sparse=PineconeUploader(index_name='skopeo-context-index-sparse')

    # Delete existing index if needed (uncomment to reset)
    # skopeo_context_index_dense.delete_index_if_exists()
    # skopeo_context_index_sparse.delete_index_if_exists()

    # Upload data with OpenAI embeddings
    print("🚀 Starting upload process...")
    skopeo_context_index_dense.upload_data(index_data,embedding_method="openai")
    
    # Test query
    print("🔍 Testing query...")
    skopeo_context_index_dense.query_index("List all companies with high paying jobs")

    # Sparse embeddings (commented out - uncomment to use)
    # skopeo_context_index_sparse.upload_data(index_data,embedding_method="sbert")
    # results=skopeo_context_index_sparse.query_index("Where is IQ 104 located?",rerank_method=None,embedding_method="sbert",)
    # print(get_chunk_ranges(results))
    
    # Clean up (uncomment to delete index)
    # skopeo_context_index_dense.delete_index_if_exists()
