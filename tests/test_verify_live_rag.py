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
