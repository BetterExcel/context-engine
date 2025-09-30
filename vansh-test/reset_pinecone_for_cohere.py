#!/usr/bin/env python3
"""
Reset Pinecone index for OpenAI embeddings.
This script deletes the existing index to allow recreation with correct dimensions.
"""
# import os
# from pinecone import Pinecone
# from dotenv import load_dotenv

# # Load environment variables from .env file
# load_dotenv()

# # Configuration from environment variables
# PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
# PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "skopeo-context-index")
# def reset_pinecone_index():
#     """Delete the existing Pinecone index."""
#     try:
#         pc = Pinecone(api_key=PINECONE_API_KEY)
#         if PINECONE_INDEX_NAME in pc.list_indexes().names():
#             pc.delete_index(PINECONE_INDEX_NAME)
#     except Exception as e:
#         raise e

# if __name__ == "__main__":
#     reset_pinecone_index()


#KARMAN: you don't need a seperate file to reset pinecone index. You can just call the delete function from pinecone_uploader.py before creating the index.