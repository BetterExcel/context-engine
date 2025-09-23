import json
import openpyxl
import requests
import time
from typing import Dict, List, Any, Union
from datetime import datetime
from collections import defaultdict
import re

# Ollama configuration
OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.1:8b"

def call_ollama(prompt: str, max_retries: int = 3) -> str:
    """Call Ollama API with retry logic."""
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "").strip()
        except Exception as e:
            print(f"Ollama attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise Exception(f"Ollama failed after {max_retries} attempts: {e}")

def parse_intent_for_field(query: str) -> Dict:
    """
    Parse user query to determine what field should be added to the index.
    
    Args:
        query: User's natural language query
        
    Returns:
        Dictionary with field information
    """
    prompt = f"""
    Analyze this user query and determine what field should be added to the index: "{query}"
    
    Return ONLY a valid JSON response with this structure:
    {{
        "field_name": "name_of_field_to_add",
        "field_type": "list|string|number|boolean",
        "extraction_instruction": "how to extract this field from chunk data",
        "confidence": 0.0-1.0
    }}
    
    Examples:
    - "What companies are in the US?" → field_name: "location", field_type: "list", extraction_instruction: "extract countries, states, cities mentioned"
    - "Which company has highest salary?" → field_name: "salary_ranking", field_type: "string", extraction_instruction: "extract salary information and rank companies"
    - "What benefits do companies offer?" → field_name: "benefits", field_type: "list", extraction_instruction: "extract benefit information like health, dental, 401k"
    - "How many employees work there?" → field_name: "company_size", field_type: "string", extraction_instruction: "extract company size information"
    
    CRITICAL RULES:
    - Field name should be descriptive and reusable
    - Extraction instruction should be clear for LLM to follow
    - Confidence should be 0.0-1.0
    - Respond with ONLY the JSON object
    """
    
    try:
        response = call_ollama(prompt)
        print(f"Intent parsing response: {response[:200]}...")
        
        # Clean up JSON response
        cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
        
        # Parse JSON with fallback
        try:
            intent = json.loads(cleaned_response)
        except json.JSONDecodeError:
            # Fallback intent
            intent = {
                "field_name": "general_info",
                "field_type": "list",
                "extraction_instruction": "extract general information relevant to the query",
                "confidence": 0.5
            }
        
        return {
            "query": query,
            "field_info": intent,
            "parsed_at": time.time()
        }
        
    except Exception as e:
        print(f"Intent parsing failed: {e}")
        return {
            "query": query,
            "field_info": {
                "field_name": "general_info",
                "field_type": "list", 
                "extraction_instruction": "extract general information",
                "confidence": 0.3
            },
            "parsed_at": time.time()
        }

def extract_field_data_for_chunks(chunks: Dict, field_info: Dict) -> Dict:
    """
    Extract the new field data for all chunks using LLM.
    
    Args:
        chunks: Dictionary of chunk data
        field_info: Field information from intent parser
        
    Returns:
        Dictionary mapping chunk_id to extracted field data
    """
    
    field_name = field_info["field_name"]
    extraction_instruction = field_info["extraction_instruction"]
    
    print(f"Extracting '{field_name}' field for {len(chunks)} chunks...")
    
    extracted_data = {}
    
    for chunk_id, chunk_data in chunks.items():
        try:
            # Prepare chunk data for LLM
            chunk_summary = chunk_data.get("analysis", {}).get("summary", "")
            chunk_key_values = chunk_data.get("analysis", {}).get("key_values", [])
            chunk_patterns = chunk_data.get("analysis", {}).get("patterns", [])
            
            prompt = f"""
            Extraction Instruction: {extraction_instruction}
            
            Chunk Data:
            - Summary: {chunk_summary}
            - Key Values: {chunk_key_values}
            - Patterns: {chunk_patterns}
            
            Extract the requested information and return ONLY a valid JSON response:
            {{
                "extracted_data": "the extracted information based on the instruction",
                "confidence": 0.0-1.0,
                "source_indicators": ["what parts of the data led to this extraction"]
            }}
            
            CRITICAL RULES:
            - Be precise and factual
            - Only extract information that is clearly present
            - Confidence should reflect how certain you are
            - Respond with ONLY the JSON object
            """
            
            response = call_ollama(prompt)
            
            # Clean up and parse response
            cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
            
            try:
                extraction_result = json.loads(cleaned_response)
                extracted_data[chunk_id] = {
                    "value": extraction_result.get("extracted_data", ""),
                    "confidence": extraction_result.get("confidence", 0.5),
                    "source_indicators": extraction_result.get("source_indicators", [])
                }
            except json.JSONDecodeError:
                # Fallback extraction
                extracted_data[chunk_id] = {
                    "value": "Unable to extract",
                    "confidence": 0.1,
                    "source_indicators": ["JSON parsing failed"]
                }
            
            print(f"Extracted for {chunk_id}: {extracted_data[chunk_id]['value'][:50]}...")
            
        except Exception as e:
            print(f"Failed to extract data for {chunk_id}: {e}")
            extracted_data[chunk_id] = {
                "value": "Extraction failed",
                "confidence": 0.0,
                "source_indicators": [f"Error: {str(e)}"]
            }
    
    return extracted_data

def update_index_with_new_field(existing_index: Dict, field_info: Dict, extracted_data: Dict) -> Dict:
    """
    Update the existing index with the new field.
    
    Args:
        existing_index: Current index structure
        field_info: Information about the new field
        extracted_data: Extracted data for all chunks
        
    Returns:
        Updated index with new field
    """
    
    field_name = field_info["field_name"]
    field_type = field_info["field_type"]
    
    print(f"Adding '{field_name}' field to index...")
    
    # Create a copy of the existing index
    updated_index = json.loads(json.dumps(existing_index))  # Deep copy
    
    # Add field metadata to the index
    if "field_metadata" not in updated_index:
        updated_index["field_metadata"] = {}
    
    updated_index["field_metadata"][field_name] = {
        "field_type": field_type,
        "extraction_instruction": field_info["extraction_instruction"],
        "added_at": time.time(),
        "confidence": field_info["confidence"]
    }
    
    # Add the field to each chunk's analysis
    for sheet_name, sheet_data in updated_index.get("sheets", {}).items():
        for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
            if chunk_id in extracted_data:
                chunk_data["analysis"][field_name] = extracted_data[chunk_id]["value"]
                chunk_data["analysis"][f"{field_name}_confidence"] = extracted_data[chunk_id]["confidence"]
                chunk_data["analysis"][f"{field_name}_sources"] = extracted_data[chunk_id]["source_indicators"]
            else:
                chunk_data["analysis"][field_name] = "Not extracted"
                chunk_data["analysis"][f"{field_name}_confidence"] = 0.0
                chunk_data["analysis"][f"{field_name}_sources"] = []
    
    return updated_index

def load_existing_index(file_path: str = "anchored_index_output.json") -> Dict:
    """Load existing index from JSON file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        print(f"Loaded existing index with {len(data.get('sheets', {}))} sheets")
        return data
    except FileNotFoundError:
        print(f"Warning: {file_path} not found. Starting with empty index.")
        return {"sheets": {}, "field_metadata": {}}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        return {"sheets": {}, "field_metadata": {}}

def save_updated_index(updated_index: Dict, output_file: str = "dynamic_index_output.json"):
    """Save the updated index to a JSON file."""
    try:
        with open(output_file, 'w') as f:
            json.dump(updated_index, f, indent=2, default=str)
        print(f"Updated index saved to {output_file}")
    except Exception as e:
        print(f"Error saving index: {e}")

def process_query_for_field_addition(query: str, existing_index: Dict = None) -> Dict:
    """
    Main function to process a user query and add the corresponding field to the index.
    
    Args:
        query: User's natural language query
        existing_index: Existing index (if None, will load from file)
        
    Returns:
        Updated index with new field
    """
    
    print(f"Processing query: '{query}'")
    print("=" * 50)
    
    # Load existing index if not provided
    if existing_index is None:
        existing_index = load_existing_index()
    
    # Step 1: Parse intent to determine field to add
    print("Step 1: Parsing intent...")
    intent_result = parse_intent_for_field(query)
    field_info = intent_result["field_info"]
    
    print(f"Field to add: {field_info['field_name']}")
    print(f"Field type: {field_info['field_type']}")
    print(f"Confidence: {field_info['confidence']}")
    
    # Check if field already exists
    existing_fields = existing_index.get("field_metadata", {}).keys()
    if field_info["field_name"] in existing_fields:
        print(f"Field '{field_info['field_name']}' already exists. Skipping extraction.")
        return existing_index
    
    # Step 2: Extract field data for all chunks
    print("\nStep 2: Extracting field data...")
    all_chunks = {}
    for sheet_name, sheet_data in existing_index.get("sheets", {}).items():
        all_chunks.update(sheet_data.get("anchors", {}))
    
    if not all_chunks:
        print("No chunks found in existing index.")
        return existing_index
    
    extracted_data = extract_field_data_for_chunks(all_chunks, field_info)
    
    # Step 3: Update index with new field
    print("\nStep 3: Updating index...")
    updated_index = update_index_with_new_field(existing_index, field_info, extracted_data)
    
    # Step 4: Save updated index
    print("\nStep 4: Saving updated index...")
    save_updated_index(updated_index)
    
    print(f"\nSuccessfully added '{field_info['field_name']}' field to the index!")
    print(f"Total fields in index: {len(updated_index.get('field_metadata', {}))}")
    
    return updated_index

def interactive_field_addition_mode():
    """Interactive mode for adding fields based on user queries."""
    
    print("\n" + "="*60)
    print("DYNAMIC FIELD ADDITION MODE")
    print("="*60)
    print("Enter queries to add new fields to the index. Type 'quit' to exit.")
    print("Example queries:")
    print("- What companies are in the US?")
    print("- Which company has the highest salary ranges?")
    print("- What benefits do companies offer?")
    print("="*60)
    
    # Load existing index
    existing_index = load_existing_index()
    
    while True:
        try:
            query = input("\nEnter your query: ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                break
            
            if not query:
                print("Please enter a valid query.")
                continue
            
            # Process query and add field
            updated_index = process_query_for_field_addition(query, existing_index)
            existing_index = updated_index  # Update for next iteration
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    print("Dynamic Index Builder - Field Addition System")
    print("=" * 50)
    
    # Test with sample queries
    test_queries = [
        "What companies are in the US?",
        "Which company has the highest salary ranges?",
        "What benefits do companies offer?"
    ]
    
    print("Choose mode:")
    print("1. Test with predefined queries")
    print("2. Interactive mode")
    
    choice = input("Enter choice (1-2): ").strip()
    
    if choice == "1":
        # Test with predefined queries
        existing_index = load_existing_index()
        
        for query in test_queries:
            print(f"\n{'='*60}")
            existing_index = process_query_for_field_addition(query, existing_index)
    
    elif choice == "2":
        # Interactive mode
        interactive_field_addition_mode()
    
    else:
        print("Invalid choice. Exiting.")
