import json
from typing import Dict, List, Any

def load_dynamic_index(file_path: str = "dynamic_index_output.json") -> Dict:
    """Load the dynamic index with added fields."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"Error: {file_path} not found. Please run dynamic_index_builder.py first.")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        return {}

def query_by_field(index: Dict, field_name: str, field_value: str = None) -> List[Dict]:
    """
    Query the index by a specific field.
    
    Args:
        index: Dynamic index with fields
        field_name: Name of the field to query
        field_value: Specific value to search for (optional)
        
    Returns:
        List of matching chunks
    """
    
    results = []
    
    for sheet_name, sheet_data in index.get("sheets", {}).items():
        for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
            analysis = chunk_data.get("analysis", {})
            
            if field_name in analysis:
                field_data = analysis[field_name]
                
                if field_value is None:
                    # Return all chunks that have this field
                    results.append({
                        "chunk_id": chunk_id,
                        "sheet_name": sheet_name,
                        "range": chunk_data.get("range", ""),
                        "field_value": field_data,
                        "confidence": analysis.get(f"{field_name}_confidence", 0.0),
                        "summary": analysis.get("summary", "")
                    })
                else:
                    # Check if field_value matches
                    if isinstance(field_data, list):
                        if field_value.lower() in [str(item).lower() for item in field_data]:
                            results.append({
                                "chunk_id": chunk_id,
                                "sheet_name": sheet_name,
                                "range": chunk_data.get("range", ""),
                                "field_value": field_data,
                                "confidence": analysis.get(f"{field_name}_confidence", 0.0),
                                "summary": analysis.get("summary", "")
                            })
                    else:
                        if field_value.lower() in str(field_data).lower():
                            results.append({
                                "chunk_id": chunk_id,
                                "sheet_name": sheet_name,
                                "range": chunk_data.get("range", ""),
                                "field_value": field_data,
                                "confidence": analysis.get(f"{field_name}_confidence", 0.0),
                                "summary": analysis.get("summary", "")
                            })
    
    return results

def get_field_statistics(index: Dict, field_name: str) -> Dict:
    """Get statistics about a specific field across all chunks."""
    
    field_values = []
    confidence_scores = []
    
    for sheet_name, sheet_data in index.get("sheets", {}).items():
        for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
            analysis = chunk_data.get("analysis", {})
            
            if field_name in analysis:
                field_values.append(analysis[field_name])
                confidence_scores.append(analysis.get(f"{field_name}_confidence", 0.0))
    
    if not field_values:
        return {"error": f"Field '{field_name}' not found in index"}
    
    # Calculate statistics
    stats = {
        "field_name": field_name,
        "total_chunks_with_field": len(field_values),
        "average_confidence": sum(confidence_scores) / len(confidence_scores),
        "unique_values": len(set(str(v) for v in field_values)),
        "sample_values": field_values[:5]  # First 5 values as examples
    }
    
    return stats

def list_available_fields(index: Dict) -> List[str]:
    """List all available fields in the dynamic index."""
    
    fields = set()
    
    # Get fields from metadata
    field_metadata = index.get("field_metadata", {})
    fields.update(field_metadata.keys())
    
    # Get fields from chunk analysis
    for sheet_name, sheet_data in index.get("sheets", {}).items():
        for chunk_id, chunk_data in sheet_data.get("anchors", {}).items():
            analysis = chunk_data.get("analysis", {})
            fields.update(analysis.keys())
    
    # Remove standard fields
    standard_fields = {"summary", "data_types", "patterns", "outliers", "key_values", "context"}
    fields = fields - standard_fields
    
    return sorted(list(fields))

def interactive_query_mode():
    """Interactive mode for querying the dynamic index."""
    
    print("\n" + "="*60)
    print("FIELD-BASED QUERY MODE")
    print("="*60)
    
    # Load dynamic index
    index = load_dynamic_index()
    if not index:
        return
    
    # Show available fields
    available_fields = list_available_fields(index)
    print(f"Available fields: {available_fields}")
    print("="*60)
    
    while True:
        try:
            print("\nQuery options:")
            print("1. List all available fields")
            print("2. Get field statistics")
            print("3. Query by field")
            print("4. Exit")
            
            choice = input("Enter choice (1-4): ").strip()
            
            if choice == "1":
                fields = list_available_fields(index)
                print(f"\nAvailable fields ({len(fields)}):")
                for field in fields:
                    print(f"- {field}")
            
            elif choice == "2":
                field_name = input("Enter field name: ").strip()
                stats = get_field_statistics(index, field_name)
                if "error" in stats:
                    print(f"Error: {stats['error']}")
                else:
                    print(f"\nField Statistics for '{field_name}':")
                    print(f"Total chunks: {stats['total_chunks_with_field']}")
                    print(f"Average confidence: {stats['average_confidence']:.2f}")
                    print(f"Unique values: {stats['unique_values']}")
                    print(f"Sample values: {stats['sample_values']}")
            
            elif choice == "3":
                field_name = input("Enter field name: ").strip()
                field_value = input("Enter specific value to search for (or press Enter for all): ").strip()
                
                if not field_value:
                    field_value = None
                
                results = query_by_field(index, field_name, field_value)
                
                print(f"\nQuery Results ({len(results)} matches):")
                for result in results[:10]:  # Show first 10 results
                    print(f"- {result['range']}: {result['field_value']} (confidence: {result['confidence']:.2f})")
                    print(f"  Summary: {result['summary'][:100]}...")
                    print()
            
            elif choice == "4":
                break
            
            else:
                print("Invalid choice.")
        
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")

def demonstrate_field_queries():
    """Demonstrate how to use the field-based queries."""
    
    print("Dynamic Index Field Query Demonstrations")
    print("=" * 50)
    
    # Load dynamic index
    index = load_dynamic_index()
    if not index:
        print("No dynamic index found. Please run dynamic_index_builder.py first.")
        return
    
    # Show available fields
    available_fields = list_available_fields(index)
    print(f"Available fields: {available_fields}")
    
    # Demonstrate queries for each field
    for field in available_fields:
        print(f"\n{'='*40}")
        print(f"Field: {field}")
        print('='*40)
        
        # Get statistics
        stats = get_field_statistics(index, field)
        print(f"Statistics: {stats['total_chunks_with_field']} chunks, "
              f"{stats['average_confidence']:.2f} avg confidence")
        
        # Show sample results
        results = query_by_field(index, field)
        print(f"Sample results ({len(results)} total):")
        for result in results[:3]:  # Show first 3
            print(f"- {result['range']}: {result['field_value']}")
    
    print(f"\n{'='*50}")
    print("Interactive mode available. Run with interactive_query_mode()")

if __name__ == "__main__":
    print("Field-Based Query Processor")
    print("=" * 30)
    
    print("Choose mode:")
    print("1. Demonstrate field queries")
    print("2. Interactive query mode")
    
    choice = input("Enter choice (1-2): ").strip()
    
    if choice == "1":
        demonstrate_field_queries()
    elif choice == "2":
        interactive_query_mode()
    else:
        print("Invalid choice. Exiting.")
