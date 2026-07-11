"""Bridge to real research recruiting underrepresented populations.

Loads a curated, DATED static list (studies.json) and matches on the user's
broad population. This is NOT a live recruiting-status matcher — the data is
labelled illustrative/verify-before-acting to avoid sending people to closed
studies.

TODO(codex — expand): grow studies.json with entries per population.
"""
from __future__ import annotations

import json
import os

STUDIES_PATH = os.path.join(os.path.dirname(__file__), "..", "studies.json")


def load() -> dict:
    with open(STUDIES_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def match(population_label: str | None) -> list[dict]:
    """Return studies relevant to the population. TODO(P4): real matching."""
    data = load()
    return data.get("studies", [])
