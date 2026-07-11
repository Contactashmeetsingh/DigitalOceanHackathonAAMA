"""Illustrative multi-profile comparison graph for the 3D cohort visualization.

This module never compares a user to real other people's genomes — no such
consented dataset exists (the repository has three open-consent PGP demo
files, not "100+ people"). Instead it procedurally generates a labeled
*synthetic* cohort whose per-trait genotype distribution is drawn from
published, cited population allele-frequency literature, using the same
broad-population buckets already defined in ``backend.ancestry``. Every
synthetic node is tagged ``is_synthetic: true`` and the response carries a
top-level disclaimer — callers must not present these as real uploaded
genomes.

Generation is deterministic: seeding from the already-computed report's
``stats`` means the same analyzed file always produces the same graph,
matching the deterministic-report convention used throughout this project.
"""
from __future__ import annotations

import random
from typing import Any

from backend.traits import ALLOWLIST, TAS2R38_RSIDS

DEFAULT_COHORT_SIZE = 120

# Illustrative cohort-composition shares. Anchored to the cited TOPMed r2
# reference-panel breakdown (Taliun et al., Nature 2021 — see
# frontend/src/referencePanelData.js) for the five groups it reports; the
# remaining ancestry.py buckets are given a small, explicitly-illustrative
# share so every canonical population key is representable in the demo.
# These are cohort-visualization weights, not a claim about global population
# distribution.
GROUP_SHARES: dict[str, float] = {
    "european": 0.40,
    "african": 0.20,
    "hispanic_latino": 0.14,
    "east_asian": 0.10,
    "south_asian": 0.06,
    "southeast_asian": 0.04,
    "middle_eastern_north_african": 0.03,
    "indigenous_american": 0.02,
    "pacific_islander": 0.01,
}

TOPMED_R2_SOURCE = "https://www.nature.com/articles/s41586-021-03205-y"

# Approximate, cited genotype-class frequencies per broad group for the
# allowlisted traits that have documented, replicated population differences.
# Values are illustrative order-of-magnitude bands, not precise per-country
# statistics, and are only used to draw a plausible synthetic cohort — never
# presented as a specific population's exact allele frequency.
LACTASE_FREQUENCIES: dict[str, dict[str, float]] = {
    # rs4988235 — European persistence allele (A) frequency by broad group.
    # Bersaglieri et al., AJHG (2004); Tishkoff et al., Nat Genet (2007).
    "european": {"AA": 0.55, "AG": 0.35, "GG": 0.10},
    "middle_eastern_north_african": {"AA": 0.25, "AG": 0.35, "GG": 0.40},
    "south_asian": {"AA": 0.10, "AG": 0.25, "GG": 0.65},
    "african": {"AA": 0.05, "AG": 0.15, "GG": 0.80},
    "hispanic_latino": {"AA": 0.15, "AG": 0.30, "GG": 0.55},
    "indigenous_american": {"AA": 0.02, "AG": 0.08, "GG": 0.90},
    "east_asian": {"AA": 0.02, "AG": 0.08, "GG": 0.90},
    "southeast_asian": {"AA": 0.02, "AG": 0.08, "GG": 0.90},
    "pacific_islander": {"AA": 0.02, "AG": 0.08, "GG": 0.90},
}
EARWAX_FREQUENCIES: dict[str, dict[str, float]] = {
    # rs17822931 — dry-earwax allele (T) frequency by broad group.
    # Yoshiura et al., Nat Genet (2006) worldwide allele-frequency survey.
    "east_asian": {"TT": 0.80, "CT": 0.17, "CC": 0.03},
    "southeast_asian": {"TT": 0.55, "CT": 0.30, "CC": 0.15},
    "indigenous_american": {"TT": 0.60, "CT": 0.30, "CC": 0.10},
    "pacific_islander": {"TT": 0.30, "CT": 0.35, "CC": 0.35},
    "european": {"TT": 0.02, "CT": 0.15, "CC": 0.83},
    "african": {"TT": 0.01, "CT": 0.09, "CC": 0.90},
    "south_asian": {"TT": 0.10, "CT": 0.25, "CC": 0.65},
    "middle_eastern_north_african": {"TT": 0.03, "CT": 0.17, "CC": 0.80},
    "hispanic_latino": {"TT": 0.20, "CT": 0.30, "CC": 0.50},
}
ACTN3_FREQUENCIES: dict[str, dict[str, float]] = {
    # rs1815739 — 577X-null allele (T) frequency by broad group.
    # Yang et al., AJHG (2003); Döring et al., J Sports Sci (2010).
    "east_asian": {"TT": 0.25, "CT": 0.45, "CC": 0.30},
    "southeast_asian": {"TT": 0.22, "CT": 0.45, "CC": 0.33},
    "european": {"TT": 0.18, "CT": 0.50, "CC": 0.32},
    "south_asian": {"TT": 0.15, "CT": 0.48, "CC": 0.37},
    "middle_eastern_north_african": {"TT": 0.15, "CT": 0.48, "CC": 0.37},
    "hispanic_latino": {"TT": 0.12, "CT": 0.45, "CC": 0.43},
    "indigenous_american": {"TT": 0.10, "CT": 0.40, "CC": 0.50},
    "pacific_islander": {"TT": 0.10, "CT": 0.40, "CC": 0.50},
    "african": {"TT": 0.01, "CT": 0.12, "CC": 0.87},
}
TAS2R38_FREQUENCIES: dict[str, dict[str, float]] = {
    # Combined-haplotype PAV/AVI class frequency by broad group.
    # Wooding et al., AJHG (2004); Bufe et al., Curr Biol (2005).
    "african": {"pav_pav": 0.55, "avi_avi": 0.10, "other": 0.35},
    "european": {"pav_pav": 0.30, "avi_avi": 0.25, "other": 0.45},
    "middle_eastern_north_african": {"pav_pav": 0.32, "avi_avi": 0.22, "other": 0.46},
    "south_asian": {"pav_pav": 0.30, "avi_avi": 0.20, "other": 0.50},
    "hispanic_latino": {"pav_pav": 0.28, "avi_avi": 0.22, "other": 0.50},
    "indigenous_american": {"pav_pav": 0.25, "avi_avi": 0.25, "other": 0.50},
    "east_asian": {"pav_pav": 0.20, "avi_avi": 0.30, "other": 0.50},
    "southeast_asian": {"pav_pav": 0.22, "avi_avi": 0.28, "other": 0.50},
    "pacific_islander": {"pav_pav": 0.25, "avi_avi": 0.25, "other": 0.50},
}

# Traits without a documented, portable population-frequency gradient (photic
# sneeze direction reversed between cohorts; cilantro was only characterized
# in a predominantly European sample) are drawn uniformly and excluded from
# similarity scoring, matching traits.py's own generalizability caveats.
_UNIFORM_RSIDS = {"rs10427255", "rs72921001"}


def _weighted_choice(rng: random.Random, frequencies: dict[str, float]) -> str:
    genotypes = list(frequencies.keys())
    weights = list(frequencies.values())
    return rng.choices(genotypes, weights=weights, k=1)[0]


def _seed_from_report(report: dict[str, Any]) -> int:
    stats = report.get("stats") or {}
    parts = (
        stats.get("input_rows"),
        stats.get("called"),
        stats.get("no_calls"),
        stats.get("duplicates"),
        report.get("chip_version"),
    )
    return hash(tuple(parts)) & 0xFFFFFFFF


def user_trait_genotypes(report: dict[str, Any]) -> dict[str, str | None]:
    """Extract this user's own measured, interpretable genotype per rsid."""
    genotypes: dict[str, str | None] = {}
    for item in (report.get("traits") or {}).get("items", []):
        if not item.get("interpretable"):
            continue
        rsid = item.get("rsid")
        genotype = item.get("genotype")
        if rsid in TAS2R38_RSIDS or rsid == "/".join(TAS2R38_RSIDS):
            status = item.get("interpretation_status")
            if status == "interpreted" and isinstance(item.get("marker_calls"), dict):
                calls = item["marker_calls"]
                pav = all(
                    "".join(sorted(calls.get(r, ""))) == "".join(sorted(v))
                    for r, v in {"rs713598": "GG", "rs1726866": "GG", "rs10246939": "CC"}.items()
                )
                genotypes["tas2r38"] = "pav_pav" if pav else "avi_avi"
            continue
        if isinstance(genotype, str):
            genotypes[rsid] = "".join(sorted(genotype))
    return genotypes


def _draw_synthetic_genotypes(rng: random.Random, group: str) -> dict[str, str]:
    genotypes: dict[str, str] = {
        "rs4988235": _weighted_choice(rng, LACTASE_FREQUENCIES[group]),
        "rs17822931": _weighted_choice(rng, EARWAX_FREQUENCIES[group]),
        "rs1815739": _weighted_choice(rng, ACTN3_FREQUENCIES[group]),
        "tas2r38": _weighted_choice(rng, TAS2R38_FREQUENCIES[group]),
    }
    for rsid in _UNIFORM_RSIDS:
        genotypes[rsid] = rng.choice(list(ALLOWLIST[rsid]["genotype_meanings"].keys()))
    return genotypes


def _similarity(user_genotypes: dict[str, str | None], node_genotypes: dict[str, str]) -> float:
    comparable = [rsid for rsid in node_genotypes if rsid in user_genotypes and rsid not in _UNIFORM_RSIDS]
    if not comparable:
        return 0.0
    matches = sum(1 for rsid in comparable if user_genotypes[rsid] == node_genotypes[rsid])
    return round(matches / len(comparable), 4)


def build_comparison_graph(
    report: dict[str, Any], cohort_size: int = DEFAULT_COHORT_SIZE
) -> dict[str, Any]:
    """Build 3d-force-graph-compatible ``{nodes, links}`` for the cohort view.

    ``report`` must be the same boundary-checked JSON ``/api/analyze``
    returns — never a raw upload. The graph always includes exactly one real
    node (``you``) and ``cohort_size`` synthetic, clearly-labeled comparison
    nodes.
    """
    rng = random.Random(_seed_from_report(report))
    user_genotypes = user_trait_genotypes(report)

    counts: dict[str, int] = {}
    remaining = cohort_size
    groups = list(GROUP_SHARES.items())
    for group, share in groups[:-1]:
        n = round(cohort_size * share)
        counts[group] = n
        remaining -= n
    counts[groups[-1][0]] = max(remaining, 0)

    nodes: list[dict[str, Any]] = [
        {
            "id": "you",
            "is_synthetic": False,
            "is_user": True,
            "label": "You",
            "group": None,
            "traits": user_genotypes,
        }
    ]
    links: list[dict[str, Any]] = []
    index = 0
    for group, count in counts.items():
        for _ in range(count):
            index += 1
            node_id = f"cohort-{index}"
            genotypes = _draw_synthetic_genotypes(rng, group)
            nodes.append(
                {
                    "id": node_id,
                    "is_synthetic": True,
                    "is_user": False,
                    "label": f"Illustrative profile {index}",
                    "group": group,
                    "traits": genotypes,
                }
            )
            links.append(
                {
                    "source": "you",
                    "target": node_id,
                    "value": _similarity(user_genotypes, genotypes),
                }
            )

    return {
        "nodes": nodes,
        "links": links,
        "cohort_size": len(nodes) - 1,
        "generation_method": "synthetic_from_published_allele_frequencies",
        "disclaimer": (
            "Every node except \"you\" is a synthetic, illustrative profile "
            "generated from published population allele-frequency literature. "
            "This is not a comparison against real uploaded genomes — no "
            "dataset of 100+ consented users exists."
        ),
        "citations": [
            {"label": "TOPMed r2 reference-panel composition", "url": TOPMED_R2_SOURCE},
            {
                "label": "Lactase persistence allele frequency (Bersaglieri et al., 2004)",
                "url": "https://pubmed.ncbi.nlm.nih.gov/14988810/",
            },
            {
                "label": "Earwax-type worldwide allele frequency (Yoshiura et al., 2006)",
                "url": "https://doi.org/10.1038/ng1733",
            },
            {
                "label": "ACTN3 577X frequency and performance (Yang et al., 2003)",
                "url": "https://pubmed.ncbi.nlm.nih.gov/12879365/",
            },
            {
                "label": "TAS2R38 haplotype diversity (Wooding et al., 2004)",
                "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC1181941/",
            },
        ],
    }
