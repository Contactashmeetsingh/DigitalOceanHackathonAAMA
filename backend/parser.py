"""23andMe raw-data parser.

Step-one status: minimal but real. It reads the real 23andMe TSV format
(`#` header block, then `rsid  chromosome  position  genotype`) into structured
records and computes basic stats. Enough to run the pipeline end to end today.

TODO(P1 — build fully): harden per the plan:
  - detect chip version (v3/v4/v5) from the set of positions covered
  - derive genetic-sex chromosomes (XX/XY) from X/Y calls
  - special-case MT / Y edge rows
  - detect non-23andMe vendors (AncestryDNA etc.) and fail gracefully
  - reference build is b37/GRCh37 — note if cross-referencing external annotation
"""
from __future__ import annotations

from typing import TypedDict


class SnpRecord(TypedDict):
    chromosome: str
    position: str
    genotype: str


class ParseResult(TypedDict):
    snps: dict[str, SnpRecord]  # keyed by rsid
    stats: dict[str, int]
    chip_version: str | None
    vendor: str


def parse_23andme(text: str) -> ParseResult:
    """Parse 23andMe raw genotype text into structured records.

    Privacy: operates purely in memory on the passed-in string. The caller must
    never persist the raw text or the returned genotypes to disk.
    """
    snps: dict[str, SnpRecord] = {}
    no_calls = 0
    malformed = 0

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = line.split("\t")
        if len(parts) != 4:
            malformed += 1
            continue

        rsid, chromosome, position, genotype = parts
        genotype = genotype.strip().upper()
        if genotype in ("--", "-"):
            no_calls += 1

        snps[rsid] = {
            "chromosome": chromosome,
            "position": position,
            "genotype": genotype,
        }

    return {
        "snps": snps,
        "stats": {
            "total": len(snps),
            "no_calls": no_calls,
            "malformed": malformed,
        },
        # TODO(P1): infer from position coverage.
        "chip_version": None,
        # TODO(P1): sniff header/columns to confirm 23andMe vs other vendors.
        "vendor": "23andMe",
    }


def genotype_for(parsed: ParseResult, rsid: str) -> str | None:
    """Return the genotype for an rsid, or None if the chip did not cover it.

    A missing rsid is a first-class case (chip coverage varies by version), not
    an error — callers should surface 'not measured on your chip' to the user.
    """
    record = parsed["snps"].get(rsid)
    if record is None:
        return None
    genotype = record["genotype"]
    return None if genotype in ("--", "-") else genotype
