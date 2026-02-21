"""Text chunking utilities for the knowledge base.

Splits text into overlapping chunks for search and RAG.
"""

from __future__ import annotations

from config import KB_CHUNK_SIZE, KB_CHUNK_OVERLAP


def chunk_text(
    text: str,
    chunk_size: int = KB_CHUNK_SIZE,
    overlap: int = KB_CHUNK_OVERLAP,
) -> list[str]:
    """Split text into overlapping chunks of approximately `chunk_size` words.

    Returns a list of text chunks. Each chunk overlaps with the next by
    `overlap` words to preserve context across boundaries.
    """
    words = text.split()

    if len(words) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks: list[str] = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())

        # Move forward by (chunk_size - overlap) words
        start += chunk_size - overlap

    return chunks
