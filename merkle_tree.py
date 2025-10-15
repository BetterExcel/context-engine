import hashlib
import json
from typing import Any, Dict, List, Union


class MerkleTree:
    """Represents a Merkle Tree built from chunks of strings."""

    def __init__(self, chunks: List[str]):
        """
        Build a Merkle tree from a list of string chunks.
        Each leaf node represents one chunk, hashed with SHA256.
        """
        if not isinstance(chunks, list) or not all(isinstance(c, str) for c in chunks):
            raise TypeError("MerkleTree expects a list of strings as chunks")

        self.chunks = chunks
        self.tree = self._build_tree(chunks)
        self.root_hash = self.tree[-1][0] if self.tree else None

    # ------------------ Representation ------------------
    def __repr__(self):
        """Return a flat array-style (heap-like) representation of the Merkle tree."""
        if not self.tree:
            return "[]"

        # Flatten the tree (bottom to top) into a single list
        # Pad each level to make it a full binary tree structure
        arr = []
        max_width = len(self.tree[0])
        for level in self.tree:
            # Pad with None to fill missing nodes if odd count
            padded = level + [None] * (max_width - len(level))
            arr.extend(padded)
            max_width //= 2  # upper levels have fewer nodes

        return json.dumps(arr)



    # ------------------ Core Hashing ------------------
    @staticmethod
    def _sha256(data: str) -> str:
        """Compute SHA256 hash for a string."""
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    # ------------------ Tree Construction ------------------
    @classmethod
    def _build_tree(cls, chunks: List[str]) -> List[List[str]]:
        """
        Build the Merkle tree levels.
        Returns a list of levels, bottom-up.
        """
        if not chunks:
            return []

        # Bottom level (leaves)
        level = [cls._sha256(c) for c in chunks]
        tree = [level]

        # Build up levels until root
        while len(level) > 1:
            new_level = []
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else left  # duplicate last if odd
                parent = cls._sha256(left + right)
                new_level.append(parent)
            tree.append(new_level)
            level = new_level
        return tree

    # ------------------ Accessors ------------------
    def get_root_hash(self) -> str:
        """Return the Merkle root hash."""
        return self.root_hash

    def get_tree(self) -> List[List[str]]:
        """Return the full Merkle tree (list of levels)."""
        return self.tree

    def to_json(self, indent: int = 2) -> str:
        """Return a JSON-formatted representation of the Merkle tree."""
        return json.dumps(self.tree, indent=indent)


class MerkleDiff:
    """Compare two Merkle trees and report added, updated, and deleted chunks."""

    @staticmethod
    def diff(tree1: "MerkleTree", tree2: "MerkleTree") -> Dict[str, List[int]]:
        """
        Compare two Merkle trees built from string chunks.
        Returns a dict with indices of added, updated, and deleted chunks.

        Example output:
        {
            "added": [3, 4],
            "updated": [0, 2],
            "deleted": [5]
        }
        """
        old_chunks = tree1.chunks
        new_chunks = tree2.chunks

        added, updated, deleted = [], [], []

        len_old = len(old_chunks)
        len_new = len(new_chunks)
        max_len = max(len_old, len_new)

        for i in range(max_len):
            old_val = old_chunks[i] if i < len_old else None
            new_val = new_chunks[i] if i < len_new else None

            if old_val is None and new_val is not None:
                added.append(i)
            elif new_val is None and old_val is not None:
                deleted.append(i)
            elif old_val != new_val:
                updated.append(i)

        return {"added": added, "updated": updated, "deleted": deleted}


if __name__ == "__main__":
    # Example: Merkle tree built from text chunks
    old_chunks = [
        "Climate change affects weather patterns.",
        "CO2 emissions are rising globally.",
        "Sea levels are increasing."
    ]
    new_chunks = [
        "Climate change affects weather patterns and seasons.",  # modified
        "CO2 emissions are rising globally.",
        "Sea levels are increasing rapidly.",                   # modified
    ]

    old_tree = MerkleTree(old_chunks)
    new_tree = MerkleTree(new_chunks)

    print(old_tree)
    print(new_tree)

    print("\nRoot Hashes:")
    print("Old:", old_tree.get_root_hash())
    print("New:", new_tree.get_root_hash())

    print("\nChanged Chunk Indices:", MerkleDiff.diff(old_tree, new_tree))
