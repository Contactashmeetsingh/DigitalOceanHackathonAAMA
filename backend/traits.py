"""Safe, non-medical trait SNP allowlist — the heart of the project.

Default-allow ONLY these vetted, non-clinical trait SNPs. Everything else is
refused by boundaries.py. Each entry needs: plain-language meaning, a
genotype->meaning map, and a CITED "validated in ~X% European cohort -> why the
inference is weaker for non-European users" line.

TODO(P1 — build core, then TODO(codex) expand to 6-8 cited entries):
  seed with rs4988235 (lactase persistence), rs17822931 (earwax), PTC bitter
  taste, photic sneeze. Real citations, non-medical only.
"""
from __future__ import annotations

from typing import TypedDict

from backend.parser import ParseResult, genotype_for


class TraitEntry(TypedDict):
    rsid: str
    name: str
    genotype_meanings: dict[str, str]
    european_validation_note: str  # the cited "why it's vaguer for your group" line
    citation: str


# TODO(P1): fill in real genotype maps + real citations for each.
ALLOWLIST: dict[str, TraitEntry] = {
    "rs4988235": {
        "rsid": "rs4988235",
        "name": "Lactase persistence (lactose tolerance)",
        "genotype_meanings": {},  # TODO(P1)
        "european_validation_note": "",  # TODO(P1): cite cohort composition
        "citation": "",  # TODO(P1)
    },
    "rs17822931": {
        "rsid": "rs17822931",
        "name": "Earwax type (wet/dry)",
        "genotype_meanings": {},  # TODO(P1)
        "european_validation_note": "",  # TODO(P1)
        "citation": "",  # TODO(P1)
    },
    # TODO(codex): PTC bitter taste, photic sneeze, + 2 more.
}


def lookup(parsed: ParseResult) -> list[dict]:
    """Return interpretation rows for allowlisted SNPs present on the chip.

    A trait whose rsid is absent from the chip is reported as 'not measured',
    not silently dropped.
    """
    results = []
    for rsid, entry in ALLOWLIST.items():
        genotype = genotype_for(parsed, rsid)
        results.append(
            {
                "rsid": rsid,
                "name": entry["name"],
                "genotype": genotype,
                "measured": genotype is not None,
                # TODO(P1): map genotype -> meaning + attach european_validation_note.
            }
        )
    return results
