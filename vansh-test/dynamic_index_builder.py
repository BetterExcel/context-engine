import json
import requests
import time
from typing import Dict, List, Any, Union
from datetime import datetime
from collections import defaultdict
import re


# Try to import openpyxl
try:
    from openpyxl import load_workbook
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    print("Warning: openpyxl not available. Excel reading disabled.")

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# OpenAI Configuration from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))

if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not found in environment variables. Please check your .env file.")

def read_excel_range(excel_file_path: str, start_row: int, end_row: int, sheet_name: str = None) -> str:
    """
    Read a specific range of rows from an Excel file and return as formatted text.
    
    Args:
        excel_file_path: Path to the Excel file
        start_row: Starting row (1-based)
        end_row: Ending row (1-based)
        sheet_name: Name of the sheet (if None, uses first sheet)
        
    Returns:
        Formatted string of the cell data
    """
    if not OPENPYXL_AVAILABLE:
        return "Error: openpyxl not available for Excel reading"
    
    try:
        workbook = load_workbook(excel_file_path, read_only=True)
        
        if sheet_name:
            sheet = workbook[sheet_name]
        else:
            sheet = workbook.active
            
        data_lines = []
        
        for row_num in range(start_row, end_row + 1):
            row_data = []
            for col_num in range(1, sheet.max_column + 1):
                cell_value = sheet.cell(row=row_num, column=col_num).value
                if cell_value is not None:
                    row_data.append(str(cell_value))
                else:
                    row_data.append("")
            data_lines.append(f"Row {row_num}: {' | '.join(row_data)}")
        
        workbook.close()
        return "\n".join(data_lines)
        
    except Exception as e:
        return f"Error reading Excel range: {str(e)}"

# Anthropic function (commented out - using Ollama instead)
# def call_anthropic(prompt: str, max_retries: int = 3) -> str:
#     """Call Anthropic Claude API with retry logic."""
#     if not ANTHROPIC_API_KEY:
#         raise Exception("ANTHROPIC_API_KEY not found. Please check your config.py file.")
#     
#     headers = {
#         "x-api-key": ANTHROPIC_API_KEY,
#         "Content-Type": "application/json",
#         "anthropic-version": "2023-06-01"
#     }
#     
#     payload = {
#         "model": "claude-3-5-sonnet-20241022",
#         "max_tokens": 4000,
#         "temperature": 0.1,
#         "messages": [
#             {
#                 "role": "user",
#                 "content": prompt
#             }
#         ]
#     }
#     
#     for attempt in range(max_retries):
#         try:
#             response = requests.post(
#                 f"{ANTHROPIC_BASE_URL}/v1/messages",
#                 headers=headers,
#                 json=payload,
#                 timeout=60
#             )
#             response.raise_for_status()
#             result = response.json()
#             return result["content"][0]["text"]
#             
#         except Exception as e:
#             print(f"Anthropic attempt {attempt + 1} failed: {e}")
#             if attempt < max_retries - 1:
#                 time.sleep(2 ** attempt)  # Exponential backoff
#             else:
#                 raise Exception(f"Anthropic failed after {max_retries} attempts: {e}")

def call_openai(prompt: str, max_retries: int = 3) -> str:
    """Call OpenAI API with retry logic."""
    for attempt in range(max_retries):
        try:
            headers = {
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": OPENAI_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": OPENAI_MAX_TOKENS,
                "temperature": OPENAI_TEMPERATURE
            }
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"OpenAI attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise Exception(f"OpenAI failed after {max_retries} attempts: {e}")

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
        "field_name": "query_specific_field_name",
        "field_type": "list|string|number|boolean",
        "extraction_instruction": "specific instruction for extracting exactly what the query asks for",
        "confidence": 0.0-1.0
    }}
    
    STRATEGY: Create field names that directly answer the user's question and store only the relevant data.
    
    Examples:
    - "What companies are in the US?" → field_name: "us_companies", field_type: "list", extraction_instruction: "extract only company names that are located in the US"
    - "Which company has highest salary?" → field_name: "highest_salary_company", field_type: "string", extraction_instruction: "identify the single company with the highest salary and return just the company name"
    - "What benefits do companies offer?" → field_name: "company_benefits", field_type: "list", extraction_instruction: "extract all benefit types mentioned (health, dental, 401k, etc.)"
    - "How many employees work there?" → field_name: "employee_count", field_type: "number", extraction_instruction: "extract numerical employee count information"
    - "Which companies pay over $50/hr?" → field_name: "high_paying_companies", field_type: "list", extraction_instruction: "extract company names that pay over $50 per hour"
    - "What roles are available at Google?" → field_name: "google_roles", field_type: "list", extraction_instruction: "extract only job roles/positions available at Google"
    - "Which companies offer remote work?" → field_name: "remote_work_companies", field_type: "list", extraction_instruction: "extract company names that offer remote work options"
    
    CRITICAL RULES:
    - Field name should be query-specific and answer the exact question asked
    - Store only the data needed to answer the query (not extra information)
    - Extraction instruction should be precise about what to extract
    - Use snake_case for field names
    - Confidence should be 0.0-1.0
    - Respond with ONLY the JSON object
    """
    
    try:
        response = call_openai(prompt)
        print(f"Intent parsing response: {response[:200]}...")
        
        # Clean up JSON response
        cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
        
        # Parse JSON with fallback
        try:
            intent = json.loads(cleaned_response)
        except json.JSONDecodeError:
            # Fallback intent - create query-specific field name
            query_lower = query.lower().replace(" ", "_").replace("?", "").replace("what", "").replace("which", "").replace("how", "").replace("where", "").strip()
            intent = {
                "field_name": f"query_{query_lower[:20]}",  # Truncate to avoid too long names
                "field_type": "list",
                "extraction_instruction": f"extract information relevant to: {query}",
                "confidence": 0.5
            }
        
        return {
            "query": query,
            "field_info": intent,
            "parsed_at": time.time()
        }
        
    except Exception as e:
        print(f"Intent parsing failed: {e}")
        # Create query-specific fallback field name
        query_lower = query.lower().replace(" ", "_").replace("?", "").replace("what", "").replace("which", "").replace("how", "").replace("where", "").strip()
        return {
            "query": query,
            "field_info": {
                "field_name": f"query_{query_lower[:20]}",
                "field_type": "list", 
                "extraction_instruction": f"extract information relevant to: {query}",
                "confidence": 0.3
            },
            "parsed_at": time.time()
        }

def extract_field_data_for_chunks(chunks: Dict, field_info: Dict, excel_file_path: str) -> Dict:
    """
    Extract the new field data for all chunks using LLM with existing JSON table data.
    
    Args:
        chunks: Dictionary of chunk data
        field_info: Field information from intent parser
        excel_file_path: Path to the Excel file (not used anymore, kept for compatibility)
        
    Returns:
        Dictionary mapping chunk_id to extracted field data
    """
    
    field_name = field_info["field_name"]
    extraction_instruction = field_info["extraction_instruction"]
    
    print(f"Extracting '{field_name}' field for {len(chunks)} chunks...")
    
    extracted_data = {}
    
    for chunk_id, chunk_data in chunks.items():
        try:
            # Get the table data from the JSON (no need to re-read Excel)
            chunk_range = chunk_data.get("range", "")
            table_data = chunk_data.get("table", [])
            
            # Convert table data to a readable format
            if table_data:
                raw_cell_data = "\n".join([f"Row {i+1}: {row}" for i, row in enumerate(table_data)])
            else:
                raw_cell_data = "No table data available"
            
            # print(f"  Debug - Reading range {chunk_range} (rows {start_row}-{end_row})")
            # print(f"  Debug - Raw data preview: {raw_cell_data[:200]}...")
            
            prompt = f"""
            You are a data analyst helping to extract specific information from spreadsheet data.
            
            Task: {extraction_instruction}
            
            Here is the spreadsheet data from range {chunk_range}:
            {raw_cell_data}
            
            Please analyze this data and extract the requested information. Return ONLY a valid JSON response:
            {{
                "extracted_data": "the specific information requested",
                "confidence": 0.0-1.0,
                "source_indicators": ["what parts of the data led to this extraction"]
            }}
            
            IMPORTANT:
            - This is data analysis of spreadsheet content, not web scraping
            - Only extract information that is clearly present in the data above
            - Be precise and factual
            - Confidence should reflect how certain you are
            - Respond with ONLY the JSON object, no other text
            """
            
            response = call_openai(prompt)
            print(f"  Debug - API response: {response[:500]}...")
            
            # Clean up and parse response
            cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
            
            # Remove markdown code blocks if present
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response.replace('```json', '').replace('```', '').strip()
            elif cleaned_response.startswith('```'):
                cleaned_response = cleaned_response.replace('```', '').strip()
            
            # Try multiple parsing attempts
            extraction_result = None
            for attempt in range(3):
                try:
                    print(f"  Debug - Parsing attempt {attempt + 1}: {cleaned_response[:200]}...")
                    extraction_result = json.loads(cleaned_response)
                    print(f"  Debug - Successfully parsed: {extraction_result}")
                    break
                except json.JSONDecodeError as e:
                    print(f"  Debug - JSON parse error: {e}")
                    if attempt == 0:
                        # First attempt: try to fix common issues
                        cleaned_response = cleaned_response.replace("'", '"')  # Replace single quotes with double
                    elif attempt == 1:
                        # Second attempt: try to fix unescaped quotes
                        import re
                        cleaned_response = re.sub(r'(?<!\\)"(?=[^,}\]])', '\\"', cleaned_response)
                    else:
                        # Final attempt: create fallback
                        extraction_result = {
                            "extracted_data": "JSON parsing failed",
                            "confidence": 0.1,
                            "source_indicators": ["Parsing error"]
                        }
                        break
            
            if extraction_result:
                extracted_data[chunk_id] = {
                    "value": extraction_result.get("extracted_data", "No data"),
                    "confidence": extraction_result.get("confidence", 0.5),
                    "source_indicators": extraction_result.get("source_indicators", [])
                }
            else:
                # Ultimate fallback
                extracted_data[chunk_id] = {
                    "value": "Unable to extract",
                    "confidence": 0.1,
                    "source_indicators": ["All parsing attempts failed"]
                }
            
            value_preview = str(extracted_data[chunk_id]['value'])
            print(f"Extracted for {chunk_id}: {value_preview[:50]}...")
            
        except Exception as e:
            print(f"Failed to extract data for {chunk_id}: {e}")
            extracted_data[chunk_id] = {
                "value": "Extraction failed",
                "confidence": 0.0,
                "source_indicators": [f"Error: {str(e)}"]
            }
    
    return extracted_data

def update_index_with_new_field(existing_index: Dict, field_info: Dict, extracted_data: Dict, user_query: str) -> Dict:
    """
    Update the existing index with the new field, organized by user query.
    
    Args:
        existing_index: Current index structure
        field_info: Information about the new field
        extracted_data: Extracted data for all chunks
        user_query: The user query that generated this field
        
    Returns:
        Updated index with new field organized by user query
    """
    
    field_name = field_info["field_name"]
    field_type = field_info["field_type"]
    
    print(f"Adding '{field_name}' field to index for query: '{user_query}'...")
    
    # Create a copy of the existing index
    updated_index = json.loads(json.dumps(existing_index))  # Deep copy
    
    # Initialize user_queries structure if it doesn't exist
    if "user_queries" not in updated_index:
        updated_index["user_queries"] = {}
    
    # Initialize field_metadata if it doesn't exist
    if "field_metadata" not in updated_index:
        updated_index["field_metadata"] = {}
    
    # Add field metadata to the index
    updated_index["field_metadata"][field_name] = {
        "field_type": field_type,
        "extraction_instruction": field_info["extraction_instruction"],
        "added_at": time.time(),
        "confidence": field_info["confidence"],
        "user_query": user_query
    }
    
    # Add field to user_queries structure
    if user_query not in updated_index["user_queries"]:
        updated_index["user_queries"][user_query] = {
            "query": user_query,
            "fields": [],
            "created_at": time.time()
        }
    
    # Add field to the user query
    updated_index["user_queries"][user_query]["fields"].append(field_name)
    
    # Add the field to each chunk (directly to chunk data since we removed analysis wrapper)
    for sheet_name, sheet_data in updated_index.get("sheets", {}).items():
        for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
            if chunk_id in extracted_data:
                chunk_data[field_name] = extracted_data[chunk_id]["value"]
                chunk_data[f"{field_name}_confidence"] = extracted_data[chunk_id]["confidence"]
                chunk_data[f"{field_name}_sources"] = extracted_data[chunk_id]["source_indicators"]
            else:
                chunk_data[field_name] = "Not extracted"
                chunk_data[f"{field_name}_confidence"] = 0.0
                chunk_data[f"{field_name}_sources"] = []
    
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
        return {"sheets": {}, "field_metadata": {}, "user_queries": {}}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        return {"sheets": {}, "field_metadata": {}, "user_queries": {}}

def save_updated_index(updated_index: Dict, output_file: str = "dynamic_index_output.json"):
    """Save the updated index to a JSON file."""
    try:
        with open(output_file, 'w') as f:
            json.dump(updated_index, f, indent=2, default=str)
        print(f"Updated index saved to {output_file}")
    except Exception as e:
        print(f"Error saving index: {e}")

def copy_dynamic_to_anchored():
    """Copy dynamic_index_output.json to anchored_index_output.json to preserve fields."""
    try:
        import shutil
        shutil.copy2("dynamic_index_output.json", "anchored_index_output.json")
        print("✅ Fields preserved in anchored_index_output.json for future queries")
    except Exception as e:
        print(f"Warning: Could not copy dynamic index to anchored index: {e}")

def update_pinecone_index(updated_index: Dict):
    """Update Pinecone index with the new field data."""
    try:
        from pinecone_uploader import PineconeUploader
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")
        
        print("🔄 Updating Pinecone index with new field data...")
        
        # Initialize Pinecone uploader
        uploader = PineconeUploader(index_name=PINECONE_INDEX_NAME)
        
        # Upload the updated index data
        uploader.upload_data(updated_index, embedding_method="openai")
        
        print("✅ Pinecone index updated successfully with new field data")
        
    except ImportError:
        print("⚠️  Pinecone uploader not available. Skipping Pinecone update.")
    except Exception as e:
        print(f"⚠️  Failed to update Pinecone index: {e}")
        print("   Index data updated locally, but Pinecone sync failed")

def display_user_queries(index: Dict):
    """Display all user queries and their associated fields."""
    user_queries = index.get("user_queries", {})
    if not user_queries:
        print("No user queries found in the index.")
        return
    
    print("\n📋 User Queries and Fields:")
    print("=" * 50)
    for query, query_data in user_queries.items():
        fields = query_data.get("fields", [])
        created_at = query_data.get("created_at", "Unknown")
        print(f"Query: '{query}'")
        print(f"  Fields: {', '.join(fields)}")
        print(f"  Created: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(created_at))}")
        print()

def process_query_for_field_addition(query: str, existing_index: Dict = None, excel_file_path: str = "../test.xlsx") -> Dict:
    """
    Main function to process a user query and add the corresponding field to the index.
    
    Args:
        query: User's natural language query
        existing_index: Existing index (if None, will load from file)
        excel_file_path: Path to the Excel file for re-reading data
        
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
    
    extracted_data = extract_field_data_for_chunks(all_chunks, field_info, excel_file_path)
    
    # Step 3: Update index with new field
    print("\nStep 3: Updating index...")
    updated_index = update_index_with_new_field(existing_index, field_info, extracted_data, query)
    
    # Step 4: Save updated index and copy to anchored index
    print("\nStep 4: Saving updated index...")
    save_updated_index(updated_index)
    
    # Step 5: Copy dynamic index to anchored index to preserve fields
    print("\nStep 5: Preserving fields for future queries...")
    copy_dynamic_to_anchored()
    
    # Step 6: Update Pinecone index with new field data
    print("\nStep 6: Syncing with Pinecone...")
    update_pinecone_index(updated_index)
    
    # Step 7: Create consolidated chunk for the new field
    print("\nStep 7: Creating consolidated chunk...")
    try:
        from field_consolidator import consolidate_fields_for_new_field
        
        # Collect all extracted field data from all chunks
        field_data = {}
        for sheet_name, sheet_data in updated_index.get("sheets", {}).items():
            for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
                if field_info['field_name'] in chunk_data:
                    field_data[chunk_id] = chunk_data[field_info['field_name']]
        
        # Create consolidated chunk and upload to Pinecone
        consolidate_fields_for_new_field(field_info['field_name'], field_data)
        print(f"✅ Successfully created consolidated chunk for '{field_info['field_name']}'")
        
    except Exception as e:
        print(f"⚠️  Warning: Failed to create consolidated chunk: {e}")
        print("   (Pipeline will continue without consolidated chunk)")
    
    print(f"\nSuccessfully added '{field_info['field_name']}' field to the index!")
    print(f"Total fields in index: {len(updated_index.get('field_metadata', {}))}")
    
    # Display all user queries and their fields
    display_user_queries(updated_index)
    
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
    
    query_count = 0
    max_queries = 10  # Prevent infinite loops
    
    while query_count < max_queries:
        try:
            query = input("\nEnter your query: ").strip()
            query_count += 1
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("Exiting interactive mode...")
                break
            
            if not query:
                print("Please enter a valid query.")
                query_count -= 1  # Don't count empty queries
                continue
            
            # Process query and add field
            updated_index = process_query_for_field_addition(query, existing_index, "../test.xlsx")
            existing_index = updated_index  # Update for next iteration
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except EOFError:
            print("\nInput ended. Exiting...")
            break
        except Exception as e:
            print(f"Error: {e}")
    
    if query_count >= max_queries:
        print(f"\nReached maximum queries ({max_queries}). Exiting...")

if __name__ == "__main__":
    print("Dynamic Index Builder - Field Addition System")
    print("=" * 50)
    
    # Test with sample queries
    test_queries = [
        "What companies are in the US?",
        "Which company has the highest salary ranges?",
        "What benefits do companies offer?"
    ]
    
    try:
        print("Choose mode:")
        print("1. Test with predefined queries")
        print("2. Interactive mode")
        print("3. View existing queries and fields")
        
        choice = input("Enter choice (1-3): ").strip()
        
        if choice == "1":
            # Test with predefined queries
            existing_index = load_existing_index()
            
            for query in test_queries:
                print(f"\n{'='*60}")
                existing_index = process_query_for_field_addition(query, existing_index, "../test.xlsx")
        
        elif choice == "2":
            # Interactive mode
            interactive_field_addition_mode()
        
        elif choice == "3":
            # View existing queries and fields
            existing_index = load_existing_index()
            display_user_queries(existing_index)
        
        else:
            print("Invalid choice. Exiting.")
            
    except EOFError:
        print("\nNo input available. Running predefined queries...")
        existing_index = load_existing_index()
        
        for query in test_queries:
            print(f"\n{'='*60}")
            existing_index = process_query_for_field_addition(query, existing_index, "test.xlsx")
    
    except KeyboardInterrupt:
        print("\nExiting...")
    
    except Exception as e:
        print(f"Error: {e}")
