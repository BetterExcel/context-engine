import hashlib
import json
from typing import Any, Dict, List, Union


class MerkleTree:
    """Represents a Merkle Tree built from a JSON-like structure."""

    def __init__(self, data: Any):
        self.data = data
        self.tree = self._build_tree(data)
        self.root_hash = self.tree["_hash"] if isinstance(self.tree, dict) else None

    @staticmethod
    def _sha256(data: str) -> str:
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    @classmethod
    def _merkle_hash(cls, node: Any) -> str:
        """Recursively compute a hash for a JSON node."""
        if isinstance(node, dict):
            items = [f"{k}:{cls._merkle_hash(v)}" for k, v in sorted(node.items())]
            combined = "|".join(items)
            return cls._sha256(f"dict:{combined}")
        elif isinstance(node, list):
            items = [cls._merkle_hash(v) for v in node]
            combined = "|".join(items)
            return cls._sha256(f"list:{combined}")
        else:
            return cls._sha256(f"val:{json.dumps(node, sort_keys=True)}")

    @classmethod
    def _build_tree(cls, node: Any) -> Union[Dict, List]:
        """Recursively attach hashes to a JSON structure."""
        if isinstance(node, dict):
            tree = {k: cls._build_tree(v) for k, v in sorted(node.items())}
            tree["_hash"] = cls._merkle_hash(node)
            return tree
        elif isinstance(node, list):
            tree = [cls._build_tree(v) for v in node]
            tree.append({"_hash": cls._merkle_hash(node)})
            return tree
        else:
            return {"_value": node, "_hash": cls._merkle_hash(node)}

    def get_root_hash(self) -> str:
        """Return the Merkle root hash."""
        return self.root_hash

    def get_tree(self) -> Any:
        """Return the full Merkle tree structure."""
        return self.tree

    def to_json(self, indent: int = 2) -> str:
        """Return a pretty-printed JSON representation of the Merkle tree."""
        return json.dumps(self.tree, indent=indent)


class MerkleDiff:
    """Compare two Merkle trees and list differing JSON paths."""

    @staticmethod
    def diff(tree1: Any, tree2: Any, path: str = "") -> List[str]:
        diffs = []

        # Type mismatch
        if type(tree1) != type(tree2):
            diffs.append(path or "$")
            return diffs

        # Primitive leaf node
        if isinstance(tree1, dict) and "_hash" in tree1 and "_hash" in tree2 and len(tree1) == len(tree2) == 2:
            if tree1["_hash"] != tree2["_hash"]:
                diffs.append(path or "$")
            return diffs

        # Dict node
        if isinstance(tree1, dict):
            keys = set(tree1.keys()).union(tree2.keys())
            for key in sorted(k for k in keys if k != "_hash"):
                subpath = f"{path}.{key}" if path else key
                if key not in tree1 or key not in tree2:
                    diffs.append(subpath)
                else:
                    diffs.extend(MerkleDiff.diff(tree1[key], tree2[key], subpath))
            if tree1.get("_hash") != tree2.get("_hash"):
                if path not in diffs:
                    diffs.append(path or "$")
            return diffs

        # List node
        if isinstance(tree1, list):
            min_len = min(len(tree1), len(tree2))
            for i in range(min_len - 1):  # skip last element (_hash)
                subpath = f"{path}[{i}]"
                diffs.extend(MerkleDiff.diff(tree1[i], tree2[i], subpath))
            if tree1[-1].get("_hash") != tree2[-1].get("_hash"):
                diffs.append(path or "$")
            return diffs

        return diffs
if __name__=='__main__':
    print("This module provides MerkleTree and MerkleDiff classes for JSON-like structures.")
    