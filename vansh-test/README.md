# Dynamic Field Addition System

This system allows you to dynamically add fields to your anchored index based on user queries, making future similar queries much faster and more efficient.

## 🎯 Concept

Instead of processing queries after indexing, this system:
1. **Analyzes user queries** to determine what fields are needed
2. **Adds those fields** to the existing index structure
3. **Makes future queries faster** by using direct field access

## 🔄 How It Works

### Step 1: User Query Analysis
```
User Query: "What companies are in the US?"
    ↓
Intent Parser: Identifies need for "location" field
    ↓
Field Info: {field_name: "location", field_type: "list"}
```

### Step 2: Field Extraction
```
For each chunk in the index:
    ↓
LLM extracts location information
    ↓
Adds "location" field to chunk analysis
```

### Step 3: Index Update
```
Original Index:
{
  "chunk_0": {
    "analysis": {
      "summary": "Company data",
      "key_values": ["Google", "Apple"]
    }
  }
}

Updated Index:
{
  "chunk_0": {
    "analysis": {
      "summary": "Company data", 
      "key_values": ["Google", "Apple"],
      "location": ["US", "California"]  // NEW FIELD
    }
  }
}
```

### Step 4: Fast Future Queries
```
Query: "Which companies are in the US?"
    ↓
Direct field access: index.chunks[*].analysis.location
    ↓
Instant results (no LLM processing needed)
```

## 📁 Files

- `inverted_index.py` - Original anchoring system
- `anchored_index_output.json` - Base anchored data
- `dynamic_index_builder.py` - Adds fields based on user queries
- `field_query_processor.py` - Queries the dynamic index
- `README.md` - This documentation

## 🚀 Usage

### 1. Add Fields Based on Queries

```bash
python3 dynamic_index_builder.py
```

**Example queries to add fields:**
- "What companies are in the US?" → adds `location` field
- "Which company has highest salary?" → adds `salary_ranking` field  
- "What benefits do companies offer?" → adds `benefits` field

### 2. Query Using Added Fields

```bash
python3 field_query_processor.py
```

**Query the dynamic index:**
- List all available fields
- Get field statistics
- Query by specific field values

## 🔧 Example Workflow

### Initial Setup
```bash
# 1. Generate base anchored index
python3 inverted_index.py

# 2. Add location field
python3 dynamic_index_builder.py
# Enter: "What companies are in the US?"

# 3. Add salary field  
python3 dynamic_index_builder.py
# Enter: "Which company has highest salary ranges?"
```

### Querying
```bash
# Query the dynamic index
python3 field_query_processor.py
# Choose: Query by field
# Field: location
# Value: US
```

## 📊 Benefits

1. **Incremental Intelligence**: Index gets smarter with each query
2. **No Reprocessing**: Don't recreate the entire index
3. **Efficient Updates**: Only add new fields, keep existing data
4. **Fast Queries**: Direct field access instead of text search
5. **Cumulative Learning**: Each query makes future queries faster

## 🎯 Field Types Supported

- **location**: Countries, states, cities
- **salary_ranking**: High, medium, low salary ranges
- **benefits**: Health, dental, 401k, etc.
- **company_size**: Large, medium, small companies
- **industry**: Tech, finance, healthcare, etc.
- **employment_type**: Full-time, part-time, contract, etc.

## 🔍 Query Examples

### Location Queries
```python
# Find all US companies
results = query_by_field(index, "location", "US")

# Find all California companies  
results = query_by_field(index, "location", "California")
```

### Salary Queries
```python
# Find high-paying companies
results = query_by_field(index, "salary_ranking", "high")

# Find all salary data
results = query_by_field(index, "salary_ranking")
```

### Benefits Queries
```python
# Find companies with health benefits
results = query_by_field(index, "benefits", "health")

# Find all benefit information
results = query_by_field(index, "benefits")
```

## 🚀 Advanced Features

### Field Statistics
```python
stats = get_field_statistics(index, "location")
# Returns: total chunks, average confidence, unique values
```

### Available Fields
```python
fields = list_available_fields(index)
# Returns: ["location", "salary_ranking", "benefits", ...]
```

### Confidence Scores
Each extracted field includes confidence scores to indicate reliability.

## 🔧 Customization

### Adding New Field Types
1. Update the intent parser prompts in `dynamic_index_builder.py`
2. Add extraction instructions for new field types
3. Update field statistics in `field_query_processor.py`

### Improving Extraction Quality
1. Refine the extraction prompts in `extract_field_data_for_chunks()`
2. Add validation logic for extracted data
3. Implement confidence threshold filtering

## 🐛 Troubleshooting

### Common Issues

1. **No fields found**: Run `dynamic_index_builder.py` first to add fields
2. **Low confidence scores**: Refine extraction prompts
3. **Missing data**: Check if the base anchored index has sufficient data

### Debugging

- Check `field_metadata` in the dynamic index for field information
- Review confidence scores for extraction quality
- Use field statistics to understand data coverage

## 📈 Future Enhancements

1. **Automatic Field Detection**: Analyze all queries to suggest new fields
2. **Field Relationships**: Link related fields (e.g., location + salary)
3. **Caching**: Cache field extraction results
4. **Validation**: Validate extracted field data
5. **Analytics**: Track field usage and query patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with sample queries
5. Submit a pull request

## 📄 License

This project is part of the context-engine repository.
