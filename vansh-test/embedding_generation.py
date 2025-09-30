import os
import torch
from typing import Dict, List, Union, Optional

from transformers import AutoTokenizer, AutoModel, AutoModelForMaskedLM
from sentence_transformers import SentenceTransformer
import cohere
from openai import OpenAI

from dotenv import load_dotenv 
load_dotenv()

class EmbeddingGenerator:
    """Generate dense and sparse embeddings using multiple providers/models."""

    def __init__(self,
                 openai_key: Optional[str] = os.getenv("OPENAI_API_KEY",None),
                 cohere_key: Optional[str] = os.getenv("COHERE_API_KEY",None),):
        """Initialize embedding clients for OpenAI, Cohere, SBERT, and SPLADE"""
        self.openai_client = OpenAI(api_key=openai_key) if openai_key else None
        self.cohere_client = cohere.Client(cohere_key) if cohere_key else None

        # Dense (SentenceTransformers)
        self.sbert_model = SentenceTransformer("all-MiniLM-L6-v2")

        # Sparse (SPLADE)
        self.splade_model_name = "naver/splade-cocondenser-ensembledistil"
        self.splade_tokenizer = AutoTokenizer.from_pretrained(self.splade_model_name)
        self.splade_model = AutoModelForMaskedLM.from_pretrained(self.splade_model_name)

    # -------------------------
    # Dense Embedding Methods
    # -------------------------
    def embed_openai(self, text: str, model: str = "text-embedding-3-small") -> List[float]:
        if not self.openai_client:
            raise ValueError("OpenAI API key not provided.")
        response = self.openai_client.embeddings.create(model=model, input=text)
        return response.data[0].embedding

    def embed_cohere(self, text: str, model: str = "embed-english-v3.0",input_type:str='search_query') -> List[float]:
        if not self.cohere_client:
            raise ValueError("Cohere API key not provided.")
        response = self.cohere_client.embed(texts=[text], model=model,input_type=input_type)
        return response.embeddings[0]

    def embed_sbert(self, text: str) -> List[float]:
        return self.sbert_model.encode(text).tolist()

    # -------------------------
    # Sparse Embedding Method
    # -------------------------
    def embed_splade(self, text: str) -> Dict[str, Union[List[int], List[float]]]:
        """Return sparse embedding in Pinecone format"""
        inputs = self.splade_tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            logits = self.splade_model(**inputs).logits.squeeze(0)

        relu = torch.nn.functional.relu(logits)
        sparse_emb = torch.log(1 + relu).sum(0)  # vocab_size

        non_zero = sparse_emb.nonzero().squeeze().cpu().tolist()
        values = sparse_emb[non_zero].cpu().tolist()

        return {"indices": non_zero, "values": values}

    # -------------------------
    # Unified API
    # -------------------------
    def generate(self, text: str, method: str = "sbert") -> Union[List[float], Dict]:
        """
        method: one of ["openai", "cohere", "sbert", "splade"]
        """
        if method == "openai":
            return self.embed_openai(text)
        elif method == "cohere":
            return self.embed_cohere(text)
        elif method == "sbert":
            return self.embed_sbert(text)
        elif method == "splade":
            return self.embed_splade(text)
        else:
            raise ValueError(f"Unknown method: {method}")

if __name__ == "__main__":
    gen = EmbeddingGenerator()

    text = "Hello world, this is a test of embedding generation."

    dense_openai = gen.generate(text, method="openai")
    dense_cohere = gen.generate(text, method="cohere")
    dense_sbert = gen.generate(text, method="sbert")
    sparse_splade = gen.generate(text, method="splade")

    print("OpenAI Dense:", len(dense_openai))
    print("Cohere Dense:", len(dense_cohere))
    print("SBERT Dense:", len(dense_sbert))
    print("SPLADE Sparse:", len(sparse_splade))
