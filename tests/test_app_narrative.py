"""End-to-end Flask API tests for the /api/narrative Gradient AI endpoint."""

import pytest

from backend import gradient_client
from backend.app import app

SAMPLE_REPORT = {
    "population_context": {"canonical_label": "South Asian", "recognized": True},
    "traits": {"items": []},
    "boundaries": {"policy_summary": "Only allowlisted markers are interpreted."},
    "studies": {"items": []},
}


@pytest.fixture()
def client():
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client


def test_narrative_returns_content_and_citations(client, monkeypatch):
    def fake_explain(messages):
        assert messages[0]["role"] == "system"
        return {
            "content": "Grounded answer.",
            "citations": [{"url": "https://example.org", "label": "Example"}],
            "answer_mode": "agent_rag",
        }

    monkeypatch.setattr(gradient_client, "explain", fake_explain)

    response = client.post(
        "/api/narrative",
        json={"category": "interpretation", "report": SAMPLE_REPORT},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["category"] == "interpretation"
    assert data["content"] == "Grounded answer."
    assert data["citations"] == [{"url": "https://example.org", "label": "Example"}]
    assert data["answer_mode"] == "agent_rag"


def test_narrative_rejects_unknown_category(client):
    response = client.post(
        "/api/narrative",
        json={"category": "not-a-real-category", "report": SAMPLE_REPORT},
    )

    assert response.status_code == 400
    assert response.get_json()["code"] == "invalid_category"


def test_narrative_requires_a_report(client):
    response = client.post("/api/narrative", json={"category": "interpretation"})

    assert response.status_code == 400
    assert response.get_json()["code"] == "missing_report"


def test_narrative_surfaces_unavailable_gradient_ai_as_clean_502(client, monkeypatch):
    def fake_explain(messages):
        raise gradient_client.NarrativeUnavailable("No Gradient AI credentials are configured.")

    monkeypatch.setattr(gradient_client, "explain", fake_explain)

    response = client.post(
        "/api/narrative",
        json={"category": "limits", "report": SAMPLE_REPORT},
    )

    assert response.status_code == 502
    assert response.get_json()["code"] == "narrative_unavailable"
