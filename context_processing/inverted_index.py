import openpyxl
import json
from typing import Dict, List, Any, Union, Tuple
from datetime import datetime
from collections import defaultdict
import re

def normalize_value(value: Any) -> str:
    """
    Normalize cell values into typed keys for consistent indexing.
    """
    if value is None or value == "":
        return "__NULL__"
    if isinstance(value, (int, float)):
        return f"NUM:{value}"
    if hasattr(value, 'year') or isinstance(value, datetime):
        return f"DATE:{value.isoformat()}"
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return "__NULL__"
        return f"STR:{cleaned}"
    return f"STR:{str(value).strip()}"


def get_column_name(col_idx: int, headers: List[str] = None) -> str:
    """Get column name from headers or generate Excel-style column name."""
    if headers and col_idx < len(headers):
        return headers[col_idx]
    result = ""
    col_idx += 1 
    while col_idx > 0:
        col_idx -= 1
        result = chr(65 + (col_idx % 26)) + result
        col_idx //= 26
    return result

def compress_locations(locations: List[int]) -> List[List[int]]:
    """
    Compress a list of row numbers into ranges.
    Example: [1, 2, 3, 5, 7, 8, 9] -> [[1, 3], [5, 5], [7, 9]]
    """
    if not locations:
        return []
    locations = sorted(set(locations))
    ranges = []
    start = locations[0]
    end = locations[0]
    for i in range(1, len(locations)):
        if locations[i] == end + 1:
            end = locations[i]
        else:
            ranges.append([start, end])
            start = end = locations[i]
    ranges.append([start, end])
    return ranges

def build_inverted_index(file_path: str, sheet_name: Union[int, str, None] = None, max_locations_per_key: int = 1000) -> Dict:
    """
    Build an inverted index for a spreadsheet.
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
    headers = []
    first_row = list(sheet.iter_rows(min_row=1, max_row=1, values_only=True))[0]
    for i, cell_value in enumerate(first_row):
        if cell_value is not None:
            headers.append(str(cell_value).strip())
        else:
            headers.append(get_column_name(i))
    index = {
        "sheet_name": sheet.title,
        "num_rows": max_row,
        "num_cols": max_col,
        "headers": headers,
        "values": {}
    }
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), 1):
        for col_idx, cell_value in enumerate(row):
            if col_idx >= len(headers):
                break
            normalized_key = normalize_value(cell_value)
            col_name = headers[col_idx] if col_idx < len(headers) else get_column_name(col_idx)
            cell_address = f"{get_column_name(col_idx)}{row_idx}"
            if normalized_key not in index["values"]:
                index["values"][normalized_key] = {
                    "type": normalized_key.split(":")[0].lower() if ":" in normalized_key else "null",
                    "count": 0,
                    "samples": [],
                    "cols": defaultdict(int),
                    "locations": defaultdict(list),
                    "locations_total": 0
                }
            entry = index["values"][normalized_key]
            entry["count"] += 1
            entry["cols"][col_name] += 1
            entry["locations_total"] += 1
            if len(entry["samples"]) < 10:
                entry["samples"].append(cell_address)
            if len(entry["locations"][col_name]) < max_locations_per_key:
                entry["locations"][col_name].append(row_idx)
    
    for key, entry in index["values"].items():
        entry["cols"] = dict(entry["cols"])
        entry["locations_compressed"] = {}
        entry["min_row"] = float('inf')
        entry["max_row"] = 0
        for col_name, locations in entry["locations"].items():
            if locations:
                entry["locations_compressed"][col_name] = compress_locations(locations)
                entry["min_row"] = min(entry["min_row"], min(locations))
                entry["max_row"] = max(entry["max_row"], max(locations))
        
        del entry["locations"]
        if entry["min_row"] == float('inf'):
            entry["min_row"] = 0
    
    return {"sheets": {sheet.title: index}}


def query_index(index: Dict, query_terms: List[str]) -> Dict:
    """
    Query the inverted index for relevant context.
    """
    results = {}
    
    for sheet_name, sheet_data in index["sheets"].items():
        sheet_results = {}
        
        for term in query_terms:
            term_lower = term.lower().strip()
            for key, entry in sheet_data["values"].items():
                if term_lower in key.lower():
                    sheet_results[key] = entry
            for header in sheet_data["headers"]:
                if term_lower in header.lower():
                    for key, entry in sheet_data["values"].items():
                        if header in entry["cols"] and entry["cols"][header] > 0:
                            sheet_results[key] = entry
        
        if sheet_results:
            results[sheet_name] = {
                "sheet_info": {
                    "name": sheet_data["sheet_name"],
                    "rows": sheet_data["num_rows"],
                    "cols": sheet_data["num_cols"],
                    "headers": sheet_data["headers"]
                },
                "matching_values": sheet_results
            }
    return results

if __name__ == "__main__":
    # Example usage
    file_path = "/Users/vansh/Documents/Documents/PROJECTS/skopeo-context/context-engine/test.xlsx"  # Replace with your Excel file
    
    try:
        print("Building inverted index...")
        index = build_inverted_index(file_path)
        
        print(f"Index built successfully!")
        print(f"Found {len(index['sheets'])} sheet(s)")
        
        for sheet_name, sheet_data in index["sheets"].items():
            print(f"Sheet '{sheet_name}': {sheet_data['num_rows']} rows, {sheet_data['num_cols']} cols")
            print(f"Unique values indexed: {len(sheet_data['values'])}")
        with open("inverted_index_output.json", "w") as f:
            json.dump(index, f, indent=2, default=str)
        print("Index saved to 'inverted_index_output.json'")
        print("\nExample query for 'salary':")
        results = query_index(index, ["D"])
        print(json.dumps(results, indent=2, default=str))
        
    except FileNotFoundError:
        print(f"File '{file_path}' not found. Please provide a valid Excel file.")
    except Exception as e:
        print(f"Error: {e}")
