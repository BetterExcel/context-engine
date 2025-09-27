#!/usr/bin/env python3
"""
Standalone script to run dynamic field addition with command line arguments.
Usage: python3 run_dynamic.py "your query here"
"""

import sys
import os
sys.path.append('.')

from dynamic_index_builder import process_query_for_field_addition, load_existing_index

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 run_dynamic.py '<query>'")
        print("Example: python3 run_dynamic.py 'us companies'")
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    print(f"Processing query: '{query}'")
    print("=" * 50)
    
    try:
        # Load existing index
        existing_index = load_existing_index()
        
        # Process the query and add fields
        updated_index = process_query_for_field_addition(query, existing_index, "test.xlsx")
        
        print(f"\n✅ Successfully processed query: '{query}'")
        print(f"📊 Total fields in index: {len(updated_index.get('field_metadata', {}))}")
        
        return updated_index
        
    except Exception as e:
        print(f"❌ Error processing query: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()