# --------- LLM backend with LangChain (OpenAI + Ollama support) ----------
import os
from dotenv import load_dotenv  # pip install python-dotenv

from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama   # ✅ new
from langchain_core.prompts import ChatPromptTemplate

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

    # Build the LangChain prompt template
    template = ChatPromptTemplate.from_messages([
        ("system", "You summarize dataset columns concisely and conservatively."),
        ("user", "{user_input}")
    ])
    chain = None

    if provider == "openai":
        # Requires: pip install langchain-openai
        llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=os.getenv("OPENAI_API_KEY"),
        )
        chain = template | llm

    elif provider == "ollama":
        # Requires: pip install langchain-community
        llm = ChatOllama(
            model=model,
            temperature=temperature,
            num_predict=max_tokens,
        )
        chain = template | llm

    else:
        raise RuntimeError(f"Unsupported LLM provider: {provider}")

    # Run the chain
    resp = chain.invoke({"user_input": prompt})
    return resp.content.strip()


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
