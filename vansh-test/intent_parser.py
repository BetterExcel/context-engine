import json
import requests
import time
from typing import Dict, List, Any
import re

# Ollama configuration
OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.1:8b"

def call_ollama(prompt: str, max_retries: int = 3) -> str:
    """Call Ollama API with retry logic."""
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "").strip()
        except Exception as e:
            print(f"Ollama attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise Exception(f"Ollama failed after {max_retries} attempts: {e}")

def parse_intent(query: str) -> Dict:
    """
    Parse user query to extract structured intent and entities.
    
    Args:
        query: User's natural language query
        
    Returns:
        Structured intent dictionary with type, entities, and actions
    """
    prompt = f"""
    Analyze this user query and extract the intent: "{query}"
    
    Return ONLY a valid JSON response with this exact structure:
    {{
        "intent_type": "filtering|comparison|trend_analysis|aggregation|search|ranking",
        "intent_subtype": "specific_subtype_if_applicable",
        "entities": {{
            "target": "what the user wants to find (e.g., companies, employees, products)",
            "metric": "what measurement/attribute they care about (e.g., salary, revenue, count)",
            "comparison": "highest|lowest|average|sum|count|specific_value",
            "filters": ["list", "of", "filter", "conditions"],
            "time_dimension": true|false,
            "location_dimension": true|false
        }},
        "context_needed": ["list", "of", "required", "data", "types"],
        "suggested_actions": ["action1", "action2", "action3"],
        "confidence": 0.0-1.0
    }}
    
    CRITICAL RULES:
    - All strings must be properly escaped
    - Use empty arrays [] if no filters or actions
    - Confidence should be between 0.0 and 1.0
    - Be precise and structured
    - Respond with ONLY the JSON object
    
    Examples:
    - "Which companies are in the US?" → filtering intent with location filter
    - "Which company has highest salary?" → comparison intent with ranking
    - "How have sales changed over time?" → trend_analysis intent
    - "What's the average revenue?" → aggregation intent
    """
    
    try:
        response = call_ollama(prompt)
        print(f"Raw Ollama response for intent parsing: {response[:200]}...")
        
        # Clean up common JSON issues
        cleaned_response = response.replace('[None]', '[]').replace('None', 'null')
        
        # Try to parse JSON response with multiple attempts
        intent = None
        for attempt in range(3):
            try:
                intent = json.loads(cleaned_response)
                break
            except json.JSONDecodeError as e:
                if attempt == 0:
                    # First attempt: try to fix common issues
                    cleaned_response = cleaned_response.replace("'", '"')  # Replace single quotes with double
                elif attempt == 1:
                    # Second attempt: try to fix unescaped quotes in strings
                    cleaned_response = re.sub(r'(?<!\\)"(?=[^,}\]])', '\\"', cleaned_response)
                else:
                    # Final attempt: create a fallback intent
                    print(f"Creating fallback intent for query: {query}")
                    intent = {
                        "intent_type": "search",
                        "intent_subtype": "general_search",
                        "entities": {
                            "target": "data",
                            "metric": "relevance",
                            "comparison": "specific_value",
                            "filters": [],
                            "time_dimension": False,
                            "location_dimension": False
                        },
                        "context_needed": ["general_data"],
                        "suggested_actions": ["search_chunks", "extract_context"],
                        "confidence": 0.5
                    }
                    break
        
        if intent is None:
            raise Exception("Failed to parse intent after multiple attempts")
        
        # Validate and clean the intent structure
        intent = validate_intent_structure(intent)
        
        return {
            "query": query,
            "parsed_at": time.time(),
            "intent": intent
        }
        
    except Exception as e:
        print(f"Intent parsing failed for query '{query}': {e}")
        raise e

def validate_intent_structure(intent: Dict) -> Dict:
    """Validate and clean the intent structure."""
    
    # Ensure required fields exist
    required_fields = ["intent_type", "entities", "context_needed", "suggested_actions", "confidence"]
    for field in required_fields:
        if field not in intent:
            if field == "confidence":
                intent[field] = 0.5
            elif field == "context_needed":
                intent[field] = ["general_data"]
            elif field == "suggested_actions":
                intent[field] = ["search_chunks"]
            else:
                intent[field] = "unknown"
    
    # Validate intent_type
    valid_intent_types = ["filtering", "comparison", "trend_analysis", "aggregation", "search", "ranking"]
    if intent["intent_type"] not in valid_intent_types:
        intent["intent_type"] = "search"
    
    # Validate entities structure
    if not isinstance(intent["entities"], dict):
        intent["entities"] = {}
    
    entity_fields = ["target", "metric", "comparison", "filters", "time_dimension", "location_dimension"]
    for field in entity_fields:
        if field not in intent["entities"]:
            if field in ["time_dimension", "location_dimension"]:
                intent["entities"][field] = False
            elif field == "filters":
                intent["entities"][field] = []
            else:
                intent["entities"][field] = "unknown"
    
    # Ensure arrays are properly formatted
    for field in ["context_needed", "suggested_actions", "entities.filters"]:
        if field == "entities.filters":
            if not isinstance(intent["entities"]["filters"], list):
                intent["entities"]["filters"] = []
        else:
            if not isinstance(intent[field], list):
                intent[field] = []
    
    # Validate confidence score
    if not isinstance(intent["confidence"], (int, float)) or intent["confidence"] < 0 or intent["confidence"] > 1:
        intent["confidence"] = 0.5
    
    return intent

def get_intent_examples() -> List[Dict]:
    """Return example intents for testing."""
    return [
        {
            "query": "Which companies are in the US?",
            "expected_intent": {
                "intent_type": "filtering",
                "intent_subtype": "location_filter",
                "entities": {
                    "target": "companies",
                    "metric": "location",
                    "comparison": "specific_value",
                    "filters": ["US", "United States"],
                    "time_dimension": False,
                    "location_dimension": True
                }
            }
        },
        {
            "query": "Which company has the highest salary ranges?",
            "expected_intent": {
                "intent_type": "comparison",
                "intent_subtype": "ranking_highest",
                "entities": {
                    "target": "company",
                    "metric": "salary_ranges",
                    "comparison": "highest",
                    "filters": [],
                    "time_dimension": False,
                    "location_dimension": False
                }
            }
        },
        {
            "query": "What's the average salary across all companies?",
            "expected_intent": {
                "intent_type": "aggregation",
                "intent_subtype": "average_calculation",
                "entities": {
                    "target": "companies",
                    "metric": "salary",
                    "comparison": "average",
                    "filters": [],
                    "time_dimension": False,
                    "location_dimension": False
                }
            }
        },
        {
            "query": "How have salaries changed over time?",
            "expected_intent": {
                "intent_type": "trend_analysis",
                "intent_subtype": "temporal_trend",
                "entities": {
                    "target": "salaries",
                    "metric": "change",
                    "comparison": "trend",
                    "filters": [],
                    "time_dimension": True,
                    "location_dimension": False
                }
            }
        }
    ]

if __name__ == "__main__":
    # Test the intent parser
    test_queries = [
        "Which companies are in the US?",
        "Which company has the highest salary ranges?",
        "What's the average salary across all companies?",
        "How have salaries changed over time?",
        "Find companies with remote work options"
    ]
    
    print("Testing Intent Parser...")
    print("=" * 50)
    
    for query in test_queries:
        try:
            print(f"\nQuery: {query}")
            result = parse_intent(query)
            print(f"Intent: {result['intent']['intent_type']}")
            print(f"Target: {result['intent']['entities']['target']}")
            print(f"Metric: {result['intent']['entities']['metric']}")
            print(f"Comparison: {result['intent']['entities']['comparison']}")
            print(f"Confidence: {result['intent']['confidence']}")
            print("-" * 30)
        except Exception as e:
            print(f"Failed to parse query '{query}': {e}")
    
    print("\nIntent parser test completed!")
