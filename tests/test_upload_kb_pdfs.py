import io
import urllib.error
from unittest.mock import patch

import pytest

from scripts.upload_kb_pdfs import UploadError, api_request, existing_file_names


def test_existing_file_names_handles_nested_file_sources():
    payload = {
        "knowledge_base_data_sources": [
            {"file_upload_data_source": {"original_file_name": "study.pdf"}},
            {"web_crawler_data_source": {"base_url": "https://example.test"}},
        ]
    }
    assert existing_file_names(payload) == {"study.pdf"}


def test_api_error_redacts_urls_and_signatures():
    body = b'{"message":"failed at https://objects.example/file?signature=secret token: abc"}'
    error = urllib.error.HTTPError("https://api.example", 400, "bad", {}, io.BytesIO(body))
    with patch("urllib.request.urlopen", side_effect=error):
        with pytest.raises(UploadError) as caught:
            api_request("private-token", "POST", "/knowledge_bases", {})
    message = str(caught.value)
    assert "private-token" not in message
    assert "objects.example" not in message
    assert "signature=secret" not in message
    assert "[redacted URL]" in message
