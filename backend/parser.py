"""Conservative, in-memory parser for 23andMe raw genotype exports.

The parser deliberately separates two concerns:

* ``parse_23andme(..., require_vendor_header=True)`` is the production-facing
  mode.  It accepts only files with the recognizable 23andMe export signature
  and canonical four-column header.
* The default compatibility mode also accepts a headerless four-column snippet
  and labels its vendor ``"unknown"``.  This is useful for small, synthetic
  trait fixtures without pretending that an unlabelled file came from 23andMe.
* ``retain_rsids`` enables a memory-bounded report mode.  Every input record is
  still validated and included in aggregate coverage, but only requested
  markers retain their genotype payloads.

Raw genotypes are never written to disk here.  Callers are responsible for
preserving that property after receiving the returned structure.
"""
from __future__ import annotations

import re
from collections.abc import Iterable, Iterator
from typing import Any, Literal, TypedDict


SUPPORTED_CHROMOSOMES = tuple(str(number) for number in range(1, 23)) + (
    "X",
    "Y",
    "MT",
)
_SUPPORTED_CHROMOSOME_SET = frozenset(SUPPORTED_CHROMOSOMES)
# Real consumer marker identifiers are far shorter than this bound. Limiting the
# numeric portion prevents Python's integer-string safety limit from becoming an
# uncaught exception when hostile input is converted by ``_marker_key``.
_MARKER_ID_RE = re.compile(r"(?:rs|i)[1-9]\d{0,19}\Z", re.IGNORECASE)
_GENOTYPE_RE = re.compile(r"[ACGTDI]{1,2}\Z", re.IGNORECASE)
_POSITION_RE = re.compile(r"[0-9]{1,12}\Z")
_OFFICIAL_VENDOR_RE = re.compile(
    r"\b(?:this\s+)?data\s+file\s+(?:was\s+)?generated\s+by\s+23andme\b",
    re.IGNORECASE,
)
_OTHER_VENDOR_RE = re.compile(
    r"\b(?:ancestrydna|ancestry\.com|myheritage|familytreedna|living\s*dna)\b",
    re.IGNORECASE,
)
_CHIP_VERSION_RE = re.compile(
    r"\b(?:genotyping\s+)?(?:chip|array|platform)\s*"
    r"(?:version\s*)?[:=\-]?\s*v?([345])\b",
    re.IGNORECASE,
)


class SnpRecord(TypedDict):
    chromosome: str
    position: str
    genotype: str


class ParseStats(TypedDict):
    """Counts over unique valid records and rejected/duplicate input rows."""

    total: int
    called: int
    no_calls: int
    malformed: int
    duplicates: int
    conflicting_duplicates: int
    input_rows: int


class ChromosomeCoverage(TypedDict):
    total: int
    called: int
    no_calls: int


class CoverageMetadata(TypedDict):
    call_rate: float
    observed_chromosomes: list[str]
    by_chromosome: dict[str, ChromosomeCoverage]


class RetentionMetadata(TypedDict):
    mode: Literal["all", "selected"]
    requested_rsids: int | None
    retained_rsids: int
    duplicate_conflict_scope: Literal["all_records", "retained_records"]


class ParseResult(TypedDict):
    snps: dict[str, SnpRecord]  # keyed by normalized marker id
    stats: ParseStats
    coverage: CoverageMetadata
    retention: RetentionMetadata
    chip_version: Literal["v3", "v4", "v5"] | None
    reference_build: str | None
    vendor: Literal["23andMe", "unknown"]


class ParseError(ValueError):
    """A safe-to-surface validation error for an uploaded genotype file.

    ``code`` is stable enough for an API to branch on.  ``details`` contains
    aggregate counts only and never includes raw genotype rows.
    """

    def __init__(
        self,
        code: str,
        message: str,
        *,
        details: dict[str, int | str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"error": self.message, "code": self.code}
        if self.details:
            payload["details"] = self.details
        return payload


def _comment_body(line: str) -> str:
    return line.lstrip().removeprefix("#").strip()


def _iter_lines(text: str) -> Iterator[str]:
    """Yield lines without materializing a list proportional to file size."""
    start = 0
    text_length = len(text)
    while start < text_length:
        end = text.find("\n", start)
        if end == -1:
            yield text[start:]
            return
        yield text[start:end]
        start = end + 1


def _leading_comments(text: str) -> list[str]:
    """Collect the small header block before the first genotype/data row."""
    comments: list[str] = []
    for raw_line in _iter_lines(text):
        line = raw_line.strip()
        if not line:
            continue
        if not line.startswith("#"):
            break
        comments.append(line)
    return comments


def _has_column_header(comments: list[str]) -> bool:
    for comment in comments:
        columns = re.split(r"\s+", _comment_body(comment).lower())
        if columns == ["rsid", "chromosome", "position", "genotype"]:
            return True
    return False


def _chip_version(comments: list[str]) -> Literal["v3", "v4", "v5"] | None:
    """Use explicit chip metadata only; marker-count guesses are unreliable."""
    versions = {
        f"v{match.group(1)}"
        for comment in comments
        for match in _CHIP_VERSION_RE.finditer(_comment_body(comment))
    }
    if len(versions) != 1:
        return None
    return versions.pop()  # type: ignore[return-value]


def _reference_build(comments: list[str]) -> str | None:
    """Extract an explicitly named reference build without inferring one."""
    header = "\n".join(_comment_body(comment) for comment in comments)
    builds: set[str] = set()
    patterns = {
        "GRCh36": (r"\bgrch\s*36\b", r"\bhg\s*18\b", r"\bassembly\s+build\s+36\b"),
        "GRCh37": (r"\bgrch\s*37\b", r"\bhg\s*19\b", r"\bassembly\s+build\s+37\b"),
        "GRCh38": (r"\bgrch\s*38\b", r"\bhg\s*38\b", r"\bassembly\s+build\s+38\b"),
    }
    for build, aliases in patterns.items():
        if any(re.search(alias, header, re.IGNORECASE) for alias in aliases):
            builds.add(build)
    return builds.pop() if len(builds) == 1 else None


def _normalized_record(parts: list[str]) -> tuple[str, SnpRecord] | None:
    if len(parts) != 4:
        return None

    marker_id, chromosome, position_text, genotype = (
        part.strip() for part in parts
    )
    marker_id = marker_id.lower()
    chromosome = chromosome.upper()
    genotype = genotype.upper()

    if not _MARKER_ID_RE.fullmatch(marker_id):
        return None
    if chromosome not in _SUPPORTED_CHROMOSOME_SET:
        return None
    if not _POSITION_RE.fullmatch(position_text):
        return None
    position = int(position_text)
    if position <= 0:
        return None
    if genotype not in {"-", "--"} and not _GENOTYPE_RE.fullmatch(genotype):
        return None

    return marker_id, {
        "chromosome": chromosome,
        "position": str(position),
        "genotype": genotype,
    }


def _marker_key(marker_id: str) -> int:
    """Encode validated rs/i identifiers injectively as one compact integer."""
    number = int(marker_id[2:] if marker_id.startswith("rs") else marker_id[1:])
    return (number << 1) | int(marker_id.startswith("i"))


def parse_23andme(
    text: str,
    *,
    require_vendor_header: bool = False,
    retain_rsids: Iterable[str] | None = None,
) -> ParseResult:
    """Parse raw genotype text into validated, structured records.

    Args:
        text: Decoded text from a raw genotype export.
        require_vendor_header: When true, require the official 23andMe export
            signature and canonical commented column header.  Production upload
            endpoints should set this to true.  Headerless valid snippets remain
            available in the default mode and are labelled ``vendor="unknown"``.
        retain_rsids: Optional marker IDs whose genotype records should be kept.
            All rows are still validated and counted.  ``None`` preserves the
            original full-retention behavior; an empty iterable retains no SNPs.

    Raises:
        ParseError: If input is empty, explicitly belongs to another vendor, is
            missing required 23andMe header evidence, or has no valid records.

    Privacy: this function operates only on the passed-in string and never
    persists raw text or returned genotypes.
    """
    if not isinstance(text, str):
        raise ParseError("invalid_input", "Raw genotype input must be decoded text.")
    text = text.lstrip("\ufeff")
    if not text or text.isspace():
        raise ParseError("empty_input", "The uploaded genotype file is empty.")

    if isinstance(retain_rsids, (str, bytes)):
        raise TypeError("retain_rsids must be an iterable of marker IDs, not text")
    selected_rsids = (
        None
        if retain_rsids is None
        else {
            marker_id.lower()
            for marker_id in retain_rsids
            if isinstance(marker_id, str) and _MARKER_ID_RE.fullmatch(marker_id)
        }
    )
    retain_all = selected_rsids is None

    comments = _leading_comments(text)
    header = "\n".join(_comment_body(comment) for comment in comments)
    is_23andme = bool(_OFFICIAL_VENDOR_RE.search(header))
    has_conflicting_vendor = bool(_OTHER_VENDOR_RE.search(header))
    if has_conflicting_vendor:
        raise ParseError(
            "unsupported_vendor",
            "This file appears to be from another DNA service; upload a 23andMe raw-data export.",
        )
    if require_vendor_header and not is_23andme:
        raise ParseError(
            "unsupported_vendor",
            "Could not verify this as a 23andMe raw-data export from its header.",
        )
    if is_23andme and not _has_column_header(comments):
        raise ParseError(
            "invalid_header",
            "The 23andMe export is missing its canonical rsid/chromosome/position/genotype header.",
        )

    snps: dict[str, SnpRecord] = {}
    # In selected-retention mode, compact integer IDs preserve exact unique-row
    # and duplicate counts without retaining every genotype dictionary/string.
    seen_marker_keys: set[int] | None = set() if not retain_all else None
    by_chromosome: dict[str, ChromosomeCoverage] = {}
    total = 0
    no_calls = 0
    malformed = 0
    duplicates = 0
    conflicting_duplicates = 0
    input_rows = 0

    for raw_line in _iter_lines(text):
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue

        input_rows += 1
        normalized = _normalized_record(line.split("\t"))
        if normalized is None:
            malformed += 1
            continue

        marker_id, record = normalized
        existing = snps.get(marker_id)
        if retain_all:
            is_duplicate = existing is not None
        else:
            marker_key = _marker_key(marker_id)
            # The set exists whenever retain_all is false.
            assert seen_marker_keys is not None
            is_duplicate = marker_key in seen_marker_keys

        if is_duplicate:
            duplicates += 1
            # In selected mode an unretained duplicate's payload is deliberately
            # unavailable. Duplicate counts remain exact, while conflicting-
            # duplicate counts are therefore scoped to retained marker IDs.
            if existing is not None and existing != record:
                conflicting_duplicates += 1
            continue

        if seen_marker_keys is not None:
            seen_marker_keys.add(marker_key)

        total += 1
        is_no_call = record["genotype"] in {"-", "--"}
        no_calls += is_no_call
        chromosome = record["chromosome"]
        chromosome_coverage = by_chromosome.setdefault(
            chromosome,
            {"total": 0, "called": 0, "no_calls": 0},
        )
        chromosome_coverage["total"] += 1
        chromosome_coverage["no_calls" if is_no_call else "called"] += 1

        if retain_all or marker_id in selected_rsids:
            snps[marker_id] = record

    if total == 0:
        raise ParseError(
            "no_valid_records",
            "No valid 23andMe genotype records were found in the uploaded file.",
            details={"input_rows": input_rows, "malformed": malformed},
        )

    ordered_coverage = {
        chromosome: by_chromosome[chromosome]
        for chromosome in SUPPORTED_CHROMOSOMES
        if chromosome in by_chromosome
    }
    called = total - no_calls
    return {
        "snps": snps,
        "stats": {
            "total": total,
            "called": called,
            "no_calls": no_calls,
            "malformed": malformed,
            "duplicates": duplicates,
            "conflicting_duplicates": conflicting_duplicates,
            "input_rows": input_rows,
        },
        "coverage": {
            "call_rate": round(called / total, 6),
            "observed_chromosomes": list(ordered_coverage),
            "by_chromosome": ordered_coverage,
        },
        "retention": {
            "mode": "all" if retain_all else "selected",
            "requested_rsids": None if selected_rsids is None else len(selected_rsids),
            "retained_rsids": len(snps),
            "duplicate_conflict_scope": (
                "all_records" if retain_all else "retained_records"
            ),
        },
        "chip_version": _chip_version(comments),
        "reference_build": _reference_build(comments),
        "vendor": "23andMe" if is_23andme else "unknown",
    }


def genotype_for(parsed: ParseResult, rsid: str) -> str | None:
    """Return a called genotype, or ``None`` when absent/no-called.

    A missing marker is a first-class case because chip coverage varies.  Marker
    lookup is case-insensitive; the stored genotype remains in raw allele order
    for compatibility with the curated trait layer.
    """
    record = parsed["snps"].get(rsid.lower())
    if record is None:
        return None
    genotype = record["genotype"]
    return None if genotype in {"--", "-"} else genotype
