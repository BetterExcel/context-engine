#!/bin/bash

# Context Engine Pipeline Script
# This script runs the complete pipeline: Excel → Anchored Index → Pinecone → Dynamic Fields → RAG

echo "🚀 Starting Context Engine Pipeline..."
echo "========================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it with your API keys."
    exit 1
fi

# Step 1: Build anchored index from Excel
echo ""
echo "Step 1: Building anchored index from Excel..."
echo "============================================="
python3 inverted_index.py

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to build anchored index"
    exit 1
fi

echo "✅ Anchored index built successfully"

# Step 2: Upload to Pinecone
echo ""
echo "Step 2: Uploading to Pinecone..."
echo "==============================="
python3 pinecone_uploader.py

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to upload to Pinecone"
    exit 1
fi

echo "✅ Data uploaded to Pinecone successfully"

# Step 3: Get user query for dynamic field addition
echo ""
echo "Step 3: Dynamic Field Addition"
echo "=============================="
echo "Enter your query to add dynamic fields (e.g., 'us companies', 'high paying companies'):"
read -p "Query: " USER_QUERY

if [ -z "$USER_QUERY" ]; then
    echo "❌ Error: No query provided"
    exit 1
fi

# Step 4: Add dynamic fields using Python script
echo ""
echo "Step 4: Adding dynamic fields..."
echo "================================"
echo "Query: '$USER_QUERY'"


# Run the dynamic field addition
python3 run_dynamic.py "$USER_QUERY"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to add dynamic fields"
    rm run_dynamic.py
    exit 1
fi

# Clean up temporary file
rm run_dynamic.py

echo "✅ Dynamic fields added successfully"

# Step 5: Run RAG with the same query
echo ""
echo "Step 5: Running RAG query..."
echo "============================"

# Run RAG with the user's query as command line argument
python3 rag.py "$USER_QUERY"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to run RAG query"
    exit 1
fi

echo ""
echo "🎉 Pipeline completed successfully!"
echo "=================================="
echo "📊 Results:"
echo "- Anchored index: anchored_index_output.json"
echo "- Dynamic index: dynamic_index_output.json"
echo "- Pinecone index: Updated with embeddings"
echo "- Query logs: rag_queries.log"
echo ""
echo "Query used: '$USER_QUERY'"
echo "You can run additional RAG queries by running: python3 rag.py '<your_query>'"
