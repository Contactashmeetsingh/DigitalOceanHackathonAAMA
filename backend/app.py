"""Flask entrypoint — App Platform serves this via `gunicorn backend.app:app`.

Step-one pipeline: upload -> parse -> return stats. The trait interpretation,
default-deny refusal, Gradient narrative, and studies bridge attach here in the
next steps (marked TODO below), each behind the parse that already works.

Privacy-first: the uploaded file is read into memory and never written to disk.
"""
from __future__ import annotations

import os

from flask import Flask, jsonify, request, send_from_directory

from backend.parser import parse_23andme

# Built React app (Vite output). In dev, use the Vite dev server (`npm run dev`,
# which proxies /api here); Flask serves this built bundle in production.
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
MAX_UPLOAD_BYTES = 64 * 1024 * 1024  # 64 MB — raw genome files are ~15-25 MB

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES


@app.route("/")
def index():
    if not os.path.exists(os.path.join(FRONTEND_DIR, "index.html")):
        return (
            "Frontend not built. Run `npm --prefix frontend install && "
            "npm --prefix frontend run build`, or use `npm run dev` for local dev.",
            200,
        )
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/health")
def health():
    """App Platform health check target (see .do/app.yaml)."""
    return jsonify({"status": "ok"})


@app.route("/api/analyze", methods=["POST"])
def analyze():
    uploaded = request.files.get("file")
    if uploaded is None or uploaded.filename == "":
        return jsonify({"error": "No file uploaded. Send a 23andMe raw .txt file."}), 400

    # In-memory only — never persisted.
    text = uploaded.read().decode("utf-8", errors="replace")
    parsed = parse_23andme(text)

    # TODO(next steps): traits.lookup(parsed) -> allowlisted trait hits
    # TODO(next steps): boundaries.screen(parsed) -> default-deny refusals
    # TODO(next steps): gradient_client.explain(context) -> cited narrative
    # TODO(next steps): studies.match(context) -> recruiting-study bridge
    return jsonify(
        {
            "filename": uploaded.filename,
            "vendor": parsed["vendor"],
            "chip_version": parsed["chip_version"],
            "stats": parsed["stats"],
            "note": (
                "Step-one skeleton: parsing works end to end. Trait interpretation, "
                "refusal logic, and the Gradient AI narrative are the next steps."
            ),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), debug=True)
