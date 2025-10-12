#!/bin/bash

# Reset Pinecone Index Script
# ==========================
# 
# Quick wrapper for reset_pinecone.py
# 
# Usage:
#   ./reset.sh           # Reset and recreate index (default)
#   ./reset.sh --delete  # Delete index only
#   ./reset.sh --help    # Show help

echo "🚀 Pinecone Index Reset Tool"
echo "=============================="

# Check if Python script exists
if [ ! -f "reset_pinecone.py" ]; then
    echo "❌ Error: reset_pinecone.py not found"
    echo "   Please run this script from the vansh-test directory"
    exit 1
fi

# Parse arguments
case "${1:-}" in
    "--delete"|"-d")
        echo "🗑️  Mode: Delete index only (no recreation)"
        python3 reset_pinecone.py --no-recreate
        ;;
    "--help"|"-h")
        echo "📖 Showing help..."
        python3 reset_pinecone.py --help
        ;;
    "")
        echo "🔄 Mode: Reset and recreate index"
        python3 reset_pinecone.py --recreate
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo "Usage: ./reset.sh [--delete|--help]"
        echo "   --delete: Delete index only"
        echo "   --help:   Show detailed help"
        exit 1
        ;;
esac

