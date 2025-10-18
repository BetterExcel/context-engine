#!/usr/bin/env python3
"""
Test script for embedding-based lexical search
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_documents():
    """Load documents from JSON files."""
    documents = {}
    
    # Load from anchored index
    try:
        with open("anchored_index_output.json", "r") as f:
            anchored_data = json.load(f)
            for sheet_name, sheet_data in anchored_data.get("sheets", {}).items():
                for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
                    documents[f"{sheet_name}_{chunk_id}"] = chunk_data
        logger.info(f"Loaded {len(documents)} documents from anchored_index_output.json")
    except FileNotFoundError:
        logger.error("anchored_index_output.json not found!")
        return {}
    
    return documents

def extract_searchable_text(doc_data):
    """Extract all searchable text from a document."""
    searchable_parts = []
    
    # Extract from different fields
    if 'summary' in doc_data:
        searchable_parts.append(doc_data['summary'])
    if 'context' in doc_data:
        searchable_parts.append(doc_data['context'])
    if 'table' in doc_data:
        if isinstance(doc_data['table'], list):
            searchable_parts.extend(doc_data['table'])
        elif isinstance(doc_data['table'], str):
            searchable_parts.append(doc_data['table'])
    
    # Extract from ALL field data
    for key, value in doc_data.items():
        # Handle field lists (like canadian_companies, startup_companies)
        if isinstance(value, list) and key.endswith(('_companies', '_sources', '_data')):
            searchable_parts.extend([str(v) for v in value])
        # Handle field names themselves
        elif isinstance(key, str) and key.endswith(('_companies', '_sources', '_data')):
            searchable_parts.append(key.replace('_', ' '))  # "canadian_companies" -> "canadian companies"
        # Handle other string fields
        elif isinstance(value, str) and len(value) > 3:
            searchable_parts.append(value)
    
    # Also extract from formulas if present
    if 'formulas' in doc_data and isinstance(doc_data['formulas'], list):
        searchable_parts.extend([str(f) for f in doc_data['formulas']])
    
    return ' '.join(searchable_parts)

def main():
    """Test embedding-based lexical search."""
    print("Testing Embedding-Based Lexical Search")
    print("=" * 50)
    
    # Load documents
    documents = load_documents()
    if not documents:
        print("No documents loaded. Exiting.")
        return
    
    print(f"Loaded {len(documents)} documents")
    
    # Initialize sentence transformer model
    print("Loading sentence transformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Generate embeddings for all documents
    print("Generating document embeddings...")
    doc_texts = []
    doc_ids = []
    
    for doc_id, doc_data in documents.items():
        searchable_text = extract_searchable_text(doc_data)
        if searchable_text.strip():
            doc_texts.append(searchable_text)
            doc_ids.append(doc_id)
    
    print(f"Generating embeddings for {len(doc_texts)} documents...")
    doc_embeddings = model.encode(doc_texts)
    
    # Test query
    query = "amd"
    print(f"\nTesting query: '{query}'")
    
    # Generate query embedding
    print("Generating query embedding...")
    query_embedding = model.encode([query])[0]
    
    # Calculate dot product similarities
    print("Calculating similarities...")
    similarities = []
    
    for i, doc_embedding in enumerate(doc_embeddings):
        # Dot product similarity (not normalized)
        similarity = np.dot(query_embedding, doc_embedding)
        similarities.append((doc_ids[i], similarity, doc_texts[i]))
    
    # Sort by similarity
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    # Display top results
    print(f"\nTop 5 results for '{query}':")
    print("-" * 50)
    
    for i, (doc_id, score, text) in enumerate(similarities[:5], 1):
        print(f"{i}. {doc_id} (score: {score:.4f})")
        print(f"   Text preview: {text[:150]}...")
        print()

if __name__ == "__main__":
    main()

