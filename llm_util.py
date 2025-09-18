# --------- LLM backend (OpenAI + Ollama support) ----------
import os
from dotenv import load_dotenv  # pip install python-dotenv
import ollama



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
        api_key = os.getenv("OPENAI_API_KEY")
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

    elif provider == "ollama":
        # pip install ollama
        resp = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": "You summarize dataset columns concisely and conservatively."},
                {"role": "user", "content": prompt},
            ],
            options={"temperature": temperature, "num_predict": max_tokens}
        )
        return resp["message"]["content"].strip()

    raise RuntimeError(f"Unsupported LLM provider: {provider}")


if __name__ == "__main__":
    # quick tests
    test_prompt = "Say hello world"
    import datetime

    # --- OpenAI test ---
    start = datetime.datetime.now()
    openai_resp = call_llm(test_prompt, provider="openai", model="gpt-4o-mini")
    end = datetime.datetime.now()
    print("OpenAI:", openai_resp, f"(took {(end - start).total_seconds():.2f}s)")

    # --- Ollama test ---
    start = datetime.datetime.now()
    ollama_resp = call_llm(test_prompt, provider="ollama", model="gemma3:270m")
    end = datetime.datetime.now()
    print("Ollama:", ollama_resp, f"(took {(end - start).total_seconds():.2f}s)")

