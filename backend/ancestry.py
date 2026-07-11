"""User-supplied broad population context; never ancestry inference.

The uploaded genotype data is deliberately absent from every function in this
module.  A broad label may provide context about evidence coverage, but it is
not treated as a genetic finding or an identity claim.
"""
from __future__ import annotations

import re
from typing import Any

from backend.boundaries import screen_requested_rsids

MAX_POPULATION_LABEL_LENGTH = 120

_POPULATION_CAVEATS = (
    "This broad label was supplied by the user; it was not inferred from the uploaded DNA.",
    "Broad research-population labels overlap, vary across datasets, and do not establish identity or ethnicity.",
)

_UNKNOWN_LABEL_CAVEAT = (
    "This label is not in the supported broad-label set, so it will not be used "
    "to tailor population context."
)

# Exact alias matching is intentional. Substring matching could turn a phrase
# such as "not South Asian" into a population assignment.
_POPULATION_ALIASES: dict[str, dict[str, object]] = {
    "african": {
        "label": "African",
        "aliases": (
            "african",
            "broadly african",
            "sub saharan african",
            "west african",
            "east african",
            "southern african",
            "african american",
            "afro caribbean",
        ),
    },
    "east_asian": {
        "label": "East Asian",
        "aliases": (
            "east asian",
            "broadly east asian",
            "northeast asian",
            "chinese",
            "japanese",
            "korean",
        ),
    },
    "southeast_asian": {
        "label": "Southeast Asian",
        "aliases": (
            "southeast asian",
            "broadly southeast asian",
            "filipino",
            "indonesian",
            "malaysian",
            "thai",
            "vietnamese",
        ),
    },
    "south_asian": {
        "label": "South Asian",
        "aliases": (
            "south asian",
            "broadly south asian",
            "central and south asian",
            "indian",
            "pakistani",
            "bangladeshi",
            "sri lankan",
            "nepali",
        ),
    },
    "indigenous_american": {
        "label": "Indigenous American",
        "aliases": (
            "indigenous american",
            "native american",
            "american indian",
            "alaska native",
        ),
    },
    "hispanic_latino": {
        "label": "Hispanic or Latino",
        "aliases": (
            "hispanic",
            "latino",
            "latina",
            "latinx",
            "hispanic or latino",
            "latin american",
        ),
    },
    "middle_eastern_north_african": {
        "label": "Middle Eastern or North African",
        "aliases": (
            "middle eastern",
            "north african",
            "middle eastern or north african",
            "mena",
            "near eastern",
            "west asian",
            "western asian and north african",
        ),
    },
    "european": {
        "label": "European",
        "aliases": ("european", "broadly european"),
    },
    "pacific_islander": {
        "label": "Pacific Islander",
        "aliases": (
            "pacific islander",
            "native hawaiian or pacific islander",
            "native hawaiian",
            "oceanian",
        ),
    },
    "mixed": {
        "label": "Mixed or multiple populations",
        "aliases": (
            "mixed",
            "admixed",
            "multiple ancestries",
            "multiple populations",
            "mixed or multiple populations",
        ),
    },
}


def _clean_original_label(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    printable = "".join(character if character.isprintable() else " " for character in value)
    cleaned = re.sub(r"\s+", " ", printable).strip()
    return cleaned[:MAX_POPULATION_LABEL_LENGTH] or None


def _matching_form(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).strip()


def normalize_population_label(population_label: object) -> dict[str, object]:
    """Normalize a user-supplied label into bounded, non-inferred context."""
    original_label = _clean_original_label(population_label)
    normalized = _matching_form(original_label)

    canonical_key: str | None = None
    canonical_label: str | None = None
    for key, record in _POPULATION_ALIASES.items():
        if normalized in record["aliases"]:
            canonical_key = key
            canonical_label = str(record["label"])
            break

    recognized = canonical_key is not None
    caveats = list(_POPULATION_CAVEATS)
    if not recognized:
        caveats.append(_UNKNOWN_LABEL_CAVEAT)

    return {
        "original_label": original_label,
        "canonical_key": canonical_key,
        "canonical_label": canonical_label,
        "recognized": recognized,
        "source": "user_supplied" if original_label is not None else "not_supplied",
        "inferred_from_dna": False,
        "caveats": caveats,
    }


def build_context(
    population_label: object,
    trait_hits: list[dict[str, Any]],
    requested_rsids: list[object] | tuple[object, ...] | None = None,
) -> dict[str, object]:
    """Assemble deterministic report context for the API or narrative layer."""
    return {
        "population": normalize_population_label(population_label),
        "trait_hits": list(trait_hits),
        "boundaries": screen_requested_rsids(requested_rsids),
    }
