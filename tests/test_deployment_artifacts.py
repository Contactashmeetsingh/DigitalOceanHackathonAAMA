from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_docker_image_includes_runtime_reference_artifact():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    artifact = ROOT / "data" / "reference" / "phase3_reference.json.gz"
    assert artifact.is_file()
    assert artifact.stat().st_size > 1_000_000
    assert "COPY data/reference/ ./data/reference/" in dockerfile


def test_gunicorn_keeps_health_responsive_during_slow_narrative_requests():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert '"--worker-class", "gthread"' in dockerfile
    assert '"--threads", "2"' in dockerfile
    assert '"--timeout", "120"' in dockerfile
