"""Bridge broad ancestry labels to a dated, curated research-program list.

This is not a live recruiting-status service. Records explicitly distinguish
direct public enrollment from consortium or researcher-only pathways and always
tell users to verify the official page before sharing personal information.
"""
from __future__ import annotations

import json
import os
import re

STUDIES_PATH = os.path.join(os.path.dirname(__file__), "..", "studies.json")

POPULATION_ALIASES: dict[str, tuple[str, ...]] = {
    "african": (
        "african",
        "african american",
        "afro caribbean",
        "sub saharan",
        "west african",
        "east african",
        "southern african",
    ),
    "east asian": ("east asian", "northeast asian", "southeast asian", "chinese", "korean", "japanese"),
    "south asian": ("south asian", "indian", "pakistani", "bangladeshi", "sri lankan", "nepali"),
    "indigenous american": ("indigenous american", "native american", "american indian", "alaska native"),
    "hispanic latino": ("hispanic", "latino", "latina", "latinx", "latin american"),
    "middle eastern": ("middle eastern", "north african", "near eastern", "west asian"),
    "european": ("european",),
    "mixed": ("mixed", "admixed", "multiple ancestries"),
}


def load() -> dict:
    with open(STUDIES_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def _normalize(label: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (label or "").casefold()).strip()


def _population_key(population_label: str | None) -> str | None:
    normalized = _normalize(population_label)
    if not normalized:
        return None
    for key, aliases in POPULATION_ALIASES.items():
        if any(alias in normalized for alias in aliases):
            return key
    return None


def match(population_label: str | None) -> list[dict]:
    """Return relevant programs, falling back to broad public cohorts.

    Direct-enrollment records sort first. A broad label only selects potentially
    relevant programs; each record retains its geographic and identity-based
    eligibility so matching never implies that a user qualifies.
    """
    data = load()
    studies = data.get("studies", [])
    population_key = _population_key(population_label)

    if population_key:
        relevant = [
            study
            for study in studies
            if population_key in study.get("populations", [])
            or "all" in study.get("populations", [])
        ]
    else:
        default_ids = set(data.get("default_study_ids", []))
        relevant = [study for study in studies if study.get("id") in default_ids]

    matched: list[dict] = []
    for source_study in relevant:
        study = dict(source_study)
        study["pathway_type"] = (
            "public_enrollment"
            if study.get("direct_enrollment", False)
            else "consortium_or_data_pathway"
        )
        if population_key and population_key in study.get("populations", []):
            study["relationship_to_user"] = (
                f"Shown because the user supplied the broad context {population_label}. "
                "This is a research-literature match, not proof of eligibility or a DNA inference."
            )
        elif "all" in study.get("populations", []):
            study["relationship_to_user"] = (
                "Shown as a broad public cohort whose stated scope includes historically "
                "underrepresented communities; verify its current geography and eligibility."
            )
        else:
            study["relationship_to_user"] = (
                "Shown as a dated general research bridge; no population match was inferred from DNA."
            )
        matched.append(study)

    return sorted(
        matched,
        key=lambda study: (
            not study.get("direct_enrollment", False),
            study.get("name", ""),
        ),
    )
