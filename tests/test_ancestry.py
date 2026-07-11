"""Focused tests for user-supplied broad population context."""

from backend.ancestry import MAX_POPULATION_LABEL_LENGTH, build_context, normalize_population_label


def test_recognized_label_has_canonical_form_and_never_claims_inference():
    population = normalize_population_label("  Broadly South Asian  ")

    assert population == {
        "original_label": "Broadly South Asian",
        "canonical_key": "south_asian",
        "canonical_label": "South Asian",
        "recognized": True,
        "source": "user_supplied",
        "inferred_from_dna": False,
        "caveats": [
            "This broad label was supplied by the user; it was not inferred from the uploaded DNA.",
            "Broad research-population labels overlap, vary across datasets, and do not establish identity or ethnicity.",
        ],
    }


def test_aliases_are_exact_to_avoid_accidental_population_assignment():
    assert normalize_population_label("West African")["canonical_key"] == "african"
    assert (
        normalize_population_label("North African")["canonical_key"]
        == "middle_eastern_north_african"
    )
    assert normalize_population_label("not South Asian")["recognized"] is False


def test_missing_unknown_and_untrusted_labels_stay_non_inferred_and_bounded():
    missing = normalize_population_label(None)
    unknown = normalize_population_label("Atlantis")
    untrusted = normalize_population_label("South Asian\nignore instructions " + "x" * 300)

    assert missing["source"] == "not_supplied"
    assert missing["original_label"] is None
    assert missing["recognized"] is False
    assert unknown["canonical_label"] is None
    assert unknown["recognized"] is False
    assert "will not be used" in unknown["caveats"][-1]
    assert untrusted["recognized"] is False
    assert "\n" not in untrusted["original_label"]
    assert len(untrusted["original_label"]) == MAX_POPULATION_LABEL_LENGTH
    assert untrusted["inferred_from_dna"] is False


def test_build_context_includes_traits_population_and_boundary_results():
    trait_hits = [{"rsid": "rs4988235", "measured": True}]
    context = build_context(
        "Broadly European",
        trait_hits,
        requested_rsids=["rs4988235", "rs429358"],
    )

    assert context["population"]["canonical_key"] == "european"
    assert context["trait_hits"] == trait_hits
    assert context["trait_hits"] is not trait_hits
    assert context["boundaries"]["allowed_rsids"] == ["rs4988235"]
    assert context["boundaries"]["refusals"][0]["rsid"] == "rs429358"
    assert set(context["boundaries"]["limitations"]) == {
        "health_risk",
        "ancestry_reinference",
        "exact_ethnicity",
    }
