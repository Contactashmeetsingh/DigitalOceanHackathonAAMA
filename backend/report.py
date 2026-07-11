"""Deterministic guided-report assembly.

This module is deliberately independent of any live model or managed service.
The same validated upload always produces the same structured report. A separate
explanation service may add a cited narrative later, but it is never required for
the safe local report.
"""
from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from backend.ancestry import build_context
from backend.studies import load as load_studies
from backend.studies import match as match_studies
from backend.traits import ALLOWLIST, lookup as lookup_traits

REPORT_VERSION = "1.0"


def _honesty_rows(limitations: dict[str, dict[str, object]]) -> list[dict[str, object]]:
    """Convert keyed limitation records into stable, UI-friendly rows."""
    return [
        {
            "category": category,
            "title": record["title"],
            "allowed": record["allowed"],
            "response": record["answer"],
            "next_step": record["next_step"],
        }
        for category, record in limitations.items()
    ]


def _population_note(population: dict[str, object]) -> str:
    if population["recognized"]:
        return (
            f"The user-supplied label {population['canonical_label']} is used only "
            "to discuss evidence coverage and potentially relevant research links. "
            "It was not inferred from the uploaded DNA."
        )
    if population["source"] == "user_supplied":
        return (
            "The supplied label is outside this demo's supported broad-label set, "
            "so the report keeps its evidence discussion general."
        )
    return (
        "No broad population label was supplied. The report remains general and "
        "does not infer one from the uploaded DNA."
    )


def build_guided_report(
    parsed: dict[str, Any],
    population_label: object = None,
    requested_rsids: Iterable[object] | None = None,
) -> dict[str, object]:
    """Build the complete non-AI report from a validated parser result."""
    trait_items = lookup_traits(parsed)
    if requested_rsids is None:
        requested = None
    elif isinstance(requested_rsids, (str, bytes)):
        requested = [requested_rsids]
    else:
        requested = list(requested_rsids)
    context = build_context(population_label, trait_items, requested_rsids=requested)
    population = context["population"]
    boundary_results = context["boundaries"]

    measured_count = sum(bool(item["measured"]) for item in trait_items)
    interpretable_count = sum(bool(item.get("interpretable")) for item in trait_items)
    unavailable_count = len(trait_items) - measured_count
    study_label = population["canonical_label"] if population["recognized"] else None
    studies_metadata = load_studies()
    study_items = match_studies(study_label)

    coverage = dict(parsed.get("coverage", {}))
    coverage.setdefault("reference_build", parsed.get("reference_build"))
    by_chromosome = coverage.get("by_chromosome", {})
    if isinstance(by_chromosome, dict):
        coverage.setdefault(
            "chromosome_counts",
            {
                chromosome: counts.get("total", 0)
                for chromosome, counts in by_chromosome.items()
                if isinstance(counts, dict)
            },
        )

    requested_checks = [
        {"rsid": rsid, "allowed": True, "refused": False, "reason": None}
        for rsid in boundary_results["allowed_rsids"]
    ] + list(boundary_results["refusals"])

    return {
        "report_version": REPORT_VERSION,
        "coverage": coverage,
        "population_context": population,
        "traits": {
            "items": trait_items,
            "allowlist_count": len(ALLOWLIST),
            "measured_count": measured_count,
            "interpretable_count": interpretable_count,
            "withheld_count": measured_count - interpretable_count,
            "unavailable_count": unavailable_count,
        },
        "boundaries": {
            "policy": boundary_results["policy"],
            "policy_summary": (
                "Only the explicitly reviewed non-medical trait allowlist is "
                "interpreted. Every other marker is denied by default."
            ),
            "honesty": _honesty_rows(boundary_results["limitations"]),
            "requested_checks": requested_checks,
        },
        "transparency": {
            "headline": "Coverage is not the same as certainty",
            "explanation": (
                "A raw-data file shows which markers this chip measured. Trait "
                "associations can still transfer unevenly across populations when "
                "the underlying validation cohorts and reference panels are not "
                "representative. Each allowlisted result therefore keeps its source "
                "and evidence caveat attached."
            ),
            "population_note": _population_note(population),
        },
        "studies": {
            "curated_as_of": studies_metadata.get("curated_as_of"),
            "disclaimer": studies_metadata.get("disclaimer"),
            "items": study_items,
        },
    }
