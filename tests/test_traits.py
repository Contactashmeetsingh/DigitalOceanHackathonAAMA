"""Focused tests for the safe, non-medical trait allowlist."""

from backend.parser import parse_23andme
from backend.traits import ALLOWLIST, lookup


def _rows_for(text: str) -> dict[str, dict]:
    return {row["rsid"]: row for row in lookup(parse_23andme(text))}


def test_requested_non_medical_traits_are_allowlisted():
    assert {
        "rs4988235",
        "rs17822931",
        "rs713598",
        "rs1726866",
        "rs10246939",
        "rs10427255",
        "rs1815739",
        "rs72921001",
    } == set(ALLOWLIST)


def test_lookup_returns_interpretation_and_evidence():
    rows = _rows_for(
        "\n".join(
            [
                "rs4988235\t2\t136608646\tAG",
                "rs17822931\t16\t48258198\tTT",
                "rs713598\t7\t141672604\tGC",
                "rs1815739\t11\t66560624\tTT",
                "rs72921001\t11\t6889648\tCA",
            ]
        )
    )

    assert "keeping lactase" in rows["rs4988235"]["interpretation"]
    assert rows["rs17822931"]["interpretation"] == "Associated with dry earwax."
    assert "intermediate" in rows["rs713598"]["interpretation"]
    assert "common, benign" in rows["rs1815739"]["interpretation"]
    assert "intermediate" in rows["rs72921001"]["interpretation"]
    assert all(row["citation"].startswith("https://") for row in rows.values())
    assert all(row["evidence_note"] for row in rows.values())


def test_absent_and_no_call_snps_are_not_interpreted():
    rows = _rows_for("rs4988235\t2\t136608646\t--")

    assert rows["rs4988235"]["measured"] is False
    assert rows["rs4988235"]["interpretation"] == "Not measured on this chip."
    assert rows["rs72921001"]["measured"] is False
