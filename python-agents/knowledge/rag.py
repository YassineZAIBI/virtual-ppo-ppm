"""Unified Knowledge Retrieval (Confluence + Knowledge Base).

Extracts search keywords, queries multiple sources, and returns
ranked RAG context for injection into agent system prompts.
"""

from __future__ import annotations

import json
from typing import Any

from agents.types import ChatMessage, LLMConfig, RAGDocument
from config import NEXTJS_BASE_URL, RAG_MAX_DOCS, RAG_MAX_TOKENS
from providers.llm import chat as llm_chat
from tools.mcp_client import execute_tool


# ---------------------------------------------------------------------------
# Keyword extraction
# ---------------------------------------------------------------------------

_EXTRACT_PROMPT = """Extract 1-3 search keywords from the user's message for searching a knowledge base.
Return ONLY the keywords as a comma-separated list, nothing else.

User message: {message}

Keywords:"""


async def extract_keywords(message: str, llm_config: LLMConfig) -> list[str]:
    """Use a small LLM call to extract search keywords from the user message."""
    try:
        result = await llm_chat(
            llm_config,
            [ChatMessage(role="user", content=_EXTRACT_PROMPT.format(message=message[:500]))],
            temperature=0.1,
            max_tokens=50,
        )
        keywords = [kw.strip() for kw in result.strip().split(",") if kw.strip()]
        return keywords[:3]
    except Exception:
        # Fallback: use the first few significant words from the message
        words = message.split()
        stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "how", "can", "do", "i", "we", "my", "our"}
        keywords = [w for w in words if w.lower() not in stop_words][:3]
        return keywords


# ---------------------------------------------------------------------------
# Source 1: Confluence search
# ---------------------------------------------------------------------------


async def search_confluence(
    keywords: list[str],
    base_url: str | None = None,
) -> list[RAGDocument]:
    """Search Confluence via the MCP tool and return matching documents."""
    query = " ".join(keywords)
    result = await execute_tool(
        "confluence_search",
        {"query": query},
        base_url=base_url,
    )

    if result["is_error"]:
        return []

    docs: list[RAGDocument] = []
    try:
        data = json.loads(result["content"])
        results = data if isinstance(data, list) else data.get("results", [])

        for i, page in enumerate(results[:RAG_MAX_DOCS]):
            title = page.get("title", "Untitled")
            body = page.get("body", page.get("excerpt", ""))

            # Strip HTML if present
            if "<" in body:
                from bs4 import BeautifulSoup
                body = BeautifulSoup(body, "html.parser").get_text(separator=" ", strip=True)

            # Truncate to ~1000 chars
            if len(body) > 1000:
                body = body[:1000] + "..."

            docs.append(RAGDocument(
                source_type="confluence",
                source_id=page.get("id", f"conf_{i}"),
                source_name=title,
                content=body,
                relevance=1.0 - (i * 0.15),  # simple rank-based relevance
            ))
    except (json.JSONDecodeError, KeyError):
        pass

    return docs


# ---------------------------------------------------------------------------
# Source 2: Knowledge Base (user-uploaded files + scraped URLs)
# ---------------------------------------------------------------------------


def search_knowledge_base(
    keywords: list[str],
    documents: list[dict[str, Any]],
) -> list[RAGDocument]:
    """Search user's knowledge base documents using text matching.

    `documents` is a list of KnowledgeDocument dicts from the DB
    (passed in via the API request to avoid direct DB access from Python).
    """
    if not documents or not keywords:
        return []

    results: list[tuple[float, RAGDocument]] = []

    for doc in documents:
        chunks: list[str] = doc.get("content_chunks", [])
        if isinstance(chunks, str):
            try:
                chunks = json.loads(chunks)
            except json.JSONDecodeError:
                chunks = [doc.get("content", "")]

        # Score each chunk by keyword match count
        best_score = 0.0
        best_chunk = ""

        for chunk in chunks:
            lower_chunk = chunk.lower()
            matches = sum(1 for kw in keywords if kw.lower() in lower_chunk)
            score = matches / max(len(keywords), 1)

            if score > best_score:
                best_score = score
                best_chunk = chunk

        if best_score > 0:
            source_type = doc.get("source_type", "file")
            source_name = doc.get("source_name", "Unknown")

            # Truncate chunk
            if len(best_chunk) > 1000:
                best_chunk = best_chunk[:1000] + "..."

            results.append((best_score, RAGDocument(
                source_type=source_type,
                source_id=doc.get("id", ""),
                source_name=source_name,
                content=best_chunk,
                relevance=best_score,
            )))

    # Sort by relevance, return top N
    results.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in results[:RAG_MAX_DOCS]]


# ---------------------------------------------------------------------------
# Unified retrieval
# ---------------------------------------------------------------------------


async def retrieve_context(
    message: str,
    llm_config: LLMConfig,
    knowledge_docs: list[dict[str, Any]] | None = None,
    confluence_enabled: bool = False,
    base_url: str | None = None,
) -> list[RAGDocument]:
    """Retrieve relevant context from all available sources.

    Returns a combined list of RAG documents, capped at RAG_MAX_TOKENS
    total character content.
    """
    # Extract keywords
    keywords = await extract_keywords(message, llm_config)
    if not keywords:
        return []

    all_docs: list[RAGDocument] = []

    # Search Confluence if connected
    if confluence_enabled:
        confluence_docs = await search_confluence(keywords, base_url)
        all_docs.extend(confluence_docs)

    # Search Knowledge Base
    if knowledge_docs:
        kb_docs = search_knowledge_base(keywords, knowledge_docs)
        all_docs.extend(kb_docs)

    # Sort by relevance
    all_docs.sort(key=lambda d: d.relevance, reverse=True)

    # Cap at token limit (approximate: 1 token ~ 4 chars)
    max_chars = RAG_MAX_TOKENS * 4
    total_chars = 0
    capped_docs: list[RAGDocument] = []

    for doc in all_docs:
        doc_chars = len(doc.content)
        if total_chars + doc_chars > max_chars:
            break
        capped_docs.append(doc)
        total_chars += doc_chars

    return capped_docs


def format_rag_context(docs: list[RAGDocument]) -> str:
    """Format RAG documents into a text block for injection into system prompts."""
    if not docs:
        return ""

    parts = ["## Relevant Knowledge Base Documents\n"]
    for doc in docs:
        source_label = f"[{doc.source_type.title()}: {doc.source_name}]"
        parts.append(f"### {source_label}\n{doc.content}\n")

    return "\n".join(parts)
