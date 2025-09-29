from pinecone import Pinecone
import requests
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModelForMaskedLM
import torch
# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")


# Load a SPLADE model
model_name = "naver/splade-cocondenser-ensembledistil"  
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForMaskedLM.from_pretrained(model_name)

def splade_encode(text: str):
    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits.squeeze(0)  # [seq_len, vocab_size]
    
    # SPLADE uses log(1+relu(logits)) to get weights
    relu = torch.nn.functional.relu(logits)
    sparse_emb = torch.log(1 + relu).sum(0)  # collapse seq_len into vocab_size

    # Convert to sparse Pinecone format: {indices, values}
    non_zero = sparse_emb.nonzero().squeeze().cpu().tolist()
    values = sparse_emb[non_zero].cpu().tolist()

    return {"indices": non_zero, "values": values}
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('rag_queries.log'),
        logging.StreamHandler()  # Also print to console
    ]
)
logger = logging.getLogger(__name__)

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
sparse_index = pc.Index(PINECONE_INDEX_NAME_SPARSE)
dense_index = pc.Index(PINECONE_INDEX_NAME_DENSE)

logger.info(f"Connected to Pinecone index: {PINECONE_INDEX_NAME}")

def generate_openai_query_embedding(query: str) -> list:
    """Generate embedding for query using OpenAI API."""
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "input": [query],
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
            return result["data"][0]["embedding"]  # Return first (and only) embedding
        else:
            logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            raise Exception(f"OpenAI API error: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Failed to generate OpenAI query embedding: {e}")
        raise e
    
# Perform RAG query 
def dense_query(query="hello world test "):
    # If query is provided as argument, use it; otherwise use default
    import sys
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    
    logger.info(f"Starting RAG query: '{query}'")
    
    try:
        # Embed query using OpenAI
        logger.info("Generating query embedding...")
        dense_query = generate_openai_query_embedding(query)
        logger.info("Query embedding generated successfully")

        # Query Pinecone for top 5 chunks
        logger.info("Querying Pinecone index...")
        res = dense_query.query(vector=dense_query, top_k=5, include_metadata=True)
        logger.info(f"Retrieved {len(res['matches'])} results from Pinecone")

        # Log results
        logger.info("=== RAG QUERY RESULTS ===")
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
        
        logger.info("=== END RAG QUERY RESULTS ===")
        return res
    except Exception as e:
        logger.error(f"Error during RAG query: {e}")
        raise e

def sparse_query(query='hello world test'):
    import sys
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    
    logger.info(f"Starting RAG query: '{query}'")
    
    try:
        # Embed query using OpenAI
        logger.info("Generating query embedding...")
        sparse_query = splade_encode(query)
        logger.info("Query embedding generated successfully")

        # Query Pinecone for top 5 chunks
        logger.info("Querying Pinecone index...")
        res = sparse_index.query(vector=sparse_query, top_k=5, include_metadata=True)
        logger.info(f"Retrieved {len(res['matches'])} results from Pinecone")

        # Log results
        logger.info("=== RAG QUERY RESULTS ===")
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
        
        logger.info("=== END RAG QUERY RESULTS ===")
        return res
    except Exception as e:
        logger.error(f"Error during RAG query: {e}")
        raise e


def hybrid_search(query: str ="hello world", alpha: float = 0.5, top_k: int = 5):
    """
    Perform hybrid search in Pinecone using both dense (OpenAI) and sparse (SPLADE) embeddings.
    alpha: weight factor between dense and sparse (0.0 = only sparse, 1.0 = only dense).
    """
    logger.info(f"Starting HYBRID query: '{query}' with alpha={alpha}")

    try:
        # 1. Get dense embedding
        dense_vec = generate_openai_query_embedding(query)

        # 2. Get sparse embedding
        sparse_vec = splade_encode(query)

        # 3. Build Pinecone hybrid query
        res = pc.Index(PINECONE_INDEX_NAME).query(
            vector=dense_vec,
            sparse_vector=sparse_vec,
            top_k=top_k,
            include_metadata=True,
            alpha=alpha  # balances dense vs sparse
        )

        logger.info(f"Retrieved {len(res['matches'])} results from Pinecone")

        # 4. Log results
        logger.info("=== HYBRID QUERY RESULTS ===")
        for i, match in enumerate(res["matches"], 1):
            metadata = match["metadata"]
            score = match["score"]
            chunk_id = match["id"]

            logger.info(f"Result {i}: Score: {score:.3f} | ID: {chunk_id}")
            logger.info(f"  Summary: {metadata.get('summary', 'N/A')}")
            logger.info(f"  Context: {metadata.get('context', 'N/A')}")

        logger.info("=== END HYBRID QUERY RESULTS ===")
        return res

    except Exception as e:
        logger.error(f"Error during HYBRID query: {e}")
        raise e

if __name__ == "__main__":
    dense_query()
    sparse_query()
    hybrid_search("hello world", alpha=0.5, top_k=5)