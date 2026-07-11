"""Privacy regression tests for multipart upload buffering."""

from io import BytesIO

from backend.upload_request import InMemoryUploadRequest


def test_upload_stream_factory_never_selects_a_temporary_file():
    request = object.__new__(InMemoryUploadRequest)

    small = request._get_file_stream(100, "text/plain", "small.txt", 100)
    genome_sized = request._get_file_stream(
        25 * 1024 * 1024,
        "text/plain",
        "genome.txt",
        25 * 1024 * 1024,
    )

    assert isinstance(small, BytesIO)
    assert isinstance(genome_sized, BytesIO)
