import openpyxl
import json
from typing import Dict, List, Any, Union, Tuple
from datetime import datetime
from collections import defaultdict
import re
import requests
import time

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

def analyze_chunk_with_ollama(chunk_data: List[List[Any]], chunk_range: str) -> Dict:
    """Use Ollama to analyze a 10-row chunk and generate intelligent summary."""
    
    # Prepare data for Ollama
    data_text = f"Data chunk {chunk_range}:\n"
    for row_idx, row in enumerate(chunk_data):
        data_text += f"Row {row_idx + 1}: {row}\n"
    
    prompt = f"""
Analyze this spreadsheet data chunk and provide ONLY a valid JSON response with this exact structure:
{{
    "summary": "Brief description of what this chunk contains",
    "context": "Additional context about this data"
}}

CRITICAL JSON RULES:
- All strings must be properly escaped (use \\" for quotes inside strings)
- No unescaped quotes, commas, or special characters in strings
- Keep strings short and simple
- Respond with ONLY the JSON object, no explanations, no markdown, no additional text

Data to analyze:
{data_text}
"""
    
    try:
        response = call_ollama(prompt)
        print(f"Raw Ollama response for {chunk_range}: {response[:200]}...")
        
        # Clean up common JSON issues
        cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
        
        # Try to parse JSON response with multiple attempts
        analysis = None
        for attempt in range(3):
            try:
                analysis = json.loads(cleaned_response)
                break
            except json.JSONDecodeError as e:
                if attempt == 0:
                    # First attempt: try to fix common issues
                    cleaned_response = cleaned_response.replace("'", '"')  # Replace single quotes with double
                elif attempt == 1:
                    # Second attempt: try to fix unescaped quotes in strings
                    import re
                    # This is a more aggressive cleanup - might break some cases
                    cleaned_response = re.sub(r'(?<!\\)"(?=[^,}\]])', '\\"', cleaned_response)
                else:
                    # Final attempt: create a minimal valid response
                    print(f"Creating fallback response for {chunk_range}")
                    analysis = {
                        "summary": "Data chunk analysis",
                        "context": "Analysis completed with fallback"
                    }
                    break
        
        if analysis is None:
            raise Exception("Failed to parse JSON after multiple attempts")
        
        # Clean up the analysis response
        for key in ['summary', 'context']:
            if key in analysis and analysis[key] is not None:
                # Clean up the string: remove quotes, escape special chars
                cleaned_item = str(analysis[key]).replace('"', '').replace("'", '').strip()
                analysis[key] = cleaned_item
        
        return analysis
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed for {chunk_range}: {e}")
        print(f"Response was: {response}")
        raise e
    except Exception as e:
        print(f"Ollama analysis failed for {chunk_range}: {e}")
        raise e

def get_column_name(col_idx: int, headers: List[str] = None) -> str:
    """Get column name from headers or generate Excel-style column name."""
    if headers and col_idx < len(headers):
        return headers[col_idx]
    
    result = ""
    col_idx += 1  # Convert to 1-based indexing
    while col_idx > 0:
        col_idx -= 1
        result = chr(65 + (col_idx % 26)) + result
        col_idx //= 26
    return result

def create_range_string(start_row: int, end_row: int, start_col: int, end_col: int) -> str:
    """Create Excel-style range string like 'A1:A10'."""
    start_col_name = get_column_name(start_col)
    end_col_name = get_column_name(end_col)
    return f"{start_col_name}{start_row}:{end_col_name}{end_row}"

def build_anchored_index(file_path: str, sheet_name: Union[int, str, None] = None, chunk_size: int = 10) -> Dict:
    """
    Build an anchored inverted index for a spreadsheet.
    Processes data in chunks and uses Ollama for intelligent analysis.
    """
    wb = openpyxl.load_workbook(file_path, data_only=True)
    
    if isinstance(sheet_name, int):
        sheet = wb.worksheets[sheet_name]
    elif isinstance(sheet_name, str):
        sheet = wb[sheet_name]
    else:
        sheet = wb.active
    
    max_row = sheet.max_row
    max_col = sheet.max_column
    
    # Extract headers from first row - skip null values
    headers = []
    first_row = list(sheet.iter_rows(min_row=1, max_row=1, values_only=True))[0]
    for i, cell_value in enumerate(first_row):
        if cell_value is not None:
            headers.append(str(cell_value).strip())
        # Skip null values instead of adding column names
    
    # Initialize index structure
    index = {
        "sheet_name": sheet.title,
        "num_rows": max_row,
        "num_cols": max_col,
        "headers": headers,
        "chunk_size": chunk_size,
        "anchors": {},
        "metadata": {
            "total_chunks": 0,
            "processing_time": 0,
            "ollama_calls": 0
        }
    }
    
    start_time = time.time()
    
    # Process data in chunks
    chunk_num = 0
    for start_row in range(1, max_row + 1, chunk_size):
        end_row = min(start_row + chunk_size - 1, max_row)
        chunk_range = f"A{start_row}:A{end_row}"
        
        # Extract chunk data - skip null values and flatten to single line per row
        chunk_data = []
        formulas_data = []  # Store formulas and cell references
        
        for row_idx in range(start_row, end_row + 1):
            row_data = []
            row_formulas = []
            
            for col_idx in range(max_col):
                cell = sheet.cell(row=row_idx, column=col_idx + 1)
                cell_value = cell.value
                
                # Check for formulas and cell references
                if cell.data_type == 'f':  # Formula cell
                    formula = cell.value
                    if formula and formula.startswith('='):
                        row_formulas.append(f"F{col_idx+1}:{formula}")
                
                # Check for cell references in the value (even if not a formula)
                if cell_value is not None:
                    cell_str = str(cell_value)
                    # Look for cell references like A1, B2, etc.
                    import re
                    cell_refs = re.findall(r'[A-Z]+\d+', cell_str)
                    if cell_refs:
                        row_formulas.append(f"R{col_idx+1}:{','.join(cell_refs)}")
                
                if cell_value is not None:  # Skip null values
                    row_data.append(str(cell_value))
            
            # Join non-null values with tab separator for single line
            if row_data:  # Only add row if it has non-null data
                chunk_data.append('\t'.join(row_data))
            
            # Store formulas for this row
            if row_formulas:
                formulas_data.append(f"Row{row_idx}: {'; '.join(row_formulas)}")
        
        # Analyze chunk with Ollama
        try:
            print(f"Analyzing chunk {chunk_num + 1}: {chunk_range}")
            analysis = analyze_chunk_with_ollama(chunk_data, chunk_range)
            index["metadata"]["ollama_calls"] += 1
            
            # Store anchor information
            anchor_key = f"chunk_{chunk_num}"
            index["anchors"][anchor_key] = {
                "range": chunk_range,
                "start_row": start_row,
                "end_row": end_row,
                "summary": analysis["summary"],
                "context": analysis["context"],
                "table": chunk_data,  # 2D array with actual content
                "formulas": formulas_data,  # Formulas and cell references
                "chunk_number": chunk_num
            }
            
            chunk_num += 1
            
        except Exception as e:
            print(f"Failed to analyze chunk {chunk_range}: {e}")
            raise e
    
    index["metadata"]["total_chunks"] = chunk_num
    index["metadata"]["processing_time"] = time.time() - start_time
    
    return {"sheets": {sheet.title: index}}

def query_anchored_index(index: Dict, query_terms: List[str]) -> Dict:
    """
    Query the anchored index for relevant context.
    """
    results = {}
    
    for sheet_name, sheet_data in index["sheets"].items():
        sheet_results = {
            "sheet_info": {
                "name": sheet_data["sheet_name"],
                "rows": sheet_data["num_rows"],
                "cols": sheet_data["num_cols"],
                "headers": sheet_data["headers"],
                "chunk_size": sheet_data["chunk_size"]
            },
            "matching_chunks": []
        }
        
        for term in query_terms:
            term_lower = term.lower().strip()
            
            # Search in headers
            for header in sheet_data["headers"]:
                if term_lower in header.lower():
                    # Find chunks that contain this header
                    for anchor_key, anchor_data in sheet_data["anchors"].items():
                        sheet_results["matching_chunks"].append(anchor_data)
            
            # Search in chunk summaries and context
            for anchor_key, anchor_data in sheet_data["anchors"].items():
                
                # Check summary
                if term_lower in anchor_data.get("summary", "").lower():
                    sheet_results["matching_chunks"].append(anchor_data)
                    continue
                
                # Check context
                if term_lower in anchor_data.get("context", "").lower():
                    sheet_results["matching_chunks"].append(anchor_data)
                    continue
                
                # Check table content
                table_data = anchor_data.get("table", [])
                for row in table_data:
                    if term_lower in row.lower():
                        sheet_results["matching_chunks"].append(anchor_data)
                        break
                
                # Check formulas and cell references
                formulas_data = anchor_data.get("formulas", [])
                for formula_row in formulas_data:
                    if term_lower in formula_row.lower():
                        sheet_results["matching_chunks"].append(anchor_data)
                        break
        
        # Remove duplicates
        seen_ranges = set()
        unique_chunks = []
        for chunk in sheet_results["matching_chunks"]:
            if chunk["range"] not in seen_ranges:
                seen_ranges.add(chunk["range"])
                unique_chunks.append(chunk)
        
        sheet_results["matching_chunks"] = unique_chunks
        
        if sheet_results["matching_chunks"]:
            results[sheet_name] = sheet_results
    
    return results

if __name__ == "__main__":
    # Example usage
    file_path = "/Users/vansh/Documents/Documents/PROJECTS/skopeo-context/context-engine/test.xlsx"
    
    try:
        print("Building anchored inverted index...")
        print("This will use Ollama to analyze each 10-row chunk...")
        
        index = build_anchored_index(file_path)
        
        print(f"Anchored index built successfully!")
        print(f"Found {len(index['sheets'])} sheet(s)")
        
        for sheet_name, sheet_data in index["sheets"].items():
            print(f"Sheet '{sheet_name}': {sheet_data['num_rows']} rows, {sheet_data['num_cols']} cols")
            print(f"Total chunks: {sheet_data['metadata']['total_chunks']}")
            print(f"Ollama calls made: {sheet_data['metadata']['ollama_calls']}")
            print(f"Processing time: {sheet_data['metadata']['processing_time']:.2f} seconds")
        
        # Save to file
        with open("anchored_index_output.json", "w") as f:
            json.dump(index, f, indent=2, default=str)
        
        print("Index saved to 'anchored_index_output.json'")
        
        # Test query
        print("\nTesting query...")
        query_results = query_anchored_index(index, ["salary", "list"])
        print(f"Query results: {json.dumps(query_results, indent=2, default=str)}")
        
    except FileNotFoundError:
        print(f"File '{file_path}' not found. Please provide a valid Excel file.")
    except Exception as e:
        print(f"Error: {e}")