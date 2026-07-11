"""Flask entrypoint for the deterministic ancestry-audit report.

The local path is intentionally complete without a live model: validate a
23andMe export, retain only allowlisted marker calls, assemble the transparent
guided report, and return no raw-genome data. A separately owned service layer
may add a cited narrative, but it is not required for this endpoint.
"""
from __future__ import annotations

import os

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from backend import gradient_client
from backend.narrative import CATEGORY_QUESTIONS, build_messages
from backend.parser import ParseError, parse_23andme
from backend.report import build_guided_report
from backend.traits import ALLOWLIST
from backend.upload_request import InMemoryUploadRequest

# Built React app (Vite output). In dev, use the Vite dev server (`npm run dev`,
# which proxies /api here); Flask serves this built bundle in production.
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
MAX_UPLOAD_BYTES = 64 * 1024 * 1024  # 64 MB — raw genome files are ~15-25 MB

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.request_class = InMemoryUploadRequest
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


@app.after_request
def prevent_analysis_caching(response):
    """Keep uploaded-data responses out of browser and intermediary caches."""
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


@app.errorhandler(RequestEntityTooLarge)
def upload_too_large(_error):
    return (
        jsonify(
            {
                "error": "The upload is larger than the 64 MB safety limit.",
                "code": "file_too_large",
            }
        ),
        413,
    )


@app.route("/api/analyze", methods=["POST"])
def analyze():
    uploaded = request.files.get("file")
    if uploaded is None or uploaded.filename == "":
        return (
            jsonify(
                {
                    "error": "No file uploaded. Send a 23andMe raw .txt file.",
                    "code": "missing_file",
                }
            ),
            400,
        )

    if not uploaded.filename.casefold().endswith(".txt"):
        return (
            jsonify(
                {
                    "error": "Upload the extracted 23andMe raw-data .txt file.",
                    "code": "invalid_file_type",
                }
            ),
            400,
        )

    # InMemoryUploadRequest ensures the multipart part itself is a BytesIO rather
    # than Werkzeug's default disk-spooled temporary file.
    raw_bytes = uploaded.read()
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        return (
            jsonify(
                {
                    "error": "The raw-data file must be UTF-8 text.",
                    "code": "invalid_encoding",
                }
            ),
            400,
        )

    try:
        parsed = parse_23andme(
            text,
            require_vendor_header=True,
            retain_rsids=ALLOWLIST,
        )
    except ParseError as error:
        return jsonify(error.to_dict()), 400

    population_label = request.form.get("population_label")
    # This optional API surface exists for deterministic refusal regression
    # checks. The main UI does not ask users to explore arbitrary markers.
    requested_rsids = request.form.getlist("requested_rsid")[:20]
    guided_report = build_guided_report(
        parsed,
        population_label,
        requested_rsids=requested_rsids or None,
    )

    safe_filename = secure_filename(uploaded.filename) or "genome.txt"

    return jsonify(
        {
            "filename": safe_filename,
            "vendor": parsed["vendor"],
            "chip_version": parsed["chip_version"],
            "reference_build": parsed["reference_build"],
            "stats": parsed["stats"],
            "retention": parsed["retention"],
            **guided_report,
        }
    )


@app.route("/api/narrative", methods=["POST"])
def narrative():
    """Ask Gradient AI one of the six vetted question categories.

    The client picks a `category`; the actual question text is looked up
    server-side from CATEGORY_QUESTIONS rather than trusted from the request,
    and the model only ever sees the already boundary-checked `report` JSON
    that /api/analyze returned — never a raw upload.
    """
    payload = request.get_json(silent=True) or {}
    category = payload.get("category")
    report = payload.get("report")

    if category not in CATEGORY_QUESTIONS:
        return (
            jsonify({"error": "Unknown question category.", "code": "invalid_category"}),
            400,
        )
    if not isinstance(report, dict):
        return (
            jsonify({"error": "A previously analyzed report is required.", "code": "missing_report"}),
            400,
        )

    messages = build_messages(category, report)
    try:
        result = gradient_client.explain(messages)
    except gradient_client.NarrativeUnavailable as error:
        return (
            jsonify({"error": str(error), "code": "narrative_unavailable"}),
            502,
        )

    return jsonify({"category": category, **result})


if __name__ == "__main__":
    # The direct entrypoint is local development only. Production uses gunicorn;
    # never expose Flask's interactive debugger or bind it to the local network.
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "8080")), debug=False)
