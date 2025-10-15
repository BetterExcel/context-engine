#!/usr/bin/env python3
"""
Hybrid Search Module
===================

This module provides two separate search classes:
1. SemanticSearch - Vector database search using embeddings
2. LexicalSearch - Keyword-based search using BM25/TF-IDF

Usage:
    from hybrid_search import SemanticSearch, LexicalSearch
    
    # Initialize both
    semantic = SemanticSearch()
    lexical = LexicalSearch()
    
    # Get results from both
    semantic_results = semantic.search("query", top_k=5)
    lexical_results = lexical.search("query", top_k=5)
    
    # Combine as needed
"""

import logging
import json
import os
import re
import math
from typing import List, Dict, Any, Optional
from collections import Counter, defaultdict
from difflib import SequenceMatcher

from embedding_generation import EmbeddingGenerator
from pinecone import Pinecone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SemanticSearch:
    """
    Semantic search using vector embeddings and Pinecone.
    """
    
    def __init__(self, 
                 pinecone_api_key: str = None,
                 pinecone_index_name: str = None,
                 embedding_model: str = "openai"):
        """
        Initialize semantic search.
        
        Args:
            pinecone_api_key: Pinecone API key
            pinecone_index_name: Name of the Pinecone index
            embedding_model: Embedding model to use
        """
        self.pinecone_api_key = pinecone_api_key or os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = pinecone_index_name or os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")
        
        # Initialize components
        self.embedding_generator = EmbeddingGenerator()
        
        # Initialize Pinecone
        if self.pinecone_api_key:
            self.pc = Pinecone(api_key=self.pinecone_api_key)
            self.index = self.pc.Index(self.pinecone_index_name)
        else:
            logger.warning("No Pinecone API key provided. Semantic search will not be available.")
            self.index = None
        
        self.embedding_model = embedding_model
    
    def search(self, 
               query: str, 
               top_k: int = 5,
               embedding_method: str = "openai") -> List[Dict[str, Any]]:
        """
        Perform semantic search using vector embeddings.
        
        Args:
            query: Search query
            top_k: Number of results to return
            embedding_method: Embedding method to use
            
        Returns:
            List of semantic search results
        """
        if not self.index:
            logger.warning("Pinecone index not available for semantic search")
            return []
        
        try:
            # Generate query embedding
            logger.info(f"Generating {embedding_method} embedding for query: '{query}'")
            query_embedding = self.embedding_generator.generate(query, method=embedding_method)
            
            # Query Pinecone
            logger.info("Querying Pinecone for semantic matches...")
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            # Format results
            semantic_results = []
            for match in results['matches']:
                semantic_results.append({
                    'doc_id': match['id'],
                    'score': match['score'],
                    'metadata': match.get('metadata', {}),
                    'search_type': 'semantic',
                    'embedding_method': embedding_method
                })
            
            logger.info(f"Found {len(semantic_results)} semantic results")
            return semantic_results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []


class LexicalSearch:
    """
    Lexical search using keyword matching with multiple algorithms.
    """
    
    def __init__(self):
        """Initialize lexical search."""
        self.documents = {}
        self.vocabulary = set()
        self.doc_freq = defaultdict(int)
        self.total_docs = 0
        self.index_built = False
    
    def build_index(self, documents: Dict[str, Dict[str, Any]]):
        """
        Build a lexical index from documents.
        
        Args:
            documents: Dictionary of document_id -> document_data
        """
        logger.info("Building lexical search index...")
        
        self.documents = documents
        self.total_docs = len(documents)
        self.vocabulary = set()
        self.doc_freq = defaultdict(int)
        
        # Build vocabulary and document frequency
        for doc_id, doc_data in documents.items():
            # Extract searchable text
            searchable_text = self._extract_searchable_text(doc_data)
            tokens = self._tokenize(searchable_text)
            
            # Update vocabulary and document frequency
            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.vocabulary.add(token)
                self.doc_freq[token] += 1
        
        self.index_built = True
        logger.info(f"Built lexical index with {len(self.vocabulary)} unique terms from {self.total_docs} documents")
    
    def search(self, 
               query: str, 
               top_k: int = 5, 
               method: str = "bm25",
               debug: bool = False) -> List[Dict[str, Any]]:
        """
        Perform lexical search on the indexed documents.
        
        Args:
            query: Search query string
            top_k: Number of top results to return
            method: Search method ('exact', 'fuzzy', 'tfidf', 'bm25')
            
        Returns:
            List of search results with scores
        """
        if not self.index_built:
            logger.warning("Lexical index not built. Please call build_index() first.")
            return []
        
        if not self.documents:
            logger.warning("No documents indexed.")
            return []
        
        query_tokens = self._tokenize(query.lower())
        if not query_tokens:
            logger.warning("Query contains no valid searchable terms")
            return []
        
        logger.info(f"Performing {method} lexical search for: '{query}'")
        logger.info(f"Query tokens: {query_tokens}")
        
        if debug:
            logger.info("=== DEBUG: Sample document text extraction ===")
            for i, (doc_id, doc_data) in enumerate(list(self.documents.items())[:2]):
                extracted_text = self._extract_searchable_text(doc_data)
                tokens = self._tokenize(extracted_text)
                logger.info(f"Doc {i+1}: {doc_id}")
                logger.info(f"  Extracted: {extracted_text[:200]}...")
                logger.info(f"  Tokens: {tokens[:20]}...")
        
        if method == "exact":
            results = self._exact_match_search(query_tokens, top_k)
        elif method == "fuzzy":
            results = self._fuzzy_match_search(query_tokens, top_k)
        elif method == "tfidf":
            results = self._tfidf_search(query_tokens, top_k)
        elif method == "bm25":
            results = self._bm25_search(query_tokens, top_k)
        else:
            raise ValueError(f"Unknown search method: {method}")
        
        # Format results with metadata
        lexical_results = []
        for result in results:
            doc_id = result['doc_id']
            doc_data = self.documents.get(doc_id, {})
            
            lexical_results.append({
                'doc_id': doc_id,
                'score': result['score'],
                'metadata': doc_data,
                'search_type': 'lexical',
                'lexical_method': method,
                'matches': result.get('matches', 0)
            })
        
        logger.info(f"Found {len(lexical_results)} lexical results")
        return lexical_results
    
    def _extract_searchable_text(self, doc_data: Dict[str, Any]) -> str:
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
        
        # Extract from ALL field data - this is the key fix!
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
        
        return ' '.join(searchable_parts).lower()
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into searchable terms."""
        # Remove special characters and split into words
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        
        # Filter out very short tokens and common stop words
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'row', 'col', 'cell'}
        
        # Keep important tokens: longer than 2 chars OR cell references (like A1, B2, D7)
        filtered_tokens = []
        for token in tokens:
            # Keep cell references (letter + number pattern, case insensitive)
            if re.match(r'^[A-Za-z]+\d+$', token):
                filtered_tokens.append(token)
            # Keep longer tokens that aren't stop words
            elif len(token) > 2 and token not in stop_words:
                filtered_tokens.append(token)
        
        return filtered_tokens
    
    def _exact_match_search(self, query_tokens: List[str], top_k: int) -> List[Dict[str, Any]]:
        """Exact keyword matching."""
        results = []
        
        for doc_id, doc_data in self.documents.items():
            searchable_text = self._extract_searchable_text(doc_data)
            doc_tokens = self._tokenize(searchable_text)
            doc_token_set = set(doc_tokens)
            
            # Count exact matches
            exact_matches = sum(1 for token in query_tokens if token in doc_token_set)
            if exact_matches > 0:
                score = exact_matches / len(query_tokens)  # Normalize by query length
                results.append({
                    'doc_id': doc_id,
                    'score': score,
                    'matches': exact_matches,
                    'method': 'exact'
                })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)[:top_k]
    
    def _fuzzy_match_search(self, query_tokens: List[str], top_k: int) -> List[Dict[str, Any]]:
        """Fuzzy string matching with similarity scores."""
        results = []
        similarity_threshold = 0.6
        
        for doc_id, doc_data in self.documents.items():
            searchable_text = self._extract_searchable_text(doc_data)
            doc_tokens = self._tokenize(searchable_text)
            
            total_similarity = 0
            valid_matches = 0
            
            for query_token in query_tokens:
                best_similarity = 0
                for doc_token in doc_tokens:
                    similarity = SequenceMatcher(None, query_token, doc_token).ratio()
                    best_similarity = max(best_similarity, similarity)
                
                if best_similarity >= similarity_threshold:
                    total_similarity += best_similarity
                    valid_matches += 1
            
            if valid_matches > 0:
                score = total_similarity / len(query_tokens)
                results.append({
                    'doc_id': doc_id,
                    'score': score,
                    'matches': valid_matches,
                    'method': 'fuzzy'
                })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)[:top_k]
    
    def _tfidf_search(self, query_tokens: List[str], top_k: int) -> List[Dict[str, Any]]:
        """TF-IDF based search."""
        results = []
        
        for doc_id, doc_data in self.documents.items():
            searchable_text = self._extract_searchable_text(doc_data)
            doc_tokens = self._tokenize(searchable_text)
            doc_token_counts = Counter(doc_tokens)
            doc_length = len(doc_tokens)
            
            tfidf_score = 0
            for query_token in query_tokens:
                if query_token in doc_token_counts:
                    # Term frequency
                    tf = doc_token_counts[query_token] / doc_length
                    
                    # Inverse document frequency
                    idf = math.log(self.total_docs / self.doc_freq[query_token])
                    
                    tfidf_score += tf * idf
            
            if tfidf_score > 0:
                results.append({
                    'doc_id': doc_id,
                    'score': tfidf_score,
                    'matches': len([t for t in query_tokens if t in doc_token_counts]),
                    'method': 'tfidf'
                })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)[:top_k]
    
    def _bm25_search(self, query_tokens: List[str], top_k: int) -> List[Dict[str, Any]]:
        """BM25 (Best Matching 25) search algorithm."""
        results = []
        k1 = 1.2  # Term frequency saturation parameter
        b = 0.75   # Length normalization parameter
        
        # Calculate average document length
        total_length = sum(len(self._tokenize(self._extract_searchable_text(doc_data))) 
                          for doc_data in self.documents.values())
        avg_doc_length = total_length / self.total_docs if self.total_docs > 0 else 1
        
        for doc_id, doc_data in self.documents.items():
            searchable_text = self._extract_searchable_text(doc_data)
            doc_tokens = self._tokenize(searchable_text)
            doc_token_counts = Counter(doc_tokens)
            doc_length = len(doc_tokens)
            
            bm25_score = 0
            for query_token in query_tokens:
                if query_token in doc_token_counts:
                    # Term frequency in document
                    tf = doc_token_counts[query_token]
                    
                    # Inverse document frequency (ensure non-negative)
                    idf = max(0, math.log((self.total_docs - self.doc_freq[query_token] + 0.5) / 
                                         (self.doc_freq[query_token] + 0.5)))
                    
                    # BM25 score component
                    numerator = tf * (k1 + 1)
                    denominator = tf + k1 * (1 - b + b * (doc_length / avg_doc_length))
                    bm25_score += idf * (numerator / denominator)
            
            if bm25_score > 0:
                results.append({
                    'doc_id': doc_id,
                    'score': bm25_score,
                    'matches': len([t for t in query_tokens if t in doc_token_counts]),
                    'method': 'bm25'
                })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)[:top_k]
    
    def get_document(self, doc_id: str) -> Dict[str, Any]:
        """Get full document data by ID."""
        return self.documents.get(doc_id, {})
    
    def get_stats(self) -> Dict[str, Any]:
        """Get indexing statistics."""
        return {
            'total_documents': self.total_docs,
            'vocabulary_size': len(self.vocabulary),
            'avg_doc_length': sum(len(self._tokenize(self._extract_searchable_text(doc_data))) 
                                for doc_data in self.documents.values()) / max(self.total_docs, 1),
            'most_common_terms': Counter(self.vocabulary).most_common(10)
        }


def load_documents_from_files() -> Dict[str, Dict[str, Any]]:
    """
    Load documents from JSON files for lexical search.
    
    Returns:
        Dictionary of document_id -> document_data
    """
    documents = {}
    
    # Load from consolidated fields
    try:
        with open("consolidated_fields.json", "r") as f:
            consolidated_data = json.load(f)
            for field_name, field_data in consolidated_data.get("consolidated_chunks", {}).items():
                documents[f"Consolidated_{field_name}"] = field_data
        logger.info(f"Loaded {len(consolidated_data.get('consolidated_chunks', {}))} consolidated documents")
    except FileNotFoundError:
        logger.warning("consolidated_fields.json not found, skipping consolidated chunks")
    
    # Load from dynamic index
    try:
        with open("dynamic_index_output.json", "r") as f:
            dynamic_data = json.load(f)
            for sheet_name, sheet_data in dynamic_data.get("sheets", {}).items():
                for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
                    documents[f"{sheet_name}_{chunk_id}"] = chunk_data
        logger.info(f"Loaded documents from dynamic_index_output.json")
    except FileNotFoundError:
        logger.warning("dynamic_index_output.json not found, trying anchored index")
        
        # Fallback to anchored index
        try:
            with open("anchored_index_output.json", "r") as f:
                anchored_data = json.load(f)
                for sheet_name, sheet_data in anchored_data.get("sheets", {}).items():
                    for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
                        documents[f"{sheet_name}_{chunk_id}"] = chunk_data
            logger.info(f"Loaded documents from anchored_index_output.json")
        except FileNotFoundError:
            logger.error("No index files found!")
    
    logger.info(f"Total documents loaded: {len(documents)}")
    return documents


def main():
    """Test both search classes."""
    print("Hybrid Search Module Test")
    print("=" * 50)
    
    # Initialize both search classes
    semantic_search = SemanticSearch()
    lexical_search = LexicalSearch()
    
    # Load documents for lexical search
    documents = load_documents_from_files()
    if documents:
        lexical_search.build_index(documents)
    else:
        print("No documents loaded. Cannot test lexical search.")
        return
    
    # Test queries
    test_queries = [
        "companies paying more than 40"
    ]
    
    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Testing Query: '{query}'")
        print(f"{'='*60}")
        
        # Test semantic search
        print("\n--- SEMANTIC SEARCH RESULTS ---")
        semantic_results = semantic_search.search(query, top_k=3)
        for i, result in enumerate(semantic_results, 1):
            print(f"  {i}. {result['doc_id']} (score: {result['score']:.3f})")
            if 'summary' in result['metadata']:
                print(f"     Summary: {result['metadata']['summary'][:100]}...")
        
        # Test lexical search
        print("\n--- LEXICAL SEARCH RESULTS ---")
        lexical_results = lexical_search.search(query, top_k=3, method="bm25")
        for i, result in enumerate(lexical_results, 1):
            print(f"  {i}. {result['doc_id']} (score: {result['score']:.3f})")
            if 'summary' in result['metadata']:
                print(f"     Summary: {result['metadata']['summary'][:100]}...")
    
    # Print statistics
    print(f"\n{'='*60}")
    print("System Statistics")
    print(f"{'='*60}")
    print(f"Semantic search available: {semantic_search.index is not None}")
    print(f"Lexical search stats: {lexical_search.get_stats()}")


if __name__ == "__main__":
    main()