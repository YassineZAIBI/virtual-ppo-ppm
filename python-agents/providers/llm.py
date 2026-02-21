"""Unified LLM provider client.

Supports: OpenAI, Anthropic, Azure, Gemini, Z-AI, Ollama.
Uses httpx for all HTTP calls — no heavy SDK dependencies.
"""

from __future__ import annotations

import httpx

from agents.types import LLMConfig, ChatMessage

# Default models per provider
DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-4",
    "anthropic": "claude-sonnet-4-20250514",
    "azure": "gpt-4",
    "gemini": "gemini-2.0-flash",
    "z-ai": "gpt-4",
    "ollama": "llama3",
}


async def chat(
    config: LLMConfig,
    messages: list[ChatMessage],
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Send a chat completion request to the configured LLM provider."""
    provider = config.provider
    model = config.model or DEFAULT_MODELS.get(provider, "gpt-4")

    if provider == "openai":
        return await _chat_openai(config, messages, model, temperature, max_tokens)
    elif provider == "anthropic":
        return await _chat_anthropic(config, messages, model, temperature, max_tokens)
    elif provider == "azure":
        return await _chat_azure(config, messages, model, temperature, max_tokens)
    elif provider == "gemini":
        return await _chat_gemini(config, messages, model, temperature, max_tokens)
    elif provider == "z-ai":
        return await _chat_zai(config, messages, model, temperature, max_tokens)
    elif provider == "ollama":
        return await _chat_ollama(config, messages, model, temperature, max_tokens)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------


async def _chat_openai(
    config: LLMConfig,
    messages: list[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        if not content:
            raise ValueError("OpenAI returned an empty response")
        return content


async def _chat_anthropic(
    config: LLMConfig,
    messages: list[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    system_prompt = None
    api_messages = []
    for m in messages:
        if m.role == "system":
            system_prompt = m.content
        else:
            api_messages.append({
                "role": "assistant" if m.role == "assistant" else "user",
                "content": m.content,
            })

    body: dict = {
        "model": model,
        "messages": api_messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if system_prompt:
        body["system"] = system_prompt

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": config.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        content = "".join(
            block["text"] for block in data.get("content", []) if block.get("type") == "text"
        )
        if not content:
            raise ValueError("Anthropic returned an empty response")
        return content


async def _chat_azure(
    config: LLMConfig,
    messages: list[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    endpoint = (config.api_endpoint or "").rstrip("/")
    url = f"{endpoint}/openai/deployments/{model}/chat/completions?api-version=2024-02-01"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            url,
            headers={
                "api-key": config.api_key,
                "Content-Type": "application/json",
            },
            json={
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        if not content:
            raise ValueError("Azure OpenAI returned an empty response")
        return content


async def _chat_gemini(
    config: LLMConfig,
    messages: list[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    system_instruction = None
    contents = []
    for m in messages:
        if m.role == "system":
            system_instruction = m.content
        else:
            contents.append({
                "role": "model" if m.role == "assistant" else "user",
                "parts": [{"text": m.content}],
            })

    body: dict = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config.api_key}"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, headers={"Content-Type": "application/json"}, json=body)
        resp.raise_for_status()
        data = resp.json()
        content = "".join(
            part["text"]
            for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        )
        if not content:
            raise ValueError("Gemini returned an empty response")
        return content


async def _chat_zai(
    config: LLMConfig,
    messages: list[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    base_url = (config.api_endpoint or "").rstrip("/")

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content")
            or data.get("content")
            or data.get("text")
            or ""
        )
        if not content:
            raise ValueError("Z-AI returned an empty response")
        return content


async def _chat_ollama(
    config: LLMConfig,
    messages: list[ChatMessage],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    endpoint = (config.api_endpoint or "http://localhost:11434").rstrip("/")

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{endpoint}/api/chat",
            headers={"Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                },
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data.get("message", {}).get("content", "")
        if not content:
            raise ValueError("Ollama returned an empty response")
        return content
