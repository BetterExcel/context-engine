# #!/usr/bin/env python3
# """
# Reset Pinecone Index Script
# ===========================

# This script resets the Pinecone index by:
# 1. Deleting the existing index
# 2. Optionally recreating it with the same configuration

# Usage:
#     python3 reset_pinecone.py [--recreate]

# Options:
#     --recreate    Recreate the index after deletion (default: True)
#     --help        Show this help message
# """

# import os
# import sys
# import time
# from pinecone import Pinecone, ServerlessSpec
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # Configuration from environment variables
# PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
# PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
# PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index-dense")

# def list_existing_indexes(pc):
#     """List all existing Pinecone indexes."""
#     try:
#         indexes = pc.list_indexes()
#         if indexes:
#             print("📋 Existing Pinecone indexes:")
#             for idx in indexes:
#                 print(f"   - {idx.name}: {idx.dimension} dimensions")
#             return [idx.name for idx in indexes]
#         else:
#             print("📋 No existing Pinecone indexes found")
#             return []
#     except Exception as e:
#         print(f"❌ Error listing indexes: {e}")
#         return []

# def delete_index(pc, index_name):
#     """Delete a Pinecone index."""
#     try:
#         print(f"🗑️  Deleting index: {index_name}")
#         pc.delete_index(index_name)
#         print(f"✅ Successfully deleted index: {index_name}")
#         return True
#     except Exception as e:
#         print(f"❌ Failed to delete index '{index_name}': {e}")
#         return False

# def create_index(pc, index_name, dimension=1536):
#     """Create a new Pinecone index."""
#     try:
#         print(f"🔄 Creating new index: {index_name}")
#         print(f"   - Dimensions: {dimension}")
#         print(f"   - Environment: {PINECONE_ENVIRONMENT}")
        
#         pc.create_index(
#             name=index_name,
#             dimension=dimension,
#             metric="cosine",
#             spec=ServerlessSpec(
#                 cloud="aws",
#                 region=PINECONE_ENVIRONMENT
#             )
#         )
        
#         # Wait for index to be ready
#         print("⏳ Waiting for index to be ready...")
#         time.sleep(5)
        
#         print(f"✅ Successfully created index: {index_name}")
#         return True
        
#     except Exception as e:
#         print(f"❌ Failed to create index '{index_name}': {e}")
#         return False

# def reset_pinecone_index(recreate=True):
#     """Reset the Pinecone index."""
#     print("🚀 Starting Pinecone Index Reset")
#     print("=" * 50)
    
#     # Validate API key
#     if not PINECONE_API_KEY:
#         print("❌ Error: PINECONE_API_KEY not found in environment variables")
#         print("   Please check your .env file")
#         return False
    
#     try:
#         # Initialize Pinecone client
#         print("🔌 Connecting to Pinecone...")
#         pc = Pinecone(api_key=PINECONE_API_KEY)
#         print("✅ Connected to Pinecone successfully")
        
#         # List existing indexes
#         print("\n📋 Current state:")
#         existing_indexes = list_existing_indexes(pc)
        
#         # Check if target index exists
#         if PINECONE_INDEX_NAME in existing_indexes:
#             # Delete the index
#             print(f"\n🗑️  Target index found: {PINECONE_INDEX_NAME}")
#             if delete_index(pc, PINECONE_INDEX_NAME):
#                 print("✅ Index deleted successfully")
#             else:
#                 print("❌ Failed to delete index")
#                 return False
#         else:
#             print(f"\nℹ️  Target index not found: {PINECONE_INDEX_NAME}")
#             print("   (No deletion needed)")
        
#         # Recreate index if requested
#         if recreate:
#             print(f"\n🔄 Recreating index...")
#             if create_index(pc, PINECONE_INDEX_NAME):
#                 print("✅ Index recreated successfully")
#             else:
#                 print("❌ Failed to recreate index")
#                 return False
#         else:
#             print(f"\n⏭️  Skipping index recreation (--no-recreate specified)")
        
#         # List final state
#         print(f"\n📋 Final state:")
#         list_existing_indexes(pc)
        
#         print(f"\n🎉 Pinecone reset completed successfully!")
#         if recreate:
#             print(f"   - Index '{PINECONE_INDEX_NAME}' is ready for new data")
#         else:
#             print(f"   - Index '{PINECONE_INDEX_NAME}' has been deleted")
        
#         return True
        
#     except Exception as e:
#         print(f"❌ Error during reset: {e}")
#         return False

# def main():
#     """Main function with command line argument parsing."""
#     recreate = True
    
#     # Parse command line arguments
#     if len(sys.argv) > 1:
#         if "--help" in sys.argv or "-h" in sys.argv:
#             print(__doc__)
#             return
#         elif "--no-recreate" in sys.argv:
#             recreate = False
#         elif "--recreate" in sys.argv:
#             recreate = True
#         else:
#             print("❌ Unknown argument. Use --help for usage information.")
#             return
    
#     # Confirm action
#     action = "reset and recreate" if recreate else "delete"
#     print(f"⚠️  This will {action} the Pinecone index: {PINECONE_INDEX_NAME}")
    
#     if recreate:
#         print("   - All existing data will be lost")
#         print("   - A new empty index will be created")
#     else:
#         print("   - All existing data will be lost")
#         print("   - No new index will be created")
    
#     # Ask for confirmation
#     try:
#         response = input("\n🤔 Are you sure? (y/N): ").strip().lower()
#         if response not in ['y', 'yes']:
#             print("❌ Operation cancelled by user")
#             return
#     except KeyboardInterrupt:
#         print("\n❌ Operation cancelled by user")
#         return
    
#     # Perform reset
#     success = reset_pinecone_index(recreate=recreate)
    
#     if success:
#         print(f"\n✅ Reset completed successfully!")
#         if recreate:
#             print(f"   Next steps:")
#             print(f"   1. Run: python3 anchored_index_builder.py")
#             print(f"   2. Run: python3 pinecone_uploader.py")
#         else:
#             print(f"   Index deleted. Use this script with --recreate to create a new one.")
#     else:
#         print(f"\n❌ Reset failed!")
#         sys.exit(1)

# if __name__ == "__main__":
#     main()

