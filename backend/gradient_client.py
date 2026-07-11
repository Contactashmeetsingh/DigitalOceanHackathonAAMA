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
        except NarrativeUnavailable:
            if not MODEL_ACCESS_KEY:
                raise
    if MODEL_ACCESS_KEY:
        return _via_serverless(messages)
    raise NarrativeUnavailable(
        "No Gradient AI credentials are configured (need GRADIENT_AGENT_ENDPOINT + "
        "AGENT_ACCESS_KEY, or DIGITAL_OCEAN_MODEL_ACCESS_KEY)."
    )


def _via_agent(messages: list[dict]) -> dict:
    try:
        resp = requests.post(
            f"{AGENT_ENDPOINT}/api/v1/chat/completions?agent=true",
            headers={"Authorization": f"Bearer {AGENT_ACCESS_KEY}"},
            json={
                "messages": messages,
                "stream": False,
                "include_retrieval_info": True,
                "include_guardrails_info": True,
                "include_functions_info": True,
            },
            timeout=REQUEST_TIMEOUT_S,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as error:
        raise NarrativeUnavailable(f"Gradient agent request failed: {error}") from error

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise NarrativeUnavailable("Gradient agent returned an unexpected response shape.") from error

    return {"content": content, "citations": _extract_citations(data)}


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
    return {"content": completion.choices[0].message.content, "citations": []}


def _extract_citations(data: dict) -> list[dict[str, str]]:
    """Best-effort parse of retrieval citations from an agent response.

    DO's `include_retrieval_info` payload shape isn't pinned down in the
    public docs, so this checks the plausible key names defensively and
    degrades to an empty list rather than raising if none match.
    """
    retrieval = data.get("retrieval") or data.get("retrieval_info") or {}
    if not isinstance(retrieval, dict):
        return []
    chunks = (
        retrieval.get("retrieved_data")
        or retrieval.get("results")
        or retrieval.get("citations")
        or retrieval.get("sources")
        or []
    )
    if not isinstance(chunks, list):
        return []

    citations: list[dict[str, str]] = []
    seen: set[str] = set()
    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        url = chunk.get("source_url") or chunk.get("url") or chunk.get("link")
        if not url or url in seen:
            continue
        seen.add(url)
        label = chunk.get("source_name") or chunk.get("title") or chunk.get("name") or url
        citations.append({"url": url, "label": label})
    return citations
