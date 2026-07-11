"""Tests for the synthetic cohort-comparison graph builder."""

from backend.comparison import GROUP_SHARES, build_comparison_graph

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
            {"rsid": "rs10427255", "genotype": "TT", "interpretable": False},
        ]
    },
}


def test_graph_has_one_real_node_and_labeled_synthetic_cohort():
    graph = build_comparison_graph(SAMPLE_REPORT, cohort_size=100)

    you_nodes = [node for node in graph["nodes"] if node["is_user"]]
    synthetic_nodes = [node for node in graph["nodes"] if node["is_synthetic"]]

    assert len(you_nodes) == 1
    assert you_nodes[0]["id"] == "you"
    assert len(synthetic_nodes) == graph["cohort_size"] == 100
    assert all(node["group"] in GROUP_SHARES for node in synthetic_nodes)


def test_graph_is_deterministic_for_the_same_report():
    first = build_comparison_graph(SAMPLE_REPORT, cohort_size=50)
    second = build_comparison_graph(SAMPLE_REPORT, cohort_size=50)

    assert first == second


def test_graph_differs_for_a_different_report():
    other_report = {**SAMPLE_REPORT, "stats": {**SAMPLE_REPORT["stats"], "input_rows": 963050}}

    first = build_comparison_graph(SAMPLE_REPORT, cohort_size=20)
    second = build_comparison_graph(other_report, cohort_size=20)

    assert first["nodes"] != second["nodes"]


def test_links_connect_you_to_every_cohort_node_with_a_bounded_value():
    graph = build_comparison_graph(SAMPLE_REPORT, cohort_size=30)

    assert len(graph["links"]) == 30
    for link in graph["links"]:
        assert link["source"] == "you"
        assert link["target"].startswith("cohort-")
        assert 0.0 <= link["value"] <= 1.0


def test_disclaimer_and_citations_are_present_and_no_node_claims_to_be_real_data():
    graph = build_comparison_graph(SAMPLE_REPORT, cohort_size=10)

    assert "synthetic" in graph["disclaimer"].lower()
    assert graph["citations"]
    assert all(node["is_synthetic"] or node["is_user"] for node in graph["nodes"])
