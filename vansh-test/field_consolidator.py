#!/usr/bin/env python3
"""
Field Consolidator - Creates consolidated chunks for dynamic fields
This script creates a single chunk containing all extracted field data from all chunks,
making it easier to find comprehensive information about specific fields.
"""

import json
import os
import time
from typing import Dict, List, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

def load_dynamic_index() -> Dict:
    """Load the dynamic index with field data."""
    try:
        with open("dynamic_index_output.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ dynamic_index_output.json not found")
        return {}

def create_consolidated_chunk(field_name: str, field_data: Dict[str, List]) -> Dict:
    """
    Create a consolidated chunk for a specific field containing all extracted data.
    
    Args:
        field_name: Name of the field (e.g., 'tech_companies_list')
        field_data: Dictionary mapping chunk_id to extracted data
        
    Returns:
        Dictionary representing the consolidated chunk
    """
    
    # Collect all unique values from all chunks
    all_values = []
    source_chunks = []
    
    for chunk_id, values in field_data.items():
        if values:  # Only include non-empty values
            all_values.extend(values)
            source_chunks.append(chunk_id)
    
    # Remove duplicates while preserving order
    unique_values = list(dict.fromkeys(all_values))
    
    # Create summary and context
    field_display_name = field_name.replace('_', ' ').title()
    summary = f"Comprehensive list of {field_display_name.lower()} extracted from all data chunks"
    
    context = f"This consolidated chunk contains all {field_display_name.lower()} found across the entire dataset. "
    context += f"Data was extracted from {len(source_chunks)} source chunks and deduplicated to show {len(unique_values)} unique entries."
    
    # Create consolidated table data (one row per unique value)
    table_data = []
    for i, value in enumerate(unique_values, 1):
        table_data.append(f"Row {i}: {value}")
    
    consolidated_chunk = {
        "chunk_id": f"consolidated_{field_name}",
        "chunk_number": -1,  # Special number for consolidated chunks
        "summary": summary,
        "context": context,
        "table": table_data,
        "range": "CONSOLIDATED",
        "start_row": 0,
        "end_row": len(unique_values),
        "sheet_name": "Consolidated Fields",
        "formulas": [],
        # Store the field-specific data
        field_name: unique_values,
        f"{field_name}_source_chunks": source_chunks,
        f"{field_name}_total_count": len(unique_values),
        f"{field_name}_source_count": len(source_chunks),
        "consolidated_at": time.time()
    }
    
    return consolidated_chunk

def generate_consolidated_embedding(text: str) -> List[float]:
    """Generate embedding for consolidated chunk text."""
    import requests
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "input": [text],
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
            return result["data"][0]["embedding"]
        else:
            print(f"❌ OpenAI API error: {response.status_code} - {response.text}")
            raise Exception(f"OpenAI API error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Failed to generate embedding: {e}")
        raise e

def upload_consolidated_chunk_to_pinecone(consolidated_chunk: Dict, field_name: str):
    """Upload the consolidated chunk to Pinecone."""
    from pinecone import Pinecone
    
    try:
        print(f"🔄 Uploading consolidated chunk for field: {field_name}")
        
        # Initialize Pinecone
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX_NAME)
        
        # Create text for embedding (summary + context + field data)
        field_values = consolidated_chunk.get(field_name, [])
        field_text = f"{consolidated_chunk['summary']} {consolidated_chunk['context']} "
        field_text += f"Data: {', '.join(field_values[:10])}"  # Include first 10 values
        
        # Generate embedding
        embedding = generate_consolidated_embedding(field_text)
        
        # Prepare metadata (convert all values to strings for Pinecone)
        metadata = {}
        for key, value in consolidated_chunk.items():
            if isinstance(value, (list, dict)):
                metadata[key] = json.dumps(value)
            else:
                metadata[key] = str(value)
        
        # Upload to Pinecone
        index.upsert(
            vectors=[{
                "id": f"Consolidated_{field_name}",
                "values": embedding,
                "metadata": metadata
            }]
        )
        
        print(f"✅ Successfully uploaded consolidated chunk for {field_name}")
        
    except Exception as e:
        print(f"❌ Failed to upload consolidated chunk: {e}")
        raise e

def save_consolidated_index(consolidated_chunks: Dict[str, Dict]):
    """Save the consolidated chunks to a JSON file."""
    consolidated_index = {
        "metadata": {
            "total_consolidated_fields": len(consolidated_chunks),
            "created_at": time.time(),
            "description": "Consolidated chunks for dynamic fields - contains all extracted data combined"
        },
        "consolidated_chunks": consolidated_chunks
    }
    
    with open("consolidated_fields.json", "w") as f:
        json.dump(consolidated_index, f, indent=2)
    
    print(f"✅ Saved consolidated index with {len(consolidated_chunks)} fields")

def consolidate_fields_for_new_field(field_name: str, field_data: Dict[str, List]):
    """
    Main function to consolidate a new field and upload to Pinecone.
    
    Args:
        field_name: Name of the field to consolidate
        field_data: Dictionary mapping chunk_id to extracted field data
    """
    try:
        print(f"🔄 Consolidating field: {field_name}")
        
        # Create consolidated chunk
        consolidated_chunk = create_consolidated_chunk(field_name, field_data)
        
        # Load existing consolidated index
        consolidated_index = {}
        try:
            with open("consolidated_fields.json", "r") as f:
                consolidated_index = json.load(f).get("consolidated_chunks", {})
        except FileNotFoundError:
            consolidated_index = {}
        
        # Add new consolidated chunk
        consolidated_index[field_name] = consolidated_chunk
        
        # Save updated consolidated index
        save_consolidated_index(consolidated_index)
        
        # Upload to Pinecone
        upload_consolidated_chunk_to_pinecone(consolidated_chunk, field_name)
        
        print(f"✅ Successfully consolidated field: {field_name}")
        print(f"   - Total unique values: {consolidated_chunk[f'{field_name}_total_count']}")
        print(f"   - Source chunks: {consolidated_chunk[f'{field_name}_source_count']}")
        
        return consolidated_chunk
        
    except Exception as e:
        print(f"❌ Failed to consolidate field {field_name}: {e}")
        raise e

def main():
    """Main function for testing."""
    print("Field Consolidator - Testing")
    print("=" * 40)
    
    # Load dynamic index
    dynamic_index = load_dynamic_index()
    
    if not dynamic_index:
        print("❌ No dynamic index found")
        return
    
    # Find all dynamic fields
    field_metadata = dynamic_index.get("field_metadata", {})
    
    if not field_metadata:
        print("❌ No dynamic fields found")
        return
    
    print(f"Found {len(field_metadata)} dynamic fields:")
    for field_name, field_info in field_metadata.items():
        print(f"  Field: '{field_name}'")
        print(f"    Query: '{field_info.get('user_query', 'N/A')}'")
        print(f"    Type: {field_info.get('field_type', 'N/A')}")
    
    # For testing, consolidate the first field
    first_field = list(field_metadata.keys())[0]
    
    print(f"\n🔄 Testing consolidation with field: {first_field}")
    
    # Collect field data from all chunks
    field_data = {}
    for sheet_name, sheet_data in dynamic_index.get("sheets", {}).items():
        for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
            if first_field in chunk_data:
                field_data[chunk_id] = chunk_data[first_field]
    
    # Consolidate and upload
    consolidate_fields_for_new_field(first_field, field_data)

if __name__ == "__main__":
    main()
