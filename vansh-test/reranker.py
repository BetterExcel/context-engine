import os
import requests
from typing import List, Dict, Optional

import torch
from sentence_transformers import CrossEncoder
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

class ReRanker:
    """Flexible re-ranking with multiple backends (Cohere, CrossEncoder, MonoT5, GPT, Keyword)."""

    def __init__(self,
                 cohere_key: Optional[str] = os.getenv("COHERE_API_KEY"),
                 openai_key: Optional[str] = os.getenv("OPENAI_API_KEY"),
                 cross_encoder_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
                 monot5_model: str = "castorini/monot5-base-msmarco",
                 device: Optional[str] = None):
        self.cohere_key = cohere_key
        self.openai_key = openai_key
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # Hugging Face cross-encoder
        self.cross_encoder = CrossEncoder(cross_encoder_model, device=self.device)

        # MonoT5 reranker
        # self.monot5_tokenizer = AutoTokenizer.from_pretrained(monot5_model)
        # self.monot5_model = AutoModelForSeq2SeqLM.from_pretrained(monot5_model).to(self.device)

        # OpenAI client
        self.openai_client = OpenAI(api_key=self.openai_key) if self.openai_key else None

    # -------------------------
    # Cohere Rerank
    # -------------------------
    def rerank_cohere(self, query: str, documents: List[str], top_k: int = 5) -> List[Dict]:
        if not self.cohere_key:
            raise ValueError("Cohere API key not provided.")
        url = "https://api.cohere.ai/v1/rerank"
        headers = {"Authorization": f"Bearer {self.cohere_key}",
                   "Content-Type": "application/json"}
        payload = {"query": query, "documents": documents, "top_n": min(top_k, len(documents))}
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for r in data.get("results", []):
            idx = r["index"]
            results.append({"doc": documents[idx], "score": r["relevance_score"]})
        return sorted(results, key=lambda x: x["score"], reverse=True)

    # -------------------------
    # CrossEncoder (MiniLM, DeBERTa, etc.)
    # -------------------------
    def rerank_cross_encoder(self, query: str, documents: List[str], top_k: int = 5) -> List[Dict]:
        pairs = [[query, doc] for doc in documents]
        scores = self.cross_encoder.predict(pairs)
        results = [{"doc": doc, "score": float(score)} for doc, score in zip(documents, scores)]
        return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]

    # -------------------------
    # MonoT5 Reranker
    # -------------------------
    def rerank_monot5(self, query: str, documents: List[str], top_k: int = 5) -> List[Dict]:
        inputs = [f"Query: {query} Document: {doc} Relevant:" for doc in documents]
        tokenized = self.monot5_tokenizer(inputs, padding=True, truncation=True, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.monot5_model.generate(**tokenized, max_new_tokens=1)
        decoded = [self.monot5_tokenizer.decode(o, skip_special_tokens=True) for o in outputs]
        scores = [1.0 if d.lower().strip() == "true" else 0.0 for d in decoded]
        results = [{"doc": doc, "score": float(score)} for doc, score in zip(documents, scores)]
        return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]

    # -------------------------
    # OpenAI GPT as a reranker (prompt-based)
    # -------------------------
    def rerank_openai(self, query: str, documents: List[str], top_k: int = 5, model: str = "gpt-4o-mini") -> List[Dict]:
        if not self.openai_client:
            raise ValueError("OpenAI API key not provided.")
        ranked = []
        for i, doc in enumerate(documents):
            prompt = f"Rate the relevance of the following document to the query on a scale of 0 (irrelevant) to 10 (highly relevant).\n\nQuery: {query}\nDocument: {doc}\n\nAnswer with just the number:"
            resp = self.openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )
            try:
                score = float(resp.choices[0].message.content.strip())
            except:
                score = 0.0
            ranked.append({"doc": doc, "score": score})
        return sorted(ranked, key=lambda x: x["score"], reverse=True)[:top_k]

    # -------------------------
    # Keyword overlap (baseline)
    # -------------------------
    def rerank_keyword_overlap(self, query: str, documents: List[str], top_k: int = 5) -> List[Dict]:
        q_tokens = set(query.lower().split())
        scored = []
        for doc in documents:
            d_tokens = set(doc.lower().split())
            overlap = len(q_tokens & d_tokens)
            scored.append({"doc": doc, "score": overlap})
        return sorted(scored, key=lambda x: x["score"], reverse=True)[:top_k]

    # -------------------------
    # Unified API
    # -------------------------
    def rerank(self, query: str, documents: List[str], method: str = "cross_encoder", top_k: int = 5) -> List[Dict]:
        """
        method: one of ["cohere", "cross_encoder", "monot5", "openai", "keyword"]
        """
        if method == "cohere":
            return self.rerank_cohere(query, documents, top_k)
        elif method == "cross_encoder":
            return self.rerank_cross_encoder(query, documents, top_k)
        elif method == "monot5":
            return self.rerank_monot5(query, documents, top_k)
        elif method == "openai":
            return self.rerank_openai(query, documents, top_k)
        elif method == "keyword":
            return self.rerank_keyword_overlap(query, documents, top_k)
        else:
            raise ValueError(f"Unknown rerank method: {method}")


if __name__ == "__main__":
    docs = [
        "Apple releases new iPhone with advanced camera system",
        "Microsoft launches new AI research lab in Toronto",
        "Tesla stock price drops after quarterly earnings report",
        "OpenAI introduces GPT-5 with improved reasoning capabilities",
    ]
    query = "latest AI developments"

    rr = ReRanker()

    print("Cross-encoder:", rr.rerank(query, docs, method="cross_encoder"))
    # print("MonoT5:", rr.rerank(query, docs, method="monot5"))
    print("Keyword:", rr.rerank(query, docs, method="keyword"))
    # If keys are available:
    print("Cohere:", rr.rerank(query, docs, method="cohere"))
    print("OpenAI:", rr.rerank(query, docs, method="openai"))
