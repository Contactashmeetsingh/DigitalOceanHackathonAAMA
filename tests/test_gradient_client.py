"""Unit tests for the Gradient AI agent/serverless fallback behavior."""

from backend import gradient_client


def test_explain_falls_back_to_serverless_when_agent_path_fails(monkeypatch):
    monkeypatch.setattr(gradient_client, "AGENT_ENDPOINT", "https://example.agents.do-ai.run")
    monkeypatch.setattr(gradient_client, "AGENT_ACCESS_KEY", "bad-or-rotated-key")
    monkeypatch.setattr(gradient_client, "MODEL_ACCESS_KEY", "a-valid-model-key")

    def failing_agent_call(_messages):
        raise gradient_client.NarrativeUnavailable("Gradient agent request failed: 403 Forbidden")

    def fake_serverless_call(_messages):
        return {"content": "Fallback answer.", "citations": [], "answer_mode": "serverless_fallback"}

    monkeypatch.setattr(gradient_client, "_via_agent", failing_agent_call)
    monkeypatch.setattr(gradient_client, "_via_serverless", fake_serverless_call)

    result = gradient_client.explain([{"role": "user", "content": "hi"}])

    assert result == {
        "content": "Fallback answer.",
        "citations": [],
        "answer_mode": "serverless_fallback",
    }


def test_explain_raises_when_agent_fails_and_no_model_key_configured(monkeypatch):
    monkeypatch.setattr(gradient_client, "AGENT_ENDPOINT", "https://example.agents.do-ai.run")
    monkeypatch.setattr(gradient_client, "AGENT_ACCESS_KEY", "bad-or-rotated-key")
    monkeypatch.setattr(gradient_client, "MODEL_ACCESS_KEY", "")

    def failing_agent_call(_messages):
        raise gradient_client.NarrativeUnavailable("Gradient agent request failed: 403 Forbidden")

    monkeypatch.setattr(gradient_client, "_via_agent", failing_agent_call)

    try:
        gradient_client.explain([{"role": "user", "content": "hi"}])
        assert False, "expected NarrativeUnavailable"
    except gradient_client.NarrativeUnavailable:
        pass


def test_explain_uses_agent_path_directly_when_it_succeeds(monkeypatch):
    monkeypatch.setattr(gradient_client, "AGENT_ENDPOINT", "https://example.agents.do-ai.run")
    monkeypatch.setattr(gradient_client, "AGENT_ACCESS_KEY", "a-working-key")
    monkeypatch.setattr(gradient_client, "MODEL_ACCESS_KEY", "")

    def fake_agent_call(_messages):
        return {
            "content": "Grounded agent answer.",
            "citations": [{"url": "https://example.org", "label": "x"}],
            "answer_mode": "agent_rag",
        }

    monkeypatch.setattr(gradient_client, "_via_agent", fake_agent_call)

    result = gradient_client.explain([{"role": "user", "content": "hi"}])

    assert result["content"] == "Grounded agent answer."


def test_via_agent_strips_system_and_developer_messages_before_posting(monkeypatch):
    monkeypatch.setattr(gradient_client, "AGENT_ENDPOINT", "https://example.agents.do-ai.run")
    monkeypatch.setattr(gradient_client, "AGENT_ACCESS_KEY", "a-working-key")

    captured = {}

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {"choices": [{"message": {"content": "Grounded agent answer."}}]}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["json"] = json
        return FakeResponse()

    monkeypatch.setattr(gradient_client.requests, "post", fake_post)

    messages = [
        {"role": "system", "content": "boundary instructions"},
        {"role": "developer", "content": "dev instructions"},
        {"role": "user", "content": "What does my result mean?"},
    ]

    result = gradient_client._via_agent(messages)

    assert captured["url"] == "https://example.agents.do-ai.run/api/v1/chat/completions?agent=true"
    assert captured["json"]["messages"] == [{"role": "user", "content": "What does my result mean?"}]
    assert result["content"] == "Grounded agent answer."
    assert result["answer_mode"] == "agent_rag"


def test_extract_citations_handles_nested_retrieval_and_inline_urls():
    payload = {
        "retrieval_info": {
            "results": [
                {
                    "document": {
                        "title": "Population reference paper",
                        "source_url": "https://example.org/reference",
                    }
                }
            ]
        }
    }

    citations = gradient_client._extract_citations(
        payload,
        "See https://example.org/reference and https://example.org/second.",
    )

    assert citations == [
        {"url": "https://example.org/reference", "label": "Population reference paper"},
        {"url": "https://example.org/second", "label": "Source cited in the agent answer"},
    ]
