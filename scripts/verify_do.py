#!/usr/bin/env python3
"""Verify DigitalOcean inference, control-plane, and RAG agent credentials.

All credentials are loaded from the repository's .env file or the process
environment. Secret values are never printed.
"""

from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from openai import DefaultHttpxClient, OpenAI


REQUIRED_ENV_VARS = (
    "DIGITAL_OCEAN_MODEL_ACCESS_KEY",
    "AGENT_ACCESS_KEY",
    "GRADIENT_AGENT_ENDPOINT",
    "DIGITALOCEAN_TOKEN",
)

INFERENCE_BASE_URL = "https://inference.do-ai.run/v1/"
PRIMARY_MODEL = "anthropic-claude-4.6-sonnet"
FALLBACK_MODEL = "llama3.3-70b-instruct"
KNOWLEDGE_BASES_URL = "https://api.digitalocean.com/v2/gen-ai/knowledge_bases"
RAG_QUESTION = (
    "What does a 'Broadly South Asian' ancestry result mean, and why is it "
    "vague? Cite your sources."
)
REQUEST_TIMEOUT_SECONDS = 90
AGENT_READ_TIMEOUT_SECONDS = 180


@dataclass
class CheckResult:
    status: str
    detail: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_credentials() -> dict[str, str]:
    load_dotenv(_repo_root() / ".env")
    return {name: os.getenv(name, "").strip() for name in REQUIRED_ENV_VARS}


def _status_code(exc: Exception) -> int | None:
    status = getattr(exc, "status_code", None)
    if isinstance(status, int):
        return status
    response = getattr(exc, "response", None)
    response_status = getattr(response, "status_code", None)
    return response_status if isinstance(response_status, int) else None


def _error_label(exc: Exception) -> str:
    """Return a useful error label without risking secret-bearing output."""
    status = _status_code(exc)
    if status in (401, 403):
        return f"HTTP {status}: key invalid or unauthorized"
    if status == 404:
        return "HTTP 404: resource or model not found"
    if status is not None:
        return f"HTTP {status} ({type(exc).__name__})"
    return type(exc).__name__


def _text_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
            else:
                text = getattr(item, "text", None)
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts).strip()
    return ""


def check_serverless(model_key: str) -> CheckResult:
    print("\nCHECK 1 — Serverless inference key")
    client = OpenAI(
        base_url=INFERENCE_BASE_URL,
        api_key=model_key,
        # openai 1.51.0 and newer httpx releases are compatible when an
        # explicit SDK HTTP client is supplied (avoids the removed proxies= kwarg).
        http_client=DefaultHttpxClient(timeout=REQUEST_TIMEOUT_SECONDS),
    )
    last_error: Exception | None = None

    for index, model in enumerate((PRIMARY_MODEL, FALLBACK_MODEL)):
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Reply with exactly: OK"}],
                max_completion_tokens=16,
            )
            answer = _text_content(completion.choices[0].message.content)
            if not answer:
                print(f"  {model}: HTTP 200 but the text response was empty")
                last_error = RuntimeError("empty text response")
                continue

            served_model = getattr(completion, "model", None) or model
            print(f"  PASS: non-empty response served by {served_model}")
            client.close()
            return CheckResult("PASS", f"served by {served_model}")
        except Exception as exc:  # Keep the fallback diagnostic running.
            last_error = exc
            status = _status_code(exc)
            if status in (401, 403):
                print(f"  FAIL: {_error_label(exc)}")
                client.close()
                return CheckResult("FAIL", "model access key invalid or unauthorized")

            if index == 0:
                if status == 404:
                    print(
                        f"  NOTE: {PRIMARY_MODEL} returned HTTP 404; the model ID "
                        f"may be unavailable. Retrying {FALLBACK_MODEL}."
                    )
                else:
                    print(
                        f"  NOTE: {PRIMARY_MODEL} failed ({_error_label(exc)}). "
                        f"Retrying {FALLBACK_MODEL}."
                    )
                continue

            print(f"  FAIL: {model} failed ({_error_label(exc)})")

    client.close()
    return CheckResult(
        "FAIL",
        f"both models failed ({_error_label(last_error)})"
        if last_error
        else "both models failed",
    )


def _extract_knowledge_bases(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    knowledge_bases = payload.get("knowledge_bases", [])
    if not isinstance(knowledge_bases, list):
        return []
    return [item for item in knowledge_bases if isinstance(item, dict)]


def _kb_indexing_status(kb: dict[str, Any]) -> str:
    last_job = kb.get("last_indexing_job")
    if isinstance(last_job, dict):
        raw_status = str(last_job.get("status") or "").strip()
        raw_phase = str(last_job.get("phase") or "").strip()
        combined = " ".join((raw_status, raw_phase)).upper()

        if any(word in combined for word in ("COMPLETED", "COMPLETE", "SUCCEEDED", "SUCCESS")):
            return f"INDEXED ({raw_status or raw_phase})"
        if raw_status or raw_phase:
            return raw_status or raw_phase

        completed = last_job.get("completed_datasources")
        total = last_job.get("total_datasources")
        if isinstance(completed, int) and isinstance(total, int) and total > 0:
            if completed == total:
                return f"INDEXED ({completed}/{total} data sources)"
            return f"INDEXING ({completed}/{total} data sources)"

    # Preserve any newer API field rather than hiding it as unknown.
    for field in ("indexing_status", "status", "phase"):
        value = kb.get(field)
        if value not in (None, ""):
            return str(value)
    return "UNKNOWN"


def check_control_plane(token: str) -> tuple[CheckResult, dict[str, str]]:
    print("\nCHECK 2 — Control-plane token and knowledge bases")
    response = requests.get(
        KNOWLEDGE_BASES_URL,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    if response.status_code in (401, 403):
        print(
            f"  FAIL: HTTP {response.status_code} — token invalid or missing "
            "the required scope"
        )
        return CheckResult("FAIL", "token invalid or lacks scope"), {}
    if response.status_code != 200:
        print(f"  FAIL: HTTP {response.status_code}")
        return CheckResult("FAIL", f"HTTP {response.status_code}"), {}

    try:
        payload = response.json()
    except ValueError:
        print("  FAIL: HTTP 200 response was not valid JSON")
        return CheckResult("FAIL", "response was not valid JSON"), {}

    if not isinstance(payload, dict):
        print("  FAIL: HTTP 200 JSON response was not an object")
        return CheckResult("FAIL", "unexpected JSON shape"), {}

    knowledge_bases = _extract_knowledge_bases(payload)
    statuses: dict[str, str] = {}
    print(f"  PASS: found {len(knowledge_bases)} knowledge base(s)")
    if not knowledge_bases:
        print("  Knowledge bases: none")
    for kb in knowledge_bases:
        name = str(kb.get("name") or "<unnamed>")
        status = _kb_indexing_status(kb)
        statuses[name] = status
        print(f"  - {name}: {status}")

    genetics = next(
        (
            status
            for name, status in statuses.items()
            if name.casefold() == "genetics-literacy-kb"
        ),
        None,
    )
    detail = f"{len(knowledge_bases)} KBs"
    if genetics is not None:
        detail += f"; genetics-literacy-kb: {genetics}"
    else:
        detail += "; genetics-literacy-kb: NOT FOUND"
    return CheckResult("PASS", detail), statuses


def _json_key_paths(value: Any, prefix: str = "") -> set[str]:
    paths: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            paths.add(path)
            paths.update(_json_key_paths(child, path))
    elif isinstance(value, list):
        list_prefix = f"{prefix}[]"
        for child in value:
            paths.update(_json_key_paths(child, list_prefix))
    return paths


def _meaningful(value: Any) -> bool:
    if value in (None, ""):
        return False
    if isinstance(value, dict):
        return any(_meaningful(child) for child in value.values())
    if isinstance(value, list):
        return any(_meaningful(child) for child in value)
    return True


def _structured_evidence(value: Any, prefix: str = "") -> list[str]:
    evidence: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            normalized = key.casefold().replace("-", "_")
            if any(
                marker in normalized
                for marker in (
                    "citation",
                    "retrieval",
                    "source",
                    "reference",
                    "knowledge_base",
                    "document",
                    "chunk",
                )
            ) and _meaningful(child):
                evidence.append(path)
            evidence.extend(_structured_evidence(child, path))
    elif isinstance(value, list):
        for child in value:
            evidence.extend(_structured_evidence(child, f"{prefix}[]"))
    return evidence


def _answer_has_citations(answer: str) -> bool:
    patterns = (
        r"https?://\S+",
        r"\[[^\]]+\]\(https?://[^)]+\)",
        r"(?:^|\n)\s*(?:sources?|references?|citations?)\s*:",
        r"\[(?:\d{1,3}|source\s*\d+)\]",
    )
    return any(re.search(pattern, answer, flags=re.IGNORECASE) for pattern in patterns)


def _extract_agent_answer(payload: Any) -> str:
    if not isinstance(payload, dict):
        return ""
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        return ""
    message = choices[0].get("message")
    if not isinstance(message, dict):
        return ""
    return _text_content(message.get("content"))


def check_rag_agent(endpoint: str, agent_key: str) -> CheckResult:
    print("\nCHECK 3 — RAG agent endpoint and key")
    url = f"{endpoint.rstrip('/')}/api/v1/chat/completions?agent=true"
    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {agent_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        json={
            "messages": [{"role": "user", "content": RAG_QUESTION}],
            "stream": False,
            "include_retrieval_info": True,
        },
        timeout=(15, AGENT_READ_TIMEOUT_SECONDS),
    )

    if response.status_code in (401, 403):
        print(f"  FAIL: HTTP {response.status_code} — agent key invalid or unauthorized")
        return CheckResult("FAIL", "agent access key invalid or unauthorized")
    if response.status_code == 404:
        print("  FAIL: HTTP 404 — endpoint is wrong or the agent is not deployed")
        return CheckResult("FAIL", "endpoint wrong or agent not deployed")
    if response.status_code != 200:
        print(f"  FAIL: HTTP {response.status_code}")
        return CheckResult("FAIL", f"HTTP {response.status_code}")

    try:
        payload = response.json()
    except ValueError:
        print("  FAIL: HTTP 200 response was not valid JSON")
        return CheckResult("FAIL", "response was not valid JSON")

    key_paths = sorted(_json_key_paths(payload))
    print("  Response JSON keys:")
    if key_paths:
        for path in key_paths:
            print(f"    - {path}")
    else:
        print("    - <none>")

    answer = _extract_agent_answer(payload)
    if not answer:
        print("  FAIL: HTTP 200 response contained no answer text")
        return CheckResult("FAIL", "empty answer")

    preview = answer[:500]
    if len(answer) > 500:
        preview += "..."
    print("  Answer preview (first ~500 chars):")
    print("  " + preview.replace("\n", "\n  "))

    structured = sorted(set(_structured_evidence(payload)))
    inline_citations = _answer_has_citations(answer)
    if structured:
        print("  Retrieval/citation evidence fields: " + ", ".join(structured))
    if inline_citations:
        print("  Citation/reference evidence also appears in the answer text")

    if structured or inline_citations:
        print("  FULL PASS: answered with retrieval/citation evidence")
        return CheckResult("FULL PASS", "citations/retrieval evidence present")

    print(
        "  PARTIAL: agent answered, but no citation/retrieval evidence was found; "
        "the KB may not be attached/indexed or retrieval may not have triggered"
    )
    return CheckResult("PARTIAL", "answered; no citation/retrieval evidence")


def check_key_wiring(credentials: dict[str, str]) -> CheckResult:
    print("\nCHECK 4 — Key wiring sanity")
    endpoint = credentials["GRADIENT_AGENT_ENDPOINT"]
    parsed = urlparse(endpoint if "://" in endpoint else f"//{endpoint}")
    hostname = (parsed.hostname or "").casefold()
    problems: list[str] = []

    if parsed.scheme.casefold() != "https":
        problems.append("GRADIENT_AGENT_ENDPOINT must use HTTPS")
    if not (hostname == "agents.do-ai.run" or hostname.endswith(".agents.do-ai.run")):
        problems.append(
            "GRADIENT_AGENT_ENDPOINT must use agents.do-ai.run "
            "(not inference.do-ai.run)"
        )

    secret_names = (
        "DIGITAL_OCEAN_MODEL_ACCESS_KEY",
        "AGENT_ACCESS_KEY",
        "DIGITALOCEAN_TOKEN",
    )
    for index, left in enumerate(secret_names):
        for right in secret_names[index + 1 :]:
            if credentials[left] == credentials[right]:
                problems.append(f"{left} and {right} are identical")

    if problems:
        for problem in problems:
            print(f"  FLAG: {problem}")
        return CheckResult("FLAG", "; ".join(problems))

    print("  OK: Check 1 uses DIGITAL_OCEAN_MODEL_ACCESS_KEY")
    print("  OK: Check 3 uses AGENT_ACCESS_KEY")
    print("  OK: agent endpoint uses agents.do-ai.run")
    print("  OK: model, agent, and control-plane credential values are distinct")
    return CheckResult("OK", "keys separated; agent endpoint host valid")


def _guarded_check(name: str, function: Any, *args: Any) -> Any:
    try:
        return function(*args)
    except Exception as exc:
        print(f"  FAIL: unexpected {_error_label(exc)}")
        if function is check_control_plane:
            return CheckResult("FAIL", f"unexpected {_error_label(exc)}"), {}
        return CheckResult("FAIL", f"unexpected {_error_label(exc)}")


def _genetics_status(statuses: dict[str, str]) -> str | None:
    return next(
        (
            status
            for name, status in statuses.items()
            if name.casefold() == "genetics-literacy-kb"
        ),
        None,
    )


def main() -> int:
    credentials = _load_credentials()
    missing = [name for name, value in credentials.items() if not value]
    if missing:
        print("Missing required DigitalOcean credentials:")
        for name in missing:
            print(f"MISSING: {name}")
        print("No checks were run.")
        return 2

    check1 = _guarded_check(
        "CHECK 1 — Serverless inference key",
        check_serverless,
        credentials["DIGITAL_OCEAN_MODEL_ACCESS_KEY"],
    )
    check2, kb_statuses = _guarded_check(
        "CHECK 2 — Control-plane token and knowledge bases",
        check_control_plane,
        credentials["DIGITALOCEAN_TOKEN"],
    )
    check3 = _guarded_check(
        "CHECK 3 — RAG agent endpoint and key",
        check_rag_agent,
        credentials["GRADIENT_AGENT_ENDPOINT"],
        credentials["AGENT_ACCESS_KEY"],
    )
    check4 = _guarded_check(
        "CHECK 4 — Key wiring sanity",
        check_key_wiring,
        credentials,
    )

    print("\nFINAL SUMMARY")
    print(f"CHECK 1  Serverless inference     {check1.status} ({check1.detail})")
    print(f"CHECK 2  Control-plane token      {check2.status} ({check2.detail})")
    print(f"CHECK 3  RAG agent                {check3.status} ({check3.detail})")
    print(f"CHECK 4  Key wiring               {check4.status} ({check4.detail})")

    all_good = (
        check1.status == "PASS"
        and check2.status == "PASS"
        and check3.status == "FULL PASS"
        and check4.status == "OK"
    )
    if all_good:
        print("\nALL CREDENTIALS GOOD — safe to resume feature tasks.")
        return 0

    genetics_status = _genetics_status(kb_statuses)
    genetics_not_indexed = genetics_status is not None and not genetics_status.startswith(
        "INDEXED"
    )
    if check3.status == "PARTIAL" and genetics_not_indexed:
        print(
            "\nRAG is PARTIAL because genetics-literacy-kb is not indexed "
            f"({genetics_status}). Finish KB indexing in the DigitalOcean console; "
            "do not change code."
        )
    elif check3.status == "PARTIAL":
        print(
            "\nThe agent is reachable, but RAG evidence is missing. Verify that the "
            "knowledge base is attached and that retrieval is enabled for the agent."
        )
    return 1


if __name__ == "__main__":
    sys.exit(main())
