#!/usr/bin/env python3
"""
Pinecone Index Reset Tool - Production Ready
============================================

Resets Pinecone index by deleting and optionally recreating it with proper configuration.
Uses environment variables for all configuration - no hardcoded values.

Usage:
    python3 reset_pinecone_index.py                    # Delete and recreate index
    python3 reset_pinecone_index.py --delete-only      # Delete index only
    python3 reset_pinecone_index.py --help             # Show help

Environment Variables Required:
    PINECONE_API_KEY        - Pinecone API key
    PINECONE_ENVIRONMENT    - Pinecone environment (default: us-east-1)
    PINECONE_INDEX_NAME     - Index name to reset (default: test)
    OPENAI_EMBEDDING_MODEL  - Embedding model for dimensions (default: text-embedding-3-small)
"""

import os
import sys
import time
import argparse
from typing import Optional
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
from embedding_generation import EmbeddingGenerator

# Load environment variables
load_dotenv()

# Configuration from environment variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "test")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# Wait times (configurable via environment)
INDEX_DELETION_WAIT_TIME = int(os.getenv("INDEX_DELETION_WAIT_TIME", "10"))
INDEX_CREATION_WAIT_TIME = int(os.getenv("INDEX_CREATION_WAIT_TIME", "5"))


class PineconeIndexResetter:
    """Production-ready Pinecone index reset tool."""
    
    def __init__(self):
        """Initialize the resetter with environment configuration."""
        if not PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY environment variable is required")
        
        self.api_key = PINECONE_API_KEY
        self.environment = PINECONE_ENVIRONMENT
        self.index_name = PINECONE_INDEX_NAME
        self.pc = Pinecone(api_key=self.api_key)
        
        # Get embedding dimensions for index creation
        try:
            self.embedding_gen = EmbeddingGenerator()
            self.embedding_dim = self.embedding_gen.get_embedding_dim("openai")
        except Exception as e:
            print(f"⚠️ Warning: Could not determine embedding dimensions: {e}")
            self.embedding_dim = 1536  # Default for OpenAI text-embedding-3-small
        
        print(f"🔧 Configuration:")
        print(f"   Index Name: {self.index_name}")
        print(f"   Environment: {self.environment}")
        print(f"   Embedding Dimensions: {self.embedding_dim}")
    
    def index_exists(self) -> bool:
        """Check if the index exists."""
        try:
            indexes = self.pc.list_indexes()
            return self.index_name in indexes.names()
        except Exception as e:
            print(f"❌ Error checking if index exists: {e}")
            return False
    
    def clear_index_content(self) -> bool:
        """Clear all vectors from the index without deleting the index itself."""
        if not self.index_exists():
            print(f"ℹ️ Index '{self.index_name}' does not exist - nothing to clear")
            return True
        
        try:
            print(f"🧹 Clearing all vectors from index '{self.index_name}'...")
            index = self.pc.Index(self.index_name)
            
            # Get all vector IDs to delete
            stats = index.describe_index_stats()
            total_vectors = stats.total_vector_count
            
            if total_vectors == 0:
                print(f"ℹ️ Index is already empty")
                return True
            
            print(f"📊 Found {total_vectors} vectors to delete")
            
            # Delete all vectors by deleting all namespaces
            namespaces = list(stats.namespaces.keys())
            if not namespaces:
                # If no namespaces, try to delete by getting all vector IDs
                print("🔄 Attempting to delete all vectors...")
                # This is a more aggressive approach - delete all vectors
                index.delete(delete_all=True)
            else:
                # Delete by namespaces
                for namespace in namespaces:
                    print(f"🗑️ Deleting namespace: {namespace}")
                    index.delete(namespace=namespace)
            
            print(f"✅ All vectors cleared from index '{self.index_name}'")
            return True
            
        except Exception as e:
            print(f"❌ Failed to clear index content: {e}")
            return False

    def delete_index(self) -> bool:
        """Delete the Pinecone index."""
        if not self.index_exists():
            print(f"ℹ️ Index '{self.index_name}' does not exist - nothing to delete")
            return True
        
        try:
            print(f"🗑️ Deleting index '{self.index_name}'...")
            self.pc.delete_index(self.index_name)
            print(f"✅ Index '{self.index_name}' deleted successfully")
            
            # Wait for deletion to complete
            print(f"⏳ Waiting {INDEX_DELETION_WAIT_TIME} seconds for deletion to complete...")
            time.sleep(INDEX_DELETION_WAIT_TIME)
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to delete index: {e}")
            return False
    
    def create_index(self) -> bool:
        """Create a new Pinecone index with proper configuration."""
        if self.index_exists():
            print(f"ℹ️ Index '{self.index_name}' already exists")
            return True
        
        try:
            print(f"🔄 Creating index '{self.index_name}'...")
            print(f"   Dimensions: {self.embedding_dim}")
            print(f"   Environment: {self.environment}")
            
            self.pc.create_index(
                name=self.index_name,
                dimension=self.embedding_dim,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=self.environment
                )
            )
            
            print(f"✅ Index '{self.index_name}' created successfully")
            
            # Wait for index to be ready
            print(f"⏳ Waiting {INDEX_CREATION_WAIT_TIME} seconds for index to be ready...")
            time.sleep(INDEX_CREATION_WAIT_TIME)
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to create index: {e}")
            return False
    
    def reset_index(self, recreate: bool = True) -> bool:
        """Reset the index by deleting and optionally recreating it."""
        print(f"🚀 Resetting Pinecone index: '{self.index_name}'")
        print("="*50)
        
        # Delete existing index
        if not self.delete_index():
            return False
        
        # Recreate index if requested
        if recreate:
            return self.create_index()
        
        return True
    
    def clear_content(self) -> bool:
        """Clear all content from the index while keeping the index structure."""
        print(f"🧹 Clearing content from Pinecone index: '{self.index_name}'")
        print("="*50)
        
        # Clear all vectors from the index
        return self.clear_index_content()
    
    def show_status(self):
        """Show the current status of the index."""
        print(f"📊 Index Status: '{self.index_name}'")
        print("="*30)
        
        if self.index_exists():
            try:
                index = self.pc.Index(self.index_name)
                stats = index.describe_index_stats()
                print(f"✅ Index exists and is active")
                print(f"   Total vectors: {stats.total_vector_count}")
                print(f"   Dimension: {stats.dimension}")
            except Exception as e:
                print(f"⚠️ Index exists but could not get stats: {e}")
        else:
            print(f"❌ Index does not exist")


def main():
    """Main function with command line argument parsing."""
    parser = argparse.ArgumentParser(
        description="Reset Pinecone index - Production Ready",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 reset_pinecone_index.py                    # Delete and recreate
  python3 reset_pinecone_index.py --delete-only      # Delete index only
  python3 reset_pinecone_index.py --clear-content    # Clear vectors only (keep index)
  python3 reset_pinecone_index.py --status           # Show status only

Environment Variables:
  PINECONE_API_KEY        - Required: Pinecone API key
  PINECONE_ENVIRONMENT    - Optional: Environment (default: us-east-1)
  PINECONE_INDEX_NAME     - Optional: Index name (default: test)
  OPENAI_EMBEDDING_MODEL  - Optional: Embedding model (default: text-embedding-3-small)
        """
    )
    
    parser.add_argument(
        "--delete-only",
        action="store_true",
        help="Delete the index without recreating it"
    )
    
    parser.add_argument(
        "--clear-content",
        action="store_true",
        help="Clear all vectors from the index (keep index structure)"
    )
    
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show index status only (no deletion)"
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize resetter
        resetter = PineconeIndexResetter()
        
        if args.status:
            # Show status only
            resetter.show_status()
            return
        
        if args.clear_content:
            # Clear content only
            success = resetter.clear_content()
            if success:
                print("\n🎉 Index content cleared successfully!")
                print("✅ All vectors removed, index structure preserved")
                # Show final status
                print("\n" + "="*50)
                resetter.show_status()
            else:
                print("\n❌ Failed to clear index content!")
                sys.exit(1)
            return
        
        # Reset the index (delete + recreate)
        recreate = not args.delete_only
        success = resetter.reset_index(recreate=recreate)
        
        if success:
            print("\n🎉 Index reset completed successfully!")
            if recreate:
                print("✅ Index deleted and recreated")
            else:
                print("✅ Index deleted")
            
            # Show final status
            print("\n" + "="*50)
            resetter.show_status()
        else:
            print("\n❌ Index reset failed!")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
