"""Build grounded, boundary-safe chat messages for the Gradient AI narrative layer.

Only the caller-supplied ``report`` (the JSON already returned by
``build_guided_report``) is used as context — never a raw uploaded file — so a
client cannot smuggle off-allowlist genotype data into the model prompt. The
six category ids and questions mirror ``ANSWER_CATEGORIES`` in
frontend/src/App.jsx; the canonical question text lives here, not on the
client, so a request can only ever ask one of these six vetted questions.
"""
from __future__ import annotations

import json
from typing import Any

CATEGORY_QUESTIONS: dict[str, str] = {
    "interpretation": "What does my broad ancestry result actually say—and what does it not say?",
    "reference-panels": "Why is this result less specific for some populations?",
    "history": "What population history can explain overlap in broad regional results?",
    "traits": "How strong is the evidence for this non-medical trait in people like me?",
    "research": "Which research programs are improving representation for my broad population?",
    "limits": "What can this app not responsibly conclude from my file?",
}

SYSTEM_PROMPT = (
    "You are the Ancestry Audit Layer's explanation assistant. You interpret an "
    "already-computed, boundary-checked report — you never infer ancestry, "
    "diagnose or assess health risk, or state a person's exact ethnicity, "
    "community, or identity. Answer only from the JSON report context below "
    "and general population-genetics literature; if the context does not "
    "support a claim, say so plainly instead of guessing. Cite sources for "
    "any outside claim and stay within the report's non-medical, "
    "non-diagnostic scope."
)


def _safe_trait_items(traits: dict[str, Any]) -> list[dict[str, Any]]:
    items = traits.get("items")
    if not isinstance(items, list):
        return []
    return [
        {
            "name": item.get("name"),
            "rsid": item.get("rsid"),
            "measured": item.get("measured"),
            "interpretable": item.get("interpretable"),
            "interpretation": item.get("interpretation"),
            "evidence_note": item.get("evidence_note"),
        }
        for item in items
        if isinstance(item, dict)
    ]


def _safe_context(report: dict[str, Any]) -> dict[str, Any]:
    """Pull only the already-vetted fields a narrative answer may reference."""
    traits = report.get("traits") if isinstance(report.get("traits"), dict) else {}
    population = report.get("population_context") if isinstance(report.get("population_context"), dict) else {}
    boundaries = report.get("boundaries") if isinstance(report.get("boundaries"), dict) else {}
    studies = report.get("studies") if isinstance(report.get("studies"), dict) else {}
    study_items = studies.get("items") if isinstance(studies.get("items"), list) else []

    return {
        "population_context": {
            "original_label": population.get("original_label"),
            "canonical_label": population.get("canonical_label"),
            "recognized": population.get("recognized"),
            "inferred_from_dna": population.get("inferred_from_dna"),
        },
        "traits": _safe_trait_items(traits),
        "boundaries_policy": boundaries.get("policy_summary"),
        "study_programs": [
            study.get("name") for study in study_items if isinstance(study, dict) and study.get("name")
        ],
    }


def build_messages(category: str, report: dict[str, Any]) -> list[dict[str, str]]:
    """Return chat messages for ``gradient_client.explain`` for one fixed category.

    Raises ``KeyError`` if ``category`` is not one of ``CATEGORY_QUESTIONS`` —
    callers must validate against that mapping first.
    """
    question = CATEGORY_QUESTIONS[category]
    context = _safe_context(report if isinstance(report, dict) else {})
    user_content = (
        f"Question category: {category}\n"
        f"Question: {question}\n\n"
        "Report context (JSON, already boundary-checked):\n"
        f"{json.dumps(context, default=str)}"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
