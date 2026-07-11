"""Unit tests for the Gradient AI agent/serverless fallback behavior."""

from backend import gradient_client


def test_explain_falls_back_to_serverless_when_agent_path_fails(monkeypatch):
    monkeypatch.setattr(gradient_client, "AGENT_ENDPOINT", "https://example.agents.do-ai.run")
    monkeypatch.setattr(gradient_client, "AGENT_ACCESS_KEY", "bad-or-rotated-key")
    monkeypatch.setattr(gradient_client, "MODEL_ACCESS_KEY", "a-valid-model-key")

    def failing_agent_call(_messages):
        raise gradient_client.NarrativeUnavailable("Gradient agent request failed: 403 Forbidden")

    def fake_serverless_call(_messages):
        return {"content": "Fallback answer.", "citations": []}

    monkeypatch.setattr(gradient_client, "_via_agent", failing_agent_call)
    monkeypatch.setattr(gradient_client, "_via_serverless", fake_serverless_call)

    result = gradient_client.explain([{"role": "user", "content": "hi"}])

    assert result == {"content": "Fallback answer.", "citations": []}


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
        return {"content": "Grounded agent answer.", "citations": [{"url": "https://example.org", "label": "x"}]}

    monkeypatch.setattr(gradient_client, "_via_agent", fake_agent_call)

    result = gradient_client.explain([{"role": "user", "content": "hi"}])

    assert result["content"] == "Grounded agent answer."
