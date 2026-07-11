"""Tests for broad-label research-program matching."""

from backend.studies import load, match


def _ids(rows: list[dict]) -> list[str]:
    return [row["id"] for row in rows]


def test_curated_records_include_status_consent_and_official_links():
    data = load()

    assert data["curated_as_of"] == "2026-07-11"
    assert {"all-of-us", "h3africa", "genomeasia-100k"} <= {
        study["id"] for study in data["studies"]
    }
    for study in data["studies"]:
        assert study["recruitment_status"]
        assert study["participation"]
        assert study["consent_privacy"]
        assert study["url"].startswith("https://")
        assert study["status_source"].startswith("https://")


def test_south_asian_match_prioritizes_open_programs_and_keeps_genomeasia_context():
    rows = match("Broadly South Asian")

    assert _ids(rows)[0] in {"all-of-us", "genes-and-health", "our-future-health"}
    assert "genes-and-health" in _ids(rows)
    assert "genomeasia-100k" in _ids(rows)
    assert all(row["direct_enrollment"] for row in rows[:3])
    assert all("South Asian" in row["relationship_to_user"] or "broad public cohort" in row["relationship_to_user"] for row in rows)
    assert {row["pathway_type"] for row in rows} == {
        "public_enrollment",
        "consortium_or_data_pathway",
    }


def test_african_and_indigenous_aliases_match_relevant_programs():
    assert "h3africa" in _ids(match("West African"))
    assert "page-study" in _ids(match("Indigenous American"))


def test_unknown_or_empty_label_returns_sensible_default():
    expected = {"all-of-us", "our-future-health"}

    assert set(_ids(match(None))) == expected
    assert set(_ids(match("unrecognized label"))) == expected
