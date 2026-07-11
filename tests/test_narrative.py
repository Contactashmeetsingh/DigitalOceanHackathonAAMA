"""Unit tests for the Gradient AI narrative message builder."""

from backend.narrative import CATEGORY_QUESTIONS, build_messages

SAMPLE_REPORT = {
    "population_context": {
        "original_label": "Broadly South Asian",
        "canonical_label": "South Asian",
        "recognized": True,
        "inferred_from_dna": False,
    },
    "traits": {
        "items": [
            {
                "name": "Lactase persistence",
                "rsid": "rs4988235",
                "measured": True,
                "interpretable": True,
                "interpretation": "Likely lactase persistent.",
                "evidence_note": "Validated mainly in European cohorts.",
                "genotype": "AG",
            }
        ]
    },
    "boundaries": {"policy_summary": "Only allowlisted markers are interpreted."},
    "studies": {"items": [{"name": "All of Us"}, {"name": "H3Africa"}]},
}


def test_build_messages_covers_all_six_categories():
    assert len(CATEGORY_QUESTIONS) == 6


def test_build_messages_returns_system_and_user_turn():
    messages = build_messages("traits", SAMPLE_REPORT)

    assert [message["role"] for message in messages] == ["system", "user"]
    assert "traits" in messages[1]["content"]


def test_build_messages_strips_raw_genotype_from_context():
    messages = build_messages("interpretation", SAMPLE_REPORT)

    assert "AG" not in messages[1]["content"]


def test_build_messages_includes_canonical_question_not_report_free_text():
    messages = build_messages("limits", SAMPLE_REPORT)

    assert CATEGORY_QUESTIONS["limits"] in messages[1]["content"]


def test_build_messages_tolerates_missing_report_sections():
    messages = build_messages("research", {})

    assert "study_programs" in messages[1]["content"]
