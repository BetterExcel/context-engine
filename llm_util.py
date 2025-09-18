# --------- LLM backend (OpenAI by default) ----------
import os
from dotenv import load_dotenv  # pip install python-dotenv

# Load .env file at startup
load_dotenv()

def call_llm(
    prompt: str,
    provider: str = "openai",
    model: str = "gpt-4o-mini",
    max_tokens: int = 160,
    temperature: float = 0.0,
) -> str:
    provider = provider.lower()
    if provider == "openai":
        # pip install openai>=1.0.0
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")  # now read from .env
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set in environment or .env file")
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You summarize dataset columns concisely and conservatively."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return resp.choices[0].message.content.strip()
    
    raise RuntimeError(f"Unsupported LLM provider: {provider}")

if __name__ == "__main__":
    # quick test
    test_prompt = "Say hello world"
    print(call_llm(test_prompt))