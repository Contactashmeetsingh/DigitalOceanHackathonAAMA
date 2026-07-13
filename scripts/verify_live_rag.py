#!/usr/bin/env python3
"""Verify all six live narrative categories use agent RAG with citations.

This sends only a small synthetic, boundary-checked report. It never uploads or
prints genotype data, credentials, complete answers, or retrieval chunks.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.narrative import CATEGORY_QUESTIONS


DEFAULT_BASE_URL = "https://jellyfish-app-jbnoq.ondigitalocean.app"
SAFE_REPORT = {
    "population_context": {
        "original_label": "Broadly South Asian",
        "canonical_label": "South Asian",
        "recognized": True,
        "inferred_from_dna": False,
    },
    "traits": {
        "items": [
            {
                "name": "Lactase persistence",
                "rsid": "rs4988235",
                "measured": True,
                "interpretable": True,
                "interpretation": "Illustrative non-medical trait result.",
                "evidence_note": "Evidence transfer varies across populations.",
            }
        ]
    },
    "boundaries": {
        "policy_summary": (
            "Only reviewed non-medical markers are interpreted; health risk, "
            "exact ethnicity, and ancestry re-inference are refused."
        )
    },
    "studies": {
        "items": [
            {"name": "GenomeAsia 100K"},
            {"name": "All of Us Research Program"},
        ]
    },
}


def summarize_response(category: str, response: requests.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    citations = payload.get("citations") if isinstance(payload.get("citations"), list) else []
    content = payload.get("content") if isinstance(payload.get("content"), str) else ""
    return {
        "category": category,
        "http": response.status_code,
        "mode": payload.get("answer_mode"),
        "citations": len(citations),
        "answer_chars": len(content),
        "passed": (
            response.status_code == 200
            and payload.get("answer_mode") == "agent_rag"
            and bool(citations)
            and bool(content.strip())
        ),
    }


def verify(base_url: str, timeout: int, categories: list[str] | None = None) -> list[dict[str, Any]]:
    url = f"{base_url.rstrip('/')}/api/narrative"
    results = []
    for category in categories or list(CATEGORY_QUESTIONS):
        try:
            response = requests.post(
                url,
                json={"category": category, "report": SAFE_REPORT},
                timeout=(15, timeout),
            )
            result = summarize_response(category, response)
        except requests.RequestException:
            result = {
                "category": category,
                "http": 0,
                "mode": None,
                "citations": 0,
                "answer_chars": 0,
                "passed": False,
            }
        results.append(result)
        state = "PASS" if result["passed"] else "FAIL"
        print(
            f"{state}: {category}: HTTP {result['http']}, "
            f"mode={result['mode']}, citations={result['citations']}, "
            f"answer_chars={result['answer_chars']}"
        )
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--timeout", type=int, default=210)
    parser.add_argument(
        "--category",
        action="append",
        choices=list(CATEGORY_QUESTIONS),
        help="Verify only this category; repeat to select multiple categories.",
    )
    args = parser.parse_args()
    results = verify(args.base_url, args.timeout, args.category)
    passed = sum(bool(result["passed"]) for result in results)
    print(f"SUMMARY: {passed}/{len(results)} categories returned agent RAG with citations")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
