#!/usr/bin/env python3
"""
Smart Search Pipeline with Dynamic Field Addition
==================================================

This script implements an intelligent search strategy:
1. Try hybrid search first (semantic + lexical)
2. If results are above threshold, return them
3. If not, extract dynamic fields and search again
4. Return the best results

Usage: python3 smart_search.py "your query here"
"""

import sys
import os
import json
from typing import Dict, List, Any, Tuple
from datetime import datetime

# Add current directory to path
sys.path.append('.')

from hybrid_search import SemanticSearch, LexicalSearch, load_documents_from_files
from dynamic_index_builder import process_query_for_field_addition, load_existing_index
from pinecone_uploader_new import PineconeUploader

# Configuration
SEMANTIC_THRESHOLD = 0.6  # Minimum semantic score to consider results good
LEXICAL_THRESHOLD = 1   # Minimum lexical score to consider results good
COMBINED_THRESHOLD = 0.8  # Minimum combined score to consider results good
TOP_K = 6                 # Number of results to retrieve


def display_results(results: List[Dict], query: str, search_type: str = "Initial"):
    """Display search results in a formatted way."""
    print(f"\n{'='*80}")
    print(f"📊 {search_type} Search Results for: '{query}'")
    print(f"{'='*80}")
    
    if not results:
        print("❌ No results found")
        return
    
    for i, result in enumerate(results, 1):
        doc_id = result.get('doc_id')
        combined_score = result.get('combined_score', 0)
        semantic_score = result.get('semantic_score', 0)
        lexical_score = result.get('lexical_score', 0)
        search_types = result.get('search_types', [])
        metadata = result.get('metadata', {})
        
        print(f"\n🔍 Result {i}: {doc_id}")
        print(f"   Combined Score: {combined_score:.3f}")
        print(f"   Semantic Score: {semantic_score:.3f}")
        print(f"   Lexical Score:  {lexical_score:.3f}")
        print(f"   Search Types:   {', '.join(search_types)}")
        
        # Display metadata
        if 'summary' in metadata:
            summary = metadata['summary']
            print(f"   Summary: {summary[:100]}{'...' if len(summary) > 100 else ''}")
        
        if 'sheet_name' in metadata:
            print(f"   Sheet: {metadata['sheet_name']}")
        
        if 'range' in metadata:
            print(f"   Range: {metadata['range']}")
    
    print(f"\n{'='*80}")


def check_threshold(results: List[Dict], threshold: float = COMBINED_THRESHOLD) -> Tuple[bool, float, float]:
    """
    Check if results are good enough to skip dynamic extraction.
    
    Rule: If lexical < 1.0 AND semantic < 0.6, run dynamic extraction
    
    Returns:
        Tuple of (meets_threshold, best_semantic, best_lexical)
    """
    if not results:
        return False, 0.0, 0.0
    
    best_semantic = max(result.get('semantic_score', 0) for result in results)
    best_lexical = max(result.get('lexical_score', 0) for result in results)
    
    # If BOTH are below thresholds, we need dynamic extraction
    meets_threshold = best_semantic >= 0.6 or best_lexical >= 1.0
    
    return meets_threshold, best_semantic, best_lexical


def perform_hybrid_search(query: str, top_k: int = TOP_K) -> List[Dict]:
    """
    Perform hybrid search combining semantic and lexical search.
    
    Returns:
        List of search results with scores
    """
    print(f"\n🔍 Performing hybrid search...")
    
    # Initialize search components
    semantic_search = SemanticSearch()
    lexical_search = LexicalSearch()
    
    # Load documents for lexical search
    documents = load_documents_from_files()
    lexical_search.build_index(documents)
    
    # Perform semantic search
    print("   🔹 Running semantic search...")
    semantic_results = semantic_search.search(query, top_k=top_k, embedding_method="openai")
    
    # Perform lexical search
    print("   🔹 Running lexical search...")
    lexical_results = lexical_search.search(query, top_k=top_k, method="bm25")
    
    # Combine results
    print("   🔹 Combining results...")
    combined_results = combine_search_results(semantic_results, lexical_results, query)
    
    return combined_results


def combine_search_results(semantic_results: List[Dict], 
                          lexical_results: List[Dict], 
                          query: str,
                          semantic_weight: float = 0.6,
                          lexical_weight: float = 0.4) -> List[Dict]:
    """
    Combine semantic and lexical search results with weighted scoring.
    """
    # Create a dictionary to store combined scores
    combined = {}
    
    # Normalize semantic scores
    if semantic_results:
        max_semantic = max(r['score'] for r in semantic_results)
        for result in semantic_results:
            doc_id = result['doc_id']
            normalized_score = result['score'] / max_semantic if max_semantic > 0 else 0
            combined[doc_id] = {
                'doc_id': doc_id,
                'semantic_score': result['score'],
                'lexical_score': 0,
                'combined_score': normalized_score * semantic_weight,
                'metadata': result.get('metadata', {}),
                'search_types': ['semantic']
            }
    
    # Normalize lexical scores
    if lexical_results:
        max_lexical = max(r['score'] for r in lexical_results)
        for result in lexical_results:
            doc_id = result['doc_id']
            normalized_score = result['score'] / max_lexical if max_lexical > 0 else 0
            
            if doc_id in combined:
                # Update existing entry
                combined[doc_id]['lexical_score'] = result['score']
                combined[doc_id]['combined_score'] += normalized_score * lexical_weight
                combined[doc_id]['search_types'].append('lexical')
            else:
                # Create new entry
                combined[doc_id] = {
                    'doc_id': doc_id,
                    'semantic_score': 0,
                    'lexical_score': result['score'],
                    'combined_score': normalized_score * lexical_weight,
                    'metadata': result.get('metadata', {}),
                    'search_types': ['lexical']
                }
    
    # Sort by combined score and return top results
    sorted_results = sorted(combined.values(), key=lambda x: x['combined_score'], reverse=True)
    return sorted_results[:TOP_K]


def run_dynamic_field_extraction(query: str) -> bool:
    """
    Run dynamic field extraction for the query.
    
    Returns:
        True if successful, False otherwise
    """
    print(f"\n🔧 Running dynamic field extraction...")
    print(f"   Query: '{query}'")
    
    try:
        # Load existing index
        existing_index = load_existing_index()
        
        # Process the query and add fields
        updated_index = process_query_for_field_addition(query, existing_index, "test.xlsx")
        
        print(f"\n✅ Dynamic field extraction completed")
        print(f"   Total fields in index: {len(updated_index.get('field_metadata', {}))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during dynamic field extraction: {e}")
        return False


def main():
    """Main execution function."""
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("Usage: python3 smart_search.py '<query>'")
        print("Example: python3 smart_search.py 'canadian tech companies'")
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    
    print(f"\n{'='*80}")
    print(f"🚀 Smart Search Pipeline")
    print(f"{'='*80}")
    print(f"Query: '{query}'")
    print(f"Threshold: {COMBINED_THRESHOLD:.2f}")
    print(f"Top-K: {TOP_K}")
    print(f"{'='*80}")
    
    # Step 1: Initial hybrid search
    print(f"\n📍 STEP 1: Initial Hybrid Search")
    print(f"{'='*80}")
    
    initial_results = perform_hybrid_search(query, TOP_K)
    display_results(initial_results, query, "Initial")
    
    # Check if results meet threshold
    meets_threshold, best_semantic, best_lexical = check_threshold(initial_results)
    
    print(f"\n📊 Threshold Analysis:")
    print(f"   Best Semantic:   {best_semantic:.3f} (need ≥ 0.6)")
    print(f"   Best Lexical:    {best_lexical:.3f} (need ≥ 1.0)")
    print(f"   Rule: If semantic < 0.6 AND lexical < 1.0 → Run dynamic extraction")
    print(f"   Status:          {'✅ PASS - Good enough' if meets_threshold else '❌ FAIL - Need dynamic extraction'}")
    
    if meets_threshold:
        print(f"\n✅ Results meet threshold! Returning initial results.")
        print(f"\n{'='*80}")
        print(f"🎯 FINAL RESULTS (Initial Search)")
        print(f"{'='*80}")
        display_results(initial_results, query, "Final")
        return initial_results
    
    # Step 2: Dynamic field extraction
    print(f"\n📍 STEP 2: Dynamic Field Extraction")
    print(f"{'='*80}")
    print(f"⚠️  Initial results below threshold. Extracting dynamic fields...")
    
    success = run_dynamic_field_extraction(query)
    
    if not success:
        print(f"\n❌ Dynamic field extraction failed. Returning initial results.")
        return initial_results
    
    # Step 3: Second hybrid search after dynamic extraction
    print(f"\n📍 STEP 3: Second Hybrid Search (After Dynamic Extraction)")
    print(f"{'='*80}")
    
    final_results = perform_hybrid_search(query, TOP_K)
    display_results(final_results, query, "Final")
    
    # Check final scores
    meets_final_threshold, final_semantic, final_lexical = check_threshold(final_results)
    
    print(f"\n📊 Final Threshold Analysis:")
    print(f"   Best Semantic:   {final_semantic:.3f} (need ≥ 0.6)")
    print(f"   Best Lexical:    {final_lexical:.3f} (need ≥ 1.0)")
    print(f"   Status:          {'✅ PASS' if meets_final_threshold else '⚠️  STILL BELOW THRESHOLD'}")
    print(f"   Improvement:")
    print(f"      Semantic: {'+' if final_semantic > best_semantic else ''}{(final_semantic - best_semantic):.3f}")
    print(f"      Lexical:  {'+' if final_lexical > best_lexical else ''}{(final_lexical - best_lexical):.3f}")
    
    print(f"\n{'='*80}")
    print(f"🎯 FINAL RESULTS (After Dynamic Extraction)")
    print(f"{'='*80}")
    display_results(final_results, query, "Final")
    
    return final_results


if __name__ == "__main__":
    try:
        results = main()
        print(f"\n✅ Smart search pipeline completed successfully")
        sys.exit(0)
    except KeyboardInterrupt:
        print(f"\n\n⚠️  Search interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

