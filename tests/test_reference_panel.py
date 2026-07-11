"""Tests for aggregate 1000 Genomes frequency-distance reporting."""

import json

from backend.reference_panel import build_closeness, load_reference, reference_rsids


def _parsed_from_variants(count: int, *, build: str = "GRCh37") -> dict:
    reference = load_reference()
    snps = {}
    for rsid, chromosome, position, ref, _alt, _frequencies in reference["variants"][:count]:
        snps[rsid] = {
            "chromosome": chromosome,
            "position": position,
            "genotype": ref + ref,
        }
    return {"reference_build": build, "snps": snps}


def test_reference_artifact_has_expected_real_data_shape():
    reference = load_reference()

    assert reference["sources"]["sample_count"] == 2504
    assert len(reference["populations"]) == 26
    assert len(reference["variants"]) == 19979
    assert len(reference_rsids()) == 19979
    assert sum(population["sample_count"] for population in reference["populations"]) == 2504
    assert {population["superpopulation"] for population in reference["populations"]} == {
        "AFR", "AMR", "EAS", "EUR", "SAS"
    }


def test_closeness_is_deterministic_and_never_returns_markers_or_genotypes():
    parsed = _parsed_from_variants(250)

    first = build_closeness(parsed)
    second = build_closeness(parsed)

    assert first == second
    assert first["status"] == "available"
    assert first["overlap"]["usable_markers"] == 250
    assert sorted(population["rank"] for population in first["populations"]) == list(range(1, 27))
    serialized = json.dumps(first)
    assert '"genotype":' not in serialized
    assert load_reference()["variants"][0][0] not in serialized


def test_closeness_fails_closed_for_low_overlap_and_wrong_build():
    low_overlap = build_closeness(_parsed_from_variants(25))
    wrong_build = build_closeness(_parsed_from_variants(250, build="GRCh38"))

    assert low_overlap["status"] == "insufficient_overlap"
    assert all(population["distance"] is None for population in low_overlap["populations"])
    assert wrong_build["status"] == "incompatible_build"
    assert wrong_build["overlap"]["usable_markers"] == 0
