"""End-to-end Flask API tests for the comparison-cohort and population-map routes."""

import pytest

from backend.app import app

SAMPLE_REPORT = {
    "population_context": {"canonical_key": "european", "canonical_label": "European", "recognized": True},
    "stats": {"input_rows": 638573, "called": 621125, "no_calls": 17448, "duplicates": 0},
    "traits": {"items": [{"rsid": "rs4988235", "genotype": "AG", "interpretable": True}]},
}


@pytest.fixture()
def client():
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client


def test_comparison_cohort_returns_a_labeled_synthetic_graph(client):
    response = client.post("/api/comparison-cohort", json={"report": SAMPLE_REPORT})

    assert response.status_code == 200
    data = response.get_json()
    assert data["cohort_size"] > 0
    assert any(node["is_user"] for node in data["nodes"])
    assert all(node["is_synthetic"] or node["is_user"] for node in data["nodes"])


def test_comparison_cohort_requires_a_report(client):
    response = client.post("/api/comparison-cohort", json={})

    assert response.status_code == 400
    assert response.get_json()["code"] == "missing_report"


def test_population_map_returns_real_populations_and_a_you_marker(client):
    response = client.post("/api/population-map", json={"report": SAMPLE_REPORT})

    assert response.status_code == 200
    data = response.get_json()
    assert len(data["populations"]) > 0
    assert data["you_marker"]["label"] == "European"


def test_population_map_requires_a_report(client):
    response = client.post("/api/population-map", json={})

    assert response.status_code == 400
    assert response.get_json()["code"] == "missing_report"
