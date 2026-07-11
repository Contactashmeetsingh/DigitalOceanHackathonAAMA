"""Tests for the real, cited reference-population map builder."""

from backend.population_map import POPULATIONS, build_population_map

SAMPLE_REPORT = {
    "chip_version": "v5",
    "stats": {"input_rows": 638573, "called": 621125, "no_calls": 17448, "duplicates": 0},
    "traits": {
        "items": [
            {"rsid": "rs4988235", "genotype": "AG", "interpretable": True},
            {"rsid": "rs17822931", "genotype": "CT", "interpretable": True},
            {"rsid": "rs1815739", "genotype": "CT", "interpretable": True},
            {
                "rsid": "rs713598/rs1726866/rs10246939",
                "interpretation_status": "interpreted",
                "interpretable": True,
                "marker_calls": {"rs713598": "GG", "rs1726866": "GG", "rs10246939": "CC"},
            },
        ]
    },
}


def test_map_returns_every_real_named_population_with_a_similarity_score():
    result = build_population_map(SAMPLE_REPORT)

    assert len(result["populations"]) == len(POPULATIONS)
    for entry in result["populations"]:
        assert entry["id"] in {p["id"] for p in POPULATIONS}
        assert entry["source"].startswith("http")
        assert 0.0 <= entry["expected_similarity"] <= 1.0


def test_no_you_marker_when_no_population_context_is_supplied():
    result = build_population_map(SAMPLE_REPORT, population_context=None)

    assert result["you_marker"] is None


def test_no_you_marker_when_the_label_is_unrecognized():
    result = build_population_map(
        SAMPLE_REPORT, population_context={"canonical_key": None, "canonical_label": "Something else"}
    )

    assert result["you_marker"] is None


def test_you_marker_reflects_only_the_self_supplied_label():
    result = build_population_map(
        SAMPLE_REPORT,
        population_context={"canonical_key": "south_asian", "canonical_label": "South Asian"},
    )

    assert result["you_marker"]["source"] == "user_supplied_label"
    assert result["you_marker"]["label"] == "South Asian"
    matched = next(p for p in POPULATIONS if p["id"] == result["you_marker"]["population_id"])
    assert matched["group"] == "south_asian"


def test_disclaimer_and_citations_are_present():
    result = build_population_map(SAMPLE_REPORT)

    assert "does not locate" in result["disclaimer"].lower()
    assert result["citations"]
