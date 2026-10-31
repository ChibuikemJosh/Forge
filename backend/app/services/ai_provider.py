"""AI provider boundary for security investigation."""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Protocol


class AIProviderError(Exception):
    """Raised when an AI provider cannot produce a valid analysis."""


class AIProvider(Protocol):
    def analyze(self, prompt: str) -> dict[str, Any]:
        ...


class NullAIProvider:
    """Provider used when no AI backend is configured."""

    def analyze(self, prompt: str) -> dict[str, Any]:
        raise AIProviderError(
            "No AI provider is configured. Set FORGE_AI_API_URL and "
            "FORGE_AI_API_KEY to enable investigation."
        )


class OpenAICompatibleProvider:
    """Minimal OpenAI-compatible chat completion provider."""

    def __init__(
        self,
        api_url: str,
        api_key: str,
        model: str = "gpt-4o-mini",
        timeout: int = 120,
    ) -> None:
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def analyze(self, prompt: str) -> dict[str, Any]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
        }
        request = urllib.request.Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except Exception as error:
            raise AIProviderError(f"AI provider request failed: {error}") from error
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
        try:
            return json.loads(content)
        except json.JSONDecodeError as error:
            raise AIProviderError("AI provider did not return valid JSON.") from error


def get_default_ai_provider() -> AIProvider:
    api_url = os.environ.get("FORGE_AI_API_URL")
    api_key = os.environ.get("FORGE_AI_API_KEY")
    if not api_url or not api_key:
        return NullAIProvider()
    return OpenAICompatibleProvider(
        api_url=api_url,
        api_key=api_key,
        model=os.environ.get("FORGE_AI_MODEL", "gpt-4o-mini"),
    )
