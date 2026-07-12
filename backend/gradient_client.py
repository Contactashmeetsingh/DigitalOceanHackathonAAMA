"""Gradient AI agent client with a serverless-inference fallback.

Two paths, one function:
  1. Agent (RAG) — POST $GRADIENT_AGENT_ENDPOINT/api/v1/chat/completions?agent=true
     with Bearer AGENT_ACCESS_KEY and body flags include_retrieval_info /
     include_guardrails_info / include_functions_info to get citations back.
     The `?agent=true` form is required — `scripts/verify_do.py` confirmed it
     live (FULL PASS with retrieval/citation evidence) against the deployed
     agent; the bare path without it does not route to the agent/RAG handler.
  2. Fallback — if GRADIENT_AGENT_ENDPOINT is unset, call serverless inference
     (https://inference.do-ai.run/v1/, OpenAI-compatible) with
     DIGITAL_OCEAN_MODEL_ACCESS_KEY, so the app runs before the KB/agent exists.
"""
from __future__ import annotations

import os
import re
import sys
from urllib.parse import urlparse

import requests
from openai import DefaultHttpxClient, OpenAI, OpenAIError

AGENT_ENDPOINT = os.environ.get("GRADIENT_AGENT_ENDPOINT", "").rstrip("/")
AGENT_ACCESS_KEY = os.environ.get("AGENT_ACCESS_KEY", "")
MODEL_ACCESS_KEY = os.environ.get("DIGITAL_OCEAN_MODEL_ACCESS_KEY", "")
INFERENCE_BASE_URL = "https://inference.do-ai.run/v1/"
FALLBACK_MODEL = "anthropic-claude-4.6-sonnet"

REQUEST_TIMEOUT_S = 90  # agent/inference calls are slow; gunicorn is set to 120


class NarrativeUnavailable(RuntimeError):
    """Raised when no configured Gradient AI path could produce an answer."""


def explain(messages: list[dict]) -> dict:
    """Return {"content": str, "citations": list}. Agent path if configured,
    else serverless-inference fallback. If the agent path is configured but
    fails (bad/rotated credential, agent not provisioned, network error), and
    a model access key is also available, falls back to serverless inference
    rather than failing the whole feature on one bad credential. Raises
    NarrativeUnavailable only if no path is configured or every configured
    path fails."""
    if AGENT_ENDPOINT and AGENT_ACCESS_KEY:
        try:
            return _via_agent(messages)
        except NarrativeUnavailable as error:
            print(f"[gradient_client] agent path failed, falling back: {error}", file=sys.stderr)
            if not MODEL_ACCESS_KEY:
                raise
    if MODEL_ACCESS_KEY:
        return _via_serverless(messages)
    raise NarrativeUnavailable(
        "No Gradient AI credentials are configured (need GRADIENT_AGENT_ENDPOINT + "
        "AGENT_ACCESS_KEY, or DIGITAL_OCEAN_MODEL_ACCESS_KEY)."
    )


def _via_agent(messages: list[dict]) -> dict:
    # The agent rejects system/developer turns outright ("agent instructions
    # are set via agent configuration", HTTP 400) — its own console-configured
    # instructions apply instead. The user turn already carries the question
    # and the safe report context, so it's the only turn the agent needs.
    agent_messages = [message for message in messages if message.get("role") not in ("system", "developer")]
    try:
        resp = requests.post(
            f"{AGENT_ENDPOINT}/api/v1/chat/completions?agent=true",
            headers={
                "Authorization": f"Bearer {AGENT_ACCESS_KEY}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            json={
                "messages": agent_messages,
                "stream": False,
                "include_retrieval_info": True,
            },
            timeout=(15, REQUEST_TIMEOUT_S),
        )
        if not resp.ok:
            # Body included (truncated) for diagnosis; the agent endpoint and
            # error responses do not echo back caller credentials.
            raise NarrativeUnavailable(
                f"Gradient agent request failed: HTTP {resp.status_code}: {resp.text[:300]}"
            )
        data = resp.json()
    except requests.RequestException as error:
        raise NarrativeUnavailable(f"Gradient agent request failed: {error}") from error

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise NarrativeUnavailable("Gradient agent returned an unexpected response shape.") from error

    return {
        "content": content,
        "citations": _extract_citations(data, content),
        "answer_mode": "agent_rag",
    }


def _via_serverless(messages: list[dict]) -> dict:
    # An explicit http_client avoids passing openai 1.51.0's default `proxies=`
    # kwarg into newer httpx releases, which removed that parameter and raise
    # `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`.
    client = OpenAI(
        base_url=INFERENCE_BASE_URL,
        api_key=MODEL_ACCESS_KEY,
        http_client=DefaultHttpxClient(timeout=REQUEST_TIMEOUT_S),
    )
    try:
        completion = client.chat.completions.create(model=FALLBACK_MODEL, messages=messages)
    except OpenAIError as error:
        raise NarrativeUnavailable(f"Serverless inference request failed: {error}") from error
    return {
        "content": completion.choices[0].message.content,
        "citations": [],
        "answer_mode": "serverless_fallback",
    }


def _valid_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip().rstrip(".,;:)]}")
    parsed = urlparse(candidate)
    return candidate if parsed.scheme in {"http", "https"} and parsed.netloc else None


def _extract_citations(data: dict, content: str = "") -> list[dict[str, str]]:
    """Best-effort parse of retrieval citations from an agent response.

    DO's `include_retrieval_info` payload shape isn't pinned down in the
    public docs, so this checks the plausible key names defensively and
    degrades to an empty list rather than raising if none match.
    """
    citations: list[dict[str, str]] = []
    seen: set[str] = set()

    def add(url_value: object, label_value: object = None) -> None:
        url = _valid_url(url_value)
        if not url or url in seen:
            return
        seen.add(url)
        label = label_value if isinstance(label_value, str) and label_value.strip() else url
        citations.append({"url": url, "label": label.strip()})

    def walk(value: object) -> None:
        if isinstance(value, dict):
            label = (
                value.get("source_name")
                or value.get("title")
                or value.get("name")
                or value.get("document_name")
            )
            for key in (
                "source_url",
                "url",
                "link",
                "document_url",
                "uri",
                "item_name",
                "filename",
            ):
                add(value.get(key), label)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(data.get("retrieval") or data.get("retrieval_info") or {})
    for inline_url in re.findall(r"https?://[^\s<>\"]+", content or ""):
        add(inline_url, "Source cited in the agent answer")
    return citations
