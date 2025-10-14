# --------- LLM backend with LangChain (OpenAI + Ollama + Bedrock support) ----------
import os
from dotenv import load_dotenv  # pip install python-dotenv

from langchain_openai import ChatOpenAI
from langchain_ollama.chat_models import ChatOllama
from langchain_aws import ChatBedrock  # ✅ requires: pip install langchain-aws
from langchain_core.prompts import ChatPromptTemplate

# Load environment variables (e.g., AWS credentials)
load_dotenv()

aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
def call_llm(
    prompt: str,
    provider: str = "openai",
    model: str = "gpt-4o-mini",
    max_tokens: int = 2000,
    temperature: float = 0.0,
    web_search: bool = False,
) -> str:
    provider = provider.lower()

    # ---- Build LangChain prompt template ----
    template = ChatPromptTemplate.from_messages([
        ("system", "Follow instructions carefully. You are a helpful assistant."),
        ("user", "{user_input}")
    ])
    chain = None

    # ---- OpenAI ----
    if provider == "openai":
        if web_search:
            model="gpt-4o-search-preview"  # web-browsing model
        llm = ChatOpenAI(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=os.getenv("OPENAI_API_KEY"),
        )
        chain = template | llm

    # ---- Ollama ----
    elif provider == "ollama":
        llm = ChatOllama(
            model=model,
            temperature=temperature,
            num_predict=max_tokens,
        )
        chain = template | llm

    # ---- Amazon Bedrock ----
    elif provider == "bedrock":
        # You can use models like:
        # - anthropic.claude-3-sonnet-20240229
        # - amazon.titan-text-lite-v1
        # - meta.llama3-70b-instruct-v1:0
        # AWS credentials must be in ~/.aws/credentials or env vars
        llm = ChatBedrock(
            model_id=model,
            model_kwargs={
                "temperature": temperature,
                "maxTokens": max_tokens,
            },
            region_name=os.getenv("AWS_REGION", "us-east-1"),
        )
        chain = template | llm

    else:
        raise RuntimeError(f"Unsupported LLM provider: {provider}")

    # ---- Run chain ----
    resp = chain.invoke({"user_input": prompt})
    return resp.content.strip()


# ------------------------ Quick Tests ------------------------
if __name__ == "__main__":
    import datetime
    test_prompt = "Say hello world"

    # --- OpenAI test ---
    start = datetime.datetime.now()
    openai_resp = call_llm(test_prompt, provider="openai", model="gpt-4o-mini")
    print("OpenAI:", openai_resp, f"(took {(datetime.datetime.now() - start).total_seconds():.2f}s)")

    # --- Ollama test ---
    start = datetime.datetime.now()
    ollama_resp = call_llm(test_prompt, provider="ollama", model="gemma3:270m")
    print("Ollama:", ollama_resp, f"(took {(datetime.datetime.now() - start).total_seconds():.2f}s)")

    # --- Bedrock test ---
    start = datetime.datetime.now()
    bedrock_resp = call_llm(
        test_prompt,
        provider="bedrock",
    model="anthropic.claude-3-sonnet-20240229-v1:0"

    )
    print("Bedrock:", bedrock_resp, f"(took {(datetime.datetime.now() - start).total_seconds():.2f}s)")
