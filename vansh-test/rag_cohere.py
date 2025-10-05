from pinecone import Pinecone
import requests
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
COHERE_EMBEDDING_MODEL = os.getenv("COHERE_EMBEDDING_MODEL", "embed-english-v3.0")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('rag_queries_cohere.log'),
        logging.StreamHandler()  # Also print to console
    ]
)
logger = logging.getLogger(__name__)

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
logger.info(f"Connected to Pinecone index: {PINECONE_INDEX_NAME}")

def generate_cohere_query_embedding(query: str) -> list:
    """Generate embedding for query using Cohere API."""
    try:
        headers = {
            "Authorization": f"Bearer {COHERE_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "texts": [query],
            "model": COHERE_EMBEDDING_MODEL,
            "input_type": "search_query"
        }
        
        response = requests.post(
            "https://api.cohere.ai/v1/embed",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result["embeddings"][0]  # Return first (and only) embedding
        else:
            logger.error(f"Cohere API error: {response.status_code} - {response.text}")
            raise Exception(f"Cohere API error: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Failed to generate Cohere query embedding: {e}")
        raise e

def test_query(query="hello world test "):
    # If query is provided as argument, use it; otherwise use default
    import sys
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    
    logger.info(f"Starting RAG query with Cohere: '{query}'")
    
    try:
        # Embed query using Cohere
        logger.info("Generating query embedding...")
        query_emb = generate_cohere_query_embedding(query)
        logger.info("Query embedding generated successfully")

        # Query Pinecone for top 5 chunks
        logger.info("Querying Pinecone index...")
        res = index.query(vector=query_emb, top_k=5, include_metadata=True)
        logger.info(f"Retrieved {len(res['matches'])} results from Pinecone")

        # Log results
        logger.info("=== RAG QUERY RESULTS (COHERE) ===")
        for i, match in enumerate(res["matches"], 1):
            metadata = match["metadata"]
            score = match["score"]
            chunk_id = match["id"]
            
            logger.info(f"Result {i}: Score: {score:.3f} | ID: {chunk_id}")
            logger.info(f"  Summary: {metadata.get('summary', 'N/A')}")
            logger.info(f"  Context: {metadata.get('context', 'N/A')}")
            
            # Show complete table data
            table_data = metadata.get('table_data', '[]')
            if table_data != '[]':
                import json
                try:
                    table_list = json.loads(table_data)
                    if table_list:
                        logger.info(f"  Complete Table Data:")
                        for row_idx, row in enumerate(table_list):
                            logger.info(f"    Row {row_idx + 1}: {row}")
                except:
                    logger.info(f"  Complete Table Data: {table_data}")
            
            # Show complete extracted fields (including dynamic fields)
            for key, value in metadata.items():
                if key not in ['summary', 'context', 'table_data', 'headers', 'chunk_id', 'chunk_number', 'end_row', 'formulas', 'range', 'sheet_name', 'start_row'] and not key.endswith('_confidence') and not key.endswith('_sources'):
                    logger.info(f"  {key}: {value}")
            logger.info("")  # Empty line for readability
        
        logger.info("=== END RAG QUERY RESULTS (COHERE) ===")
        
    except Exception as e:
        logger.error(f"Error during RAG query: {e}")
        raise e


if __name__ == "__main__":
    test_query()
