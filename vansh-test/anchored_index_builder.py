import openpyxl
import json
import os
from typing import Dict, List, Any, Union, Tuple
from datetime import datetime
from collections import defaultdict
import re
import requests
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class OpenAIClient:
    """OpenAI API client for generating summaries and context."""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
    
    def call_api(self, prompt: str, max_retries: int = 3) -> str:
        """Call OpenAI API with retry logic."""
        for attempt in range(max_retries):
            try:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                data = {
                    "model": self.model,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.0
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


class ChunkAnalyzer:
    """Analyzes data chunks and generates summaries using OpenAI."""
    
    def __init__(self, openai_client: OpenAIClient):
        self.openai_client = openai_client
    
    def analyze_chunk(self, chunk_data: List[str], chunk_range: str) -> Dict:
        """Analyze a data chunk and generate summary/context using OpenAI."""
        # Prepare data for prompt
        data_text = f"Data chunk {chunk_range}:\n"
        for row_idx, row_line in enumerate(chunk_data):
            data_text += f"Row {row_idx + 1}: {row_line}\n"

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
            response = self.openai_client.call_api(prompt)
            print(f"Raw OpenAI response for {chunk_range}: {response[:200]}...")

            # Clean up + parse JSON
            cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
            analysis = None
            for attempt in range(3):
                try:
                    # Remove markdown code blocks if present
                    if cleaned_response.startswith('```json'):
                        cleaned_response = cleaned_response.replace('```json', '').replace('```', '').strip()
                    elif cleaned_response.startswith('```'):
                        cleaned_response = cleaned_response.replace('```', '').strip()
                    
                    analysis = json.loads(cleaned_response)
                    break
                except json.JSONDecodeError as e:
                    print(f"JSON parsing attempt {attempt + 1} failed: {e}")
                    if attempt < 2:
                        # Try to extract JSON object using regex
                        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned_response)
                        if json_match:
                            cleaned_response = json_match.group(0)
                    else:
                        print(f"Final cleaned response: {cleaned_response}")
                        raise e

            if not analysis:
                raise Exception("Failed to parse JSON response")

            # Validate required fields
            if "summary" not in analysis or "context" not in analysis:
                raise Exception("Missing required fields in analysis")

            return analysis

        except Exception as e:
            print(f"OpenAI analysis failed for {chunk_range}: {e}")
            raise e


class ExcelProcessor:
    """Processes Excel files and extracts structured data."""
    
    def __init__(self):
        pass
    
    def get_column_name(self, col_idx: int, headers: List[str]) -> str:
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
    
    def create_range_string(self, start_row: int, end_row: int, start_col: int, end_col: int) -> str:
        """Create Excel-style range string like 'A1:A10'."""
        start_col_name = self.get_column_name(start_col)
        end_col_name = self.get_column_name(end_col)
        return f"{start_col_name}{start_row}:{end_col_name}{end_row}"
    
    def extract_headers(self, sheet) -> List[str]:
        """Extract headers from first row - skip null values."""
        headers = []
        first_row = list(sheet.iter_rows(min_row=1, max_row=1, values_only=True))[0]
        for i, cell_value in enumerate(first_row):
            if cell_value is not None:
                headers.append(str(cell_value).strip())
            # Skip null values instead of adding column names
        return headers
    
    def extract_chunk_data(self, sheet, start_row: int, end_row: int, max_col: int, headers: List[str]) -> Tuple[List[str], List[str]]:
        """Extract chunk data as simple key-value pairs (cell_ref: value)."""
        chunk_data = []
        formulas_data = []
        
        for row_idx in range(start_row, end_row + 1):
            row_data = {}
            row_formulas = []
            
            for col_idx in range(max_col):
                cell = sheet.cell(row=row_idx, column=col_idx + 1)
                cell_value = cell.value
                cell_ref = f"{chr(65 + col_idx)}{row_idx}"  # Convert to A1, B1, C1, etc.
                
                # Check for formulas and cell references
                if cell.data_type == 'f':  # Formula cell
                    formula = cell.value
                    if formula and formula.startswith('='):
                        row_formulas.append(f"F{col_idx+1}:{formula}")
                
                # Check for cell references in the value (even if not a formula)
                if cell_value is not None:
                    cell_str = str(cell_value)
                    # Look for cell references like A1, B2, etc.
                    cell_refs = re.findall(r'[A-Z]+\d+', cell_str)
                    if cell_refs:
                        row_formulas.append(f"R{col_idx+1}:{','.join(cell_refs)}")
                
                if cell_value is not None:  # Skip null values
                    # Simple key-value: cell_ref -> cell_value
                    row_data[cell_ref] = str(cell_value)
            
            # Only add row if it has non-null data - format as single line
            if row_data:
                # Create single line format: "A1:value, B2:value, C3:value"
                row_line = ", ".join([f"{cell_ref}:{value}" for cell_ref, value in row_data.items()])
                chunk_data.append(row_line)
            
            # Store formulas for this row
            if row_formulas:
                formulas_data.append(f"Row{row_idx}: {'; '.join(row_formulas)}")
        
        return chunk_data, formulas_data


class SheetProcessor:
    """Processes individual Excel sheets into structured chunks."""
    
    def __init__(self, excel_processor: ExcelProcessor, chunk_analyzer: ChunkAnalyzer):
        self.excel_processor = excel_processor
        self.chunk_analyzer = chunk_analyzer
    
    def process_sheet(self, sheet, chunk_size: int = 50) -> Dict:
        """Process a single sheet and return structured data."""
        max_row = sheet.max_row
        max_col = sheet.max_column
        
        # Extract headers
        headers = self.excel_processor.extract_headers(sheet)
        
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
                "openai_calls": 0
            }
        }
        
        start_time = time.time()
        
        # Process data in chunks
        chunk_num = 0
        for start_row in range(1, max_row + 1, chunk_size):
            end_row = min(start_row + chunk_size - 1, max_row)
            chunk_range = f"A{start_row}:A{end_row}"
            
            # Extract chunk data
            chunk_data, formulas_data = self.excel_processor.extract_chunk_data(
                sheet, start_row, end_row, max_col, headers
            )
            
            # Analyze chunk with OpenAI
            try:
                print(f"Analyzing chunk {chunk_num + 1}: {chunk_range}")
                analysis = self.chunk_analyzer.analyze_chunk(chunk_data, chunk_range)

                index["metadata"]["openai_calls"] += 1
                
                # Store anchor information
                anchor_key = f"chunk_{chunk_num}"
                index["anchors"][anchor_key] = {
                    "range": chunk_range,
                    "start_row": start_row,
                    "end_row": end_row,
                    "summary": analysis["summary"],
                    "context": analysis["context"],
                    "table": chunk_data,  # List of single-line strings
                    "formulas": formulas_data,  # Formulas and cell references
                    "chunk_number": chunk_num
                }
                
                chunk_num += 1
                
            except Exception as e:
                print(f"Failed to analyze chunk {chunk_range}: {e}")
                raise e
        
        index["metadata"]["total_chunks"] = chunk_num
        index["metadata"]["processing_time"] = time.time() - start_time
        
        return index


class AnchoredIndexBuilder:
    """Main class for building anchored inverted index from Excel files."""
    
    def __init__(self, openai_api_key: str = None, openai_model: str = "gpt-4o-mini"):
        # Initialize components
        self.openai_client = OpenAIClient(api_key=openai_api_key, model=openai_model)
        self.excel_processor = ExcelProcessor()
        self.chunk_analyzer = ChunkAnalyzer(self.openai_client)
        self.sheet_processor = SheetProcessor(self.excel_processor, self.chunk_analyzer)
    
    def build_index(self, file_path: str, sheet_name: Union[int, str, None] = None, chunk_size: int = 50) -> Dict:
        """
        Build an anchored inverted index for a spreadsheet.
        Processes data in chunks and uses OpenAI for intelligent analysis.
        If sheet_name is None, processes ALL sheets in the workbook.
        """
        wb = openpyxl.load_workbook(file_path, data_only=True)
        
        # If no specific sheet is requested, process ALL sheets
        if sheet_name is None:
            sheets_to_process = wb.worksheets
        elif isinstance(sheet_name, int):
            sheets_to_process = [wb.worksheets[sheet_name]]
        elif isinstance(sheet_name, str):
            sheets_to_process = [wb[sheet_name]]
        else:
            sheets_to_process = [wb.active]
        
        all_sheets_index = {"sheets": {}}
        
        # Process each sheet
        for sheet in sheets_to_process:
            print(f"Processing sheet: {sheet.title}")
            sheet_index = self.sheet_processor.process_sheet(sheet, chunk_size)
            all_sheets_index["sheets"][sheet.title] = sheet_index
        
        return all_sheets_index
    
    def query_index(self, index: Dict, query_terms: List[str]) -> Dict:
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
                        break
                
                # Search in chunk content
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
                        # row is now a single line string
                        if term_lower in row.lower():
                            sheet_results["matching_chunks"].append(anchor_data)
                            break
                    
                    # Check formulas and cell references
                    formulas_data = anchor_data.get("formulas", [])
                    for formula_row in formulas_data:
                        if term_lower in formula_row.lower():
                            sheet_results["matching_chunks"].append(anchor_data)
                            break

                if sheet_results["matching_chunks"]:
                    results[sheet_name] = sheet_results
        
        return results
    
    def save_index(self, index: Dict, file_path: str = "anchored_index_output.json"):
        """Save the anchored index to a JSON file."""
        with open(file_path, "w") as f:
            json.dump(index, f, indent=2, default=str)
        print(f"Index saved to '{file_path}'")


def main():
    """Main function to demonstrate usage."""
    # Example usage
    file_path = "test.xlsx"
    
    try:
        print("Building anchored inverted index...")
        print("This will use OpenAI to analyze each 50-row chunk...")
        
        # Initialize the builder
        builder = AnchoredIndexBuilder()
        
        # Build the index
        index = builder.build_index(file_path, chunk_size=50)
        
        print(f"Anchored index built successfully!")
        print(f"Found {len(index['sheets'])} sheet(s)")
        
        for sheet_name, sheet_data in index["sheets"].items():
            print(f"Sheet '{sheet_name}': {sheet_data['num_rows']} rows, {sheet_data['num_cols']} cols")
            print(f"Total chunks: {sheet_data['metadata']['total_chunks']}")
            print(f"OpenAI calls made: {sheet_data['metadata']['openai_calls']}")
            print(f"Processing time: {sheet_data['metadata']['processing_time']:.2f} seconds")
        
        # Save to file
        builder.save_index(index)
        
        # Test query
        print("\nTesting query...")
        query_results = builder.query_index(index, ["salary", "list"])
        print(f"Query results: {json.dumps(query_results, indent=2, default=str)}")
        
    except Exception as e:
        print(f"Error: {e}")
        raise


if __name__ == "__main__":
    main()
