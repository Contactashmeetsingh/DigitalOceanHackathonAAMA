#!/usr/bin/env python3
"""Idempotently upload staged PDF sources to a DigitalOcean knowledge base.

The presigned upload URL and object key are intentionally never logged.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


API_BASE = "https://api.digitalocean.com/v2/gen-ai"


class UploadError(RuntimeError):
    pass


def api_request(token: str, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        API_BASE + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            error_payload = json.loads(exc.read())
            detail = str(error_payload.get("message") or error_payload.get("error") or "")
            detail = re.sub(r"https?://\S+", "[redacted URL]", detail)
            detail = re.sub(r"(?i)(object[_ -]?key|token|signature)\s*[:=]\s*\S+", r"\1=[redacted]", detail)
        except (ValueError, AttributeError):
            pass
        suffix = f": {detail[:300]}" if detail else ""
        raise UploadError(f"DigitalOcean API {method} {path} failed with HTTP {exc.code}{suffix}") from None
    except urllib.error.URLError:
        raise UploadError(f"DigitalOcean API {method} {path} could not be reached") from None
    return json.loads(raw) if raw else {}


def upload_bytes(presigned_url: str, path: Path) -> None:
    request = urllib.request.Request(
        presigned_url,
        data=path.read_bytes(),
        method="PUT",
        headers={"Content-Type": "application/pdf"},
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        raise UploadError(f"Object upload for {path.name} failed with HTTP {exc.code}") from None
    except urllib.error.URLError:
        raise UploadError(f"Object upload for {path.name} could not be reached") from None


def find_named_kb(token: str, name: str) -> dict[str, Any]:
    payload = api_request(token, "GET", "/knowledge_bases?per_page=200")
    matches = [kb for kb in payload.get("knowledge_bases", []) if kb.get("name") == name]
    if len(matches) != 1:
        raise UploadError(f"Expected one knowledge base named {name!r}; found {len(matches)}")
    return matches[0]


def existing_file_names(payload: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    sources = payload.get("knowledge_base_data_sources", payload.get("data_sources", []))
    for source in sources:
        file_source = source.get("file_upload_data_source") or {}
        name = file_source.get("original_file_name") or source.get("original_file_name")
        if name:
            names.add(str(name))
    return names


def upload_pdf(token: str, kb_uuid: str, path: Path) -> None:
    size = path.stat().st_size
    presigned = api_request(
        token,
        "POST",
        "/knowledge_bases/data_sources/file_upload_presigned_urls",
        {"files": [{"file_name": path.name, "file_size": str(size)}]},
    )
    uploads = presigned.get("uploads", [])
    if len(uploads) != 1 or not uploads[0].get("presigned_url") or not uploads[0].get("object_key"):
        raise UploadError(f"DigitalOcean returned an incomplete upload grant for {path.name}")
    upload = uploads[0]
    upload_bytes(str(upload["presigned_url"]), path)
    api_request(
        token,
        "POST",
        f"/knowledge_bases/{kb_uuid}/data_sources",
        {
            "knowledge_base_uuid": kb_uuid,
            "file_upload_data_source": {
                "original_file_name": path.name,
                "size_in_bytes": str(size),
                "stored_object_key": upload["object_key"],
            },
            "chunking_algorithm": "CHUNKING_ALGORITHM_SEMANTIC",
            "chunking_options": {"max_chunk_size": 500, "semantic_threshold": 0.6},
        },
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kb-name", default="genetics-literacy-kb")
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    token = os.environ.get("DIGITALOCEAN_TOKEN")
    if not token:
        raise UploadError("Set DIGITALOCEAN_TOKEN in the environment")
    pdfs = sorted(args.directory.glob("*.pdf"))
    if not pdfs:
        raise UploadError(f"No PDF files found in {args.directory}")

    kb = find_named_kb(token, args.kb_name)
    kb_uuid = str(kb.get("uuid") or "")
    if not kb_uuid:
        raise UploadError("The knowledge base has no UUID")
    sources = api_request(token, "GET", f"/knowledge_bases/{kb_uuid}/data_sources")
    existing = existing_file_names(sources)
    for path in pdfs:
        if path.name in existing:
            print(f"SKIP: {path.name} already exists")
            continue
        upload_pdf(token, kb_uuid, path)
        print(f"ADDED: {path.name}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except UploadError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
