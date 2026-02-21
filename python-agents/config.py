"""Configuration for the Python agent service."""

import os
from dotenv import load_dotenv

load_dotenv()

# Next.js app base URL (for MCP tool execution and KB API calls)
NEXTJS_BASE_URL = os.getenv("NEXTJS_BASE_URL", "http://localhost:3000")

# This service's port
AGENT_SERVICE_PORT = int(os.getenv("AGENT_SERVICE_PORT", "8100"))

# Max agent loop iterations per request
MAX_AGENT_ITERATIONS = int(os.getenv("MAX_AGENT_ITERATIONS", "5"))

# RAG settings
RAG_MAX_TOKENS = int(os.getenv("RAG_MAX_TOKENS", "4000"))
RAG_MAX_DOCS = int(os.getenv("RAG_MAX_DOCS", "5"))

# Knowledge Base limits
KB_MAX_FILES = 3
KB_MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
KB_MAX_URLS = 10
KB_MAX_CONTENT_CHARS = 50_000
KB_CHUNK_SIZE = 500  # words
KB_CHUNK_OVERLAP = 50  # words
KB_ALLOWED_FILE_TYPES = {".pdf", ".docx", ".txt", ".md", ".csv", ".xlsx"}
