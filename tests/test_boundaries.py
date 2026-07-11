"""Focused tests for the deterministic default-deny boundary."""

from backend.boundaries import (
    DEFAULT_DENY_EXAMPLE_RSIDS,
    REFUSAL_MESSAGE,
    honesty_response,
    honesty_responses,
    is_allowed,
    screen_requested_rsids,
)
from backend.traits import ALLOWLIST


def test_only_allowlisted_rsids_are_allowed_with_safe_normalization():
    assert all(is_allowed(rsid) for rsid in ALLOWLIST)
    assert is_allowed("  RS4988235 ")
    assert not is_allowed("rs999999999")
    assert not is_allowed("BRCA1")
    assert not is_allowed(None)


def test_familiar_off_allowlist_examples_follow_the_generic_refusal_path():
    screened = screen_requested_rsids(DEFAULT_DENY_EXAMPLE_RSIDS)

    assert screened["allowed_rsids"] == []
    assert [row["rsid"] for row in screened["refusals"]] == list(
        DEFAULT_DENY_EXAMPLE_RSIDS
    )
    assert all(row["reason"] == REFUSAL_MESSAGE for row in screened["refusals"])
    combined_text = " ".join(row["reason"] for row in screened["refusals"]).casefold()
    assert "alzheimer" not in combined_text
    assert "cancer" not in combined_text
    assert "pathogenic" not in combined_text


def test_screen_preserves_order_deduplicates_and_does_not_echo_malformed_values():
    screened = screen_requested_rsids(
        ["RS4988235", "rs429358", "rs4988235", "not-an-rsid", "not-an-rsid"]
    )

    assert screened["policy"] == "default-deny"
    assert screened["allowed_rsids"] == ["rs4988235"]
    assert screened["refusals"] == [
        {
            "rsid": "rs429358",
            "allowed": False,
            "refused": True,
            "reason": REFUSAL_MESSAGE,
        },
        {
            "rsid": None,
            "allowed": False,
            "refused": True,
            "reason": REFUSAL_MESSAGE,
        },
    ]


def test_honesty_answers_are_complete_deterministic_and_copy_safe():
    responses = honesty_responses()

    assert set(responses) == {
        "health_risk",
        "ancestry_reinference",
        "exact_ethnicity",
    }
    assert all(response["allowed"] is False for response in responses.values())
    assert "does not assess" in responses["health_risk"]["answer"]
    assert "does not calculate ancestry" in responses["ancestry_reinference"]["answer"]
    assert "cannot establish" in responses["exact_ethnicity"]["answer"]

    responses["health_risk"]["answer"] = "mutated"
    assert honesty_response("health_risk")["answer"] != "mutated"
    assert honesty_response("unknown") is None
