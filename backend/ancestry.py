"""Normalize the broad ancestry label and build the query context for the agent.

We do NOT infer ancestry from raw genotypes. This module works with the broad
category the user's existing test already gave them (e.g. "Broadly South Asian"),
normalizes it, and assembles the context object the Gradient agent explains.

TODO(P1 — build fully):
  - normalize free-text ancestry labels to canonical population keys
  - assemble QueryContext {population, trait_hits, refusals} for gradient_client
"""
from __future__ import annotations


def build_context(population_label: str | None, trait_hits: list[dict]) -> dict:
    """Assemble the context the agent narrates. TODO(P1): flesh out."""
    return {
        "population_label": population_label,
        "trait_hits": trait_hits,
    }
