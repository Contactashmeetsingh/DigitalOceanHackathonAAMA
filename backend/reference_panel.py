"""Privacy-safe comparison to the compact 1000 Genomes frequency panel.

Only aggregate distances leave this module. Uploaded genotypes remain in the
in-memory parser result and are never copied into the response, logs, or files.
"""

from __future__ import annotations

from functools import lru_cache
import gzip
import json
import math
from pathlib import Path
from typing import Any


REFERENCE_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "reference"
    / "phase3_reference.json.gz"
)


@lru_cache(maxsize=1)
def load_reference() -> dict[str, Any]:
    with gzip.open(REFERENCE_PATH, "rt", encoding="utf-8") as source:
        artifact = json.load(source)
    if artifact.get("schema_version") != "1.0":
        raise ValueError("Unsupported reference-panel schema")
    if artifact.get("reference_build") != "GRCh37":
        raise ValueError("Reference panel must use GRCh37")
    return artifact


@lru_cache(maxsize=1)
def reference_rsids() -> frozenset[str]:
    """Return the rsIDs retained from an upload for aggregate comparison."""
    try:
        variants = load_reference()["variants"]
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        return frozenset()
    return frozenset(str(variant[0]).casefold() for variant in variants)


def _public_population_rows(reference: dict[str, Any]) -> list[dict[str, object]]:
    return [
        {
            "code": population["code"],
            "name": population["name"],
            "superpopulation": population["superpopulation"],
            "superpopulation_name": population["superpopulation_name"],
            "sample_count": population["sample_count"],
            "thin_reference": population["thin_reference"],
            "location": dict(population["location"]),
            "mds_direction": list(population["mds_direction"]),
            "distance": None,
            "rank": None,
        }
        for population in reference["populations"]
    ]


def _base_response(reference: dict[str, Any]) -> dict[str, object]:
    method = reference["method"]
    sources = reference["sources"]
    return {
        "status": "unavailable",
        "method": {
            "id": method["id"],
            "label": method["label"],
            "description": method["description"],
            "selection": method["selection"],
            "minimum_overlap": method["minimum_overlap"],
        },
        "reference": {
            "name": "1000 Genomes Phase 3",
            "release": sources["release"],
            "reference_build": reference["reference_build"],
            "sample_count": sources["sample_count"],
            "population_count": len(reference["populations"]),
            "panel_variant_count": method["panel_variant_count"],
            "sources": {
                "genotypes": sources["plink_resources"],
                "population_descriptions": sources["population_descriptions"],
                "superpopulation_descriptions": sources["superpopulation_descriptions"],
            },
        },
        "overlap": {
            "usable_markers": 0,
            "panel_markers": method["panel_variant_count"],
            "fraction": 0.0,
            "allele_mismatches": 0,
        },
        "populations": _public_population_rows(reference),
        "caveats": [
            "Distance to a reference population is not an ancestry percentage, ethnicity verdict, or identity claim.",
            "Population names are the 1000 Genomes sampling labels; groups overlap and are not homogeneous.",
            "Distances depend on the SNPs present on this consumer chip and should not be compared across different uploads.",
            "The map anchors are approximate locations derived from official sampling descriptions, not participant residences or inferred origins.",
            "The v4-chip overlap reproduced broad superpopulation labels much more reliably than fine population labels in leave-one-out reference validation (99.28% vs. 75.24%).",
        ],
    }


def build_closeness(parsed: dict[str, Any]) -> dict[str, object]:
    """Compute aggregate allele-frequency distances without returning markers."""
    try:
        reference = load_reference()
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        return {
            "status": "reference_unavailable",
            "message": "The local reference artifact is unavailable; the deterministic report still works.",
            "populations": [],
        }

    response = _base_response(reference)
    if parsed.get("reference_build") != reference["reference_build"]:
        response["status"] = "incompatible_build"
        response["message"] = "Genetic distance is withheld unless the upload is explicitly GRCh37/build 37."
        return response

    populations = response["populations"]
    assert isinstance(populations, list)
    frequency_scale = int(reference["method"]["frequency_scale"])
    squared_distance_sums = [0.0] * len(populations)
    usable_markers = 0
    allele_mismatches = 0
    snps = parsed.get("snps") if isinstance(parsed.get("snps"), dict) else {}

    for variant in reference["variants"]:
        rsid, _chromosome, _position, ref, alt, scaled_frequencies = variant
        record = snps.get(rsid)
        if not isinstance(record, dict):
            continue
        genotype = record.get("genotype")
        if not isinstance(genotype, str) or len(genotype) != 2 or genotype in {"--", "-"}:
            continue
        alleles = genotype.upper()
        if any(allele not in {ref, alt} for allele in alleles):
            allele_mismatches += 1
            continue
        alternate_fraction = alleles.count(alt) / 2.0
        usable_markers += 1
        for index, scaled_frequency in enumerate(scaled_frequencies):
            difference = alternate_fraction - (scaled_frequency / frequency_scale)
            squared_distance_sums[index] += difference * difference

    overlap = response["overlap"]
    assert isinstance(overlap, dict)
    overlap.update(
        {
            "usable_markers": usable_markers,
            "fraction": round(usable_markers / reference["method"]["panel_variant_count"], 6),
            "allele_mismatches": allele_mismatches,
        }
    )

    minimum_overlap = int(reference["method"]["minimum_overlap"])
    if usable_markers < minimum_overlap:
        response["status"] = "insufficient_overlap"
        response["message"] = (
            f"At least {minimum_overlap} compatible reference SNPs are required; "
            f"this upload supplied {usable_markers}."
        )
        return response

    distances = [math.sqrt(total / usable_markers) for total in squared_distance_sums]
    ranked_indices = sorted(range(len(distances)), key=lambda index: distances[index])
    rank_by_index = {population_index: rank + 1 for rank, population_index in enumerate(ranked_indices)}
    for index, population in enumerate(populations):
        population["distance"] = round(distances[index], 6)
        population["rank"] = rank_by_index[index]

    response["status"] = "available"
    response["message"] = (
        "Lower values indicate a smaller allele-frequency distance over the overlapping panel; "
        "they do not estimate ancestry proportions."
    )
    return response
