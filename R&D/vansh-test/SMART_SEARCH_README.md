# Smart Search Pipeline

An intelligent search system that combines hybrid search (semantic + lexical) with dynamic field extraction.

## 🎯 How It Works

The smart search pipeline uses a **threshold-based strategy** to optimize search quality:

```
┌─────────────────────────────────────┐
│  1. Initial Hybrid Search           │
│     (Semantic + Lexical)            │
└──────────────┬──────────────────────┘
               │
               ▼
         ┌─────────────┐
         │ Check Score │
         │ Threshold?  │
         └──────┬──────┘
                │
       ┌────────┴────────┐
       │                 │
    ✅ PASS          ❌ FAIL
       │                 │
       │                 ▼
       │    ┌─────────────────────────┐
       │    │ 2. Dynamic Field        │
       │    │    Extraction           │
       │    └────────────┬────────────┘
       │                 │
       │                 ▼
       │    ┌─────────────────────────┐
       │    │ 3. Second Hybrid Search │
       │    └────────────┬────────────┘
       │                 │
       └─────────────────┘
                │
                ▼
         ┌─────────────┐
         │ Return Best │
         │   Results   │
         └─────────────┘
```

## 📋 Features

### **1. Hybrid Search**
- **Semantic Search**: Uses OpenAI embeddings + Pinecone vector database
- **Lexical Search**: Uses BM25 algorithm for keyword matching
- **Combined Scoring**: Weighted combination (60% semantic, 40% lexical)

### **2. Threshold-Based Decision**
- **Configurable Threshold**: Default 0.4
- **Score Analysis**: Checks if best result meets minimum quality
- **Smart Routing**: Only runs expensive operations when needed

### **3. Dynamic Field Extraction**
- **Automatic Trigger**: Runs only if initial results are poor
- **LLM-Based**: Uses GPT-4o-mini to extract relevant fields
- **Pinecone Sync**: Uploads new fields automatically
- **Consolidated Chunks**: Creates combined views of extracted data

## 🚀 Usage

### Basic Command
```bash
python3 smart_search.py "your query here"
```

### Examples

#### Example 1: Good Results (No Dynamic Extraction)
```bash
python3 smart_search.py "canadian companies"
```
Output:
```
📍 STEP 1: Initial Hybrid Search
✅ Results meet threshold! Returning initial results.
```

#### Example 2: Poor Results (Triggers Dynamic Extraction)
```bash
python3 smart_search.py "aerospace engineering companies"
```
Output:
```
📍 STEP 1: Initial Hybrid Search
❌ FAIL - Below threshold

📍 STEP 2: Dynamic Field Extraction
✅ Extracted new field: aerospace_engineering_companies

📍 STEP 3: Second Hybrid Search
✅ PASS - Improved results!
```

## ⚙️ Configuration

Edit these constants in `smart_search.py`:

```python
SEMANTIC_THRESHOLD = 0.5   # Minimum semantic score
LEXICAL_THRESHOLD = 0.3    # Minimum lexical score  
COMBINED_THRESHOLD = 0.4   # Minimum combined score (used by default)
TOP_K = 6                  # Number of results to retrieve
```

## 📊 Output Format

Each result includes:
- **Combined Score**: Weighted combination of semantic + lexical
- **Semantic Score**: Vector similarity score
- **Lexical Score**: BM25 keyword matching score
- **Search Types**: Which methods found this result
- **Metadata**: Summary, sheet name, range, etc.

Example Output:
```
🔍 Result 1: Salary List_chunk_1
   Combined Score: 0.652
   Semantic Score: 0.651
   Lexical Score:  1.692
   Search Types:   semantic, lexical
   Summary: This data chunk contains information about...
   Sheet: Salary List
   Range: A51:A100
```

## 🔧 Requirements

### Prerequisites
1. **Anchored index built**: Run `anchored_index_builder.py` first
2. **Pinecone index ready**: Index should be populated
3. **Environment variables**: `.env` file with API keys

### Dependencies
- `hybrid_search.py` - Semantic and lexical search classes
- `dynamic_index_builder.py` - Dynamic field extraction
- `pinecone_uploader_new.py` - Pinecone operations
- `embedding_generation.py` - Embedding generation
- OpenAI API key
- Pinecone API key

## 🎯 Use Cases

### When It Works Best

**✅ Scenario 1: Direct Match**
- Query: "RBC salaries"
- Result: Finds exact company data immediately
- Action: Returns initial results (fast)

**✅ Scenario 2: Conceptual Query**
- Query: "high paying tech jobs"
- Result: Initial search finds some results
- Action: May or may not trigger dynamic extraction based on scores

**✅ Scenario 3: New Concept**
- Query: "blockchain companies"  
- Result: No existing field matches well
- Action: Extracts new field, finds specific companies

### Performance

- **Fast Path**: ~2-3 seconds (threshold met)
- **Slow Path**: ~30-45 seconds (dynamic extraction needed)
- **Trade-off**: Quality vs Speed (optimized for quality)

## 📈 Threshold Tuning

Adjust based on your needs:

| Threshold | Behavior | Use When |
|-----------|----------|----------|
| 0.3 | More initial results accepted | Speed priority |
| 0.4 | Balanced (default) | General use |
| 0.5 | More dynamic extractions | Quality priority |
| 0.6 | Very strict | Maximum quality |

## 🔍 Troubleshooting

### No Results Found
```bash
# Check if index exists
ls anchored_index_output.json

# Check Pinecone
python3 -c "from pinecone_uploader_new import PineconeUploader; u=PineconeUploader(); print(u.index.describe_index_stats())"
```

### Dynamic Extraction Fails
- Verify OpenAI API key in `.env`
- Check `test.xlsx` file exists
- Review `dynamic_index_builder.py` logs

### Low Scores
- Increase data in Excel file
- Run more dynamic extractions
- Lower threshold temporarily

## 📝 Logs

The script provides detailed logging:
- Step-by-step execution
- Score analysis at each stage
- Threshold comparisons
- Final decision reasoning

All INFO/WARNING logs are prefixed for easy filtering.

## 🚀 Integration

Can be integrated into larger pipelines:

```python
from smart_search import main

# Programmatic usage
results = main(query="canadian companies")
```

Or use as CLI tool in shell scripts:

```bash
#!/bin/bash
QUERY="$1"
python3 smart_search.py "$QUERY" > results.txt
```

