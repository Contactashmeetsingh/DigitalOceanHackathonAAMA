"""Flask request type that keeps multipart file parts in memory.

Werkzeug's default multipart stream uses a ``SpooledTemporaryFile`` and starts
writing to the operating-system temporary directory after 500 KiB. Raw genome
exports are much larger than that, so the default conflicts with this project's
no-disk privacy boundary. The application sets a total request-size limit and
uses this request class so accepted file parts remain ``BytesIO`` objects.
"""
from __future__ import annotations

from io import BytesIO
from typing import IO

from flask import Request


class InMemoryUploadRequest(Request):
    """Keep uploaded multipart file content in RAM for the request lifetime."""

    def _get_file_stream(
        self,
        total_content_length: int | None,
        content_type: str | None,
        filename: str | None = None,
        content_length: int | None = None,
    ) -> IO[bytes]:
        del total_content_length, content_type, filename, content_length
        return BytesIO()
