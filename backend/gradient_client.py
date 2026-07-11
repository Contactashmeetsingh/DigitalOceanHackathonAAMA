"""Gradient AI agent client with a serverless-inference fallback.

Two paths, one function:
  1. Agent (RAG) — POST $GRADIENT_AGENT_ENDPOINT/api/v1/chat/completions with
     Bearer AGENT_ACCESS_KEY and body flags include_retrieval_info /
     include_guardrails_info / include_functions_info to get citations back.
     Use the /api/v1/ form (no `?agent=true`) — do not mix endpoint forms.
  2. Fallback — if GRADIENT_AGENT_ENDPOINT is unset, call serverless inference
     (https://inference.do-ai.run/v1/, OpenAI-compatible) with
     DIGITAL_OCEAN_MODEL_ACCESS_KEY, so the app runs before the KB/agent exists.

TODO(P2 — build fully): implement both paths, parse citations from
include_retrieval_info, surface a clear error on non-200.
"""
from __future__ import annotations

import os

import requests
from openai import OpenAI

AGENT_ENDPOINT = os.environ.get("GRADIENT_AGENT_ENDPOINT", "").rstrip("/")
AGENT_ACCESS_KEY = os.environ.get("AGENT_ACCESS_KEY", "")
MODEL_ACCESS_KEY = os.environ.get("DIGITAL_OCEAN_MODEL_ACCESS_KEY", "")
INFERENCE_BASE_URL = "https://inference.do-ai.run/v1/"
FALLBACK_MODEL = "anthropic-claude-4.6-sonnet"

REQUEST_TIMEOUT_S = 90  # agent/inference calls are slow; gunicorn is set to 120


def explain(messages: list[dict]) -> dict:
    """Return {"content": str, "citations": list}. Agent path if configured,
    else serverless-inference fallback."""
    if AGENT_ENDPOINT and AGENT_ACCESS_KEY:
        return _via_agent(messages)
    return _via_serverless(messages)


def _via_agent(messages: list[dict]) -> dict:
    resp = requests.post(
        f"{AGENT_ENDPOINT}/api/v1/chat/completions",
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
    # TODO(P2): map choices[0].message.content + retrieval citations precisely.
    return {"content": data["choices"][0]["message"]["content"], "citations": []}


def _via_serverless(messages: list[dict]) -> dict:
    client = OpenAI(base_url=INFERENCE_BASE_URL, api_key=MODEL_ACCESS_KEY)
    completion = client.chat.completions.create(model=FALLBACK_MODEL, messages=messages)
    return {"content": completion.choices[0].message.content, "citations": []}
