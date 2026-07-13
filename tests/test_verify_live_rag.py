from scripts import verify_live_rag
from scripts.verify_live_rag import summarize_response


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def test_summarize_response_requires_agent_mode_answer_and_citation():
    result = summarize_response(
        "interpretation",
        FakeResponse(
            200,
            {
                "answer_mode": "agent_rag",
                "content": "A bounded answer.",
                "citations": [{"url": "https://example.test", "label": "Source"}],
            },
        ),
    )
    assert result["passed"] is True
    assert result["citations"] == 1


def test_summarize_response_rejects_uncited_fallback():
    result = summarize_response(
        "limits",
        FakeResponse(200, {"answer_mode": "serverless_fallback", "content": "Answer", "citations": []}),
    )
    assert result["passed"] is False


def test_verify_can_limit_live_calls_to_selected_categories(monkeypatch):
    requested_categories = []

    def fake_post(_url, json, timeout):
        requested_categories.append(json["category"])
        assert timeout == (15, 210)
        return FakeResponse(
            200,
            {
                "answer_mode": "agent_rag",
                "content": "Bounded answer.",
                "citations": [{"url": "https://example.test", "label": "Source"}],
            },
        )

    monkeypatch.setattr(verify_live_rag.requests, "post", fake_post)

    results = verify_live_rag.verify(
        "https://app.example.test",
        210,
        ["interpretation", "traits"],
    )

    assert requested_categories == ["interpretation", "traits"]
    assert all(result["passed"] for result in results)
