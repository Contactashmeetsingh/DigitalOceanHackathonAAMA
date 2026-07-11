"""Safe, non-medical trait SNP allowlist — the heart of the project.

Default-allow ONLY these vetted, non-clinical trait SNPs. Everything else is
refused by boundaries.py. Each entry has a plain-language genotype map and an
evidence note that says where the association was established.

Genotypes use the plus strand reported in downloaded 23andMe build-37 files;
they may therefore be complementary to alleles named in a paper.
"""
from __future__ import annotations

from typing import TypedDict

from backend.parser import ParseResult, genotype_for


class TraitEntry(TypedDict):
    rsid: str
    name: str
    genotype_meanings: dict[str, str]
    european_validation_note: str
    citation: str


ALLOWLIST: dict[str, TraitEntry] = {
    "rs4988235": {
        "rsid": "rs4988235",
        "name": "Lactase persistence",
        "genotype_meanings": {
            "AA": "Two copies of the allele associated with keeping lactase activity into adulthood.",
            "AG": "One copy of the allele associated with keeping lactase activity into adulthood.",
            "GG": "No copy of this European-associated lactase-persistence allele; this does not account for other populations' persistence variants.",
        },
        "european_validation_note": (
            "Well established for European-associated lactase persistence, but "
            "other populations can carry different functional variants, so this "
            "single marker is incomplete outside that context."
        ),
        "citation": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6723957/",
    },
    "rs17822931": {
        "rsid": "rs17822931",
        "name": "Earwax type (wet/dry)",
        "genotype_meanings": {
            "CC": "Associated with wet earwax.",
            "CT": "Associated with wet earwax; the wet-associated allele is dominant.",
            "TT": "Associated with dry earwax.",
        },
        "european_validation_note": (
            "A strongly replicated single-variant trait first demonstrated with "
            "functional testing and worldwide population sampling."
        ),
        "citation": "https://doi.org/10.1038/ng1733",
    },
    "rs713598": {
        "rsid": "rs713598",
        "name": "PTC/PROP bitter-taste perception (TAS2R38 position 1 of 3)",
        "genotype_meanings": {
            "GG": "Supports the common bitter-sensitive PAV haplotype.",
            "CG": "One sensitive-associated and one insensitive-associated allele; often intermediate, but the other TAS2R38 markers matter.",
            "CC": "Supports the common less-sensitive AVI haplotype.",
        },
        "european_validation_note": (
            "Well replicated as part of a three-marker TAS2R38 haplotype; this "
            "marker alone cannot assign taster status and rarer haplotypes vary "
            "among populations."
        ),
        "citation": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4467798/",
    },
    "rs1726866": {
        "rsid": "rs1726866",
        "name": "PTC/PROP bitter-taste perception (TAS2R38 position 2 of 3)",
        "genotype_meanings": {
            "GG": "Supports the common bitter-sensitive PAV haplotype.",
            "AG": "One sensitive-associated and one insensitive-associated allele; often intermediate, but the other TAS2R38 markers matter.",
            "AA": "Supports the common less-sensitive AVI haplotype.",
        },
        "european_validation_note": (
            "Well replicated as part of a three-marker TAS2R38 haplotype; this "
            "marker alone cannot assign taster status and rarer haplotypes vary "
            "among populations."
        ),
        "citation": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4467798/",
    },
    "rs10246939": {
        "rsid": "rs10246939",
        "name": "PTC/PROP bitter-taste perception (TAS2R38 position 3 of 3)",
        "genotype_meanings": {
            "CC": "Supports the common bitter-sensitive PAV haplotype.",
            "CT": "One sensitive-associated and one insensitive-associated allele; often intermediate, but the other TAS2R38 markers matter.",
            "TT": "Supports the common less-sensitive AVI haplotype.",
        },
        "european_validation_note": (
            "Well replicated as part of a three-marker TAS2R38 haplotype; this "
            "marker alone cannot assign taster status and rarer haplotypes vary "
            "among populations."
        ),
        "citation": "https://pmc.ncbi.nlm.nih.gov/articles/PMC4467798/",
    },
    "rs10427255": {
        "rsid": "rs10427255",
        "name": "Photic sneeze reflex",
        "genotype_meanings": {
            "CC": "Associated with higher odds of sneezing after sudden bright light exposure.",
            "CT": "Associated with moderately higher odds of the photic sneeze reflex than TT.",
            "TT": "Associated with lower odds of the photic sneeze reflex.",
        },
        "european_validation_note": (
            "A GWAS association first reported in a large European-ancestry "
            "cohort and replicated at the same marker in 3,417 Chinese participants; "
            "it changes odds and is not deterministic."
        ),
        "citation": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6428856/",
    },
    "rs1815739": {
        "rsid": "rs1815739",
        "name": "ACTN3 alpha-actinin-3 muscle composition",
        "genotype_meanings": {
            "CC": "Produces alpha-actinin-3 in fast-twitch muscle fibers (the ACTN3 RR form).",
            "CT": "Produces alpha-actinin-3 from one gene copy (the ACTN3 RX form).",
            "TT": "Does not produce alpha-actinin-3 (the common, benign ACTN3 XX form).",
        },
        "european_validation_note": (
            "The protein effect is well established, while links to whole-person "
            "performance are mixed and small; this is not athletic-potential or "
            "training advice."
        ),
        "citation": "https://pubmed.ncbi.nlm.nih.gov/17848603/",
    },
    "rs72921001": {
        "rsid": "rs72921001",
        "name": "Cilantro soapy-taste perception",
        "genotype_meanings": {
            "CC": "Associated with higher odds of detecting a soapy cilantro taste in the original study.",
            "AC": "Associated with intermediate odds of detecting a soapy cilantro taste.",
            "AA": "Associated with lower odds of detecting a soapy cilantro taste.",
        },
        "european_validation_note": (
            "Found in 14,604 primarily European-ancestry participants and replicated "
            "in a separate preference cohort, but the marker explained only about "
            "0.5% of variation, so experience and culture matter much more."
        ),
        "citation": "https://arxiv.org/abs/1209.2096",
    },
}


def lookup(parsed: ParseResult) -> list[dict]:
    """Return an interpretation row for every allowlisted SNP.

    A trait whose rsid is absent from the chip is reported as "not measured",
    not silently dropped. Alleles are sorted before lookup so AG and GA calls
    behave identically without changing the parser's stored raw call.
    """
    results = []
    for rsid, entry in ALLOWLIST.items():
        genotype = genotype_for(parsed, rsid)
        canonical_genotype = "".join(sorted(genotype)) if genotype else None
        interpretation = (
            entry["genotype_meanings"].get(
                canonical_genotype,
                "Measured, but this genotype is not mapped by the curated evidence.",
            )
            if canonical_genotype
            else "Not measured on this chip."
        )
        results.append(
            {
                "rsid": rsid,
                "name": entry["name"],
                "genotype": genotype,
                "measured": genotype is not None,
                "interpretation": interpretation,
                "evidence_note": entry["european_validation_note"],
                "citation": entry["citation"],
            }
        )
    return results
