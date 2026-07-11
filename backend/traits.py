"""Safe, non-medical trait SNP allowlist — the heart of the project.

Default-allow ONLY these vetted, non-clinical trait SNPs. Everything else is
refused by boundaries.py. Each entry has a plain-language genotype map and an
evidence note that says where the association was established.

Mappings are curated for the plus strand reported in downloaded 23andMe
GRCh37 files; ``lookup`` verifies the parsed build before assigning a meaning.
Alleles may therefore be complementary to alleles named on another strand in a
paper.
"""
from __future__ import annotations

from typing import NotRequired, TypedDict

from backend.parser import ParseResult, genotype_for


class TraitEntry(TypedDict):
    rsid: str
    name: str
    genotype_meanings: dict[str, str]
    european_validation_note: str
    citation: str
    additional_citations: NotRequired[list[dict[str, str]]]


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
            "The original association established this European lactase-persistence "
            "marker. Primary work in African populations identified other functional "
            "variants, so this single marker is incomplete outside that context."
        ),
        "citation": "https://pubmed.ncbi.nlm.nih.gov/11788828/",
        "additional_citations": [
            {
                "url": "https://pubmed.ncbi.nlm.nih.gov/17159977/",
                "label": "Tishkoff et al., Nature Genetics (2007) African persistence variants",
            }
        ],
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
            "functional testing; the primary study also surveyed worldwide allele "
            "frequencies, not earwax phenotypes in every sampled population."
        ),
        "citation": "https://doi.org/10.1038/ng1733",
    },
    "rs713598": {
        "rsid": "rs713598",
        "name": "PTC/PROP bitter-taste perception (TAS2R38 position 1 of 3)",
        "genotype_meanings": {
            "GG": "Supports the common bitter-sensitive PAV haplotype.",
            "CG": "One PAV-associated and one AVI-associated allele at this position; this marker alone cannot assign a diplotype or taste-sensitivity category.",
            "CC": "Supports the common less-sensitive AVI haplotype.",
        },
        "european_validation_note": (
            "This is one position in a three-marker TAS2R38 haplotype. Raw calls "
            "are unphased, rarer haplotypes occur, and one marker alone cannot "
            "assign a diplotype or taste-sensitivity category."
        ),
        "citation": "https://pubmed.ncbi.nlm.nih.gov/12595690/",
        "additional_citations": [
            {
                "url": "https://pubmed.ncbi.nlm.nih.gov/15723792/",
                "label": "Bufe et al., Current Biology (2005) functional haplotype evidence",
            },
            {
                "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC1181941/",
                "label": "Wooding et al., AJHG (2004) haplotype diversity",
            },
        ],
    },
    "rs1726866": {
        "rsid": "rs1726866",
        "name": "PTC/PROP bitter-taste perception (TAS2R38 position 2 of 3)",
        "genotype_meanings": {
            "GG": "Supports the common bitter-sensitive PAV haplotype.",
            "AG": "One PAV-associated and one AVI-associated allele at this position; this marker alone cannot assign a diplotype or taste-sensitivity category.",
            "AA": "Supports the common less-sensitive AVI haplotype.",
        },
        "european_validation_note": (
            "This is one position in a three-marker TAS2R38 haplotype. Raw calls "
            "are unphased, rarer haplotypes occur, and one marker alone cannot "
            "assign a diplotype or taste-sensitivity category."
        ),
        "citation": "https://pubmed.ncbi.nlm.nih.gov/12595690/",
        "additional_citations": [
            {
                "url": "https://pubmed.ncbi.nlm.nih.gov/15723792/",
                "label": "Bufe et al., Current Biology (2005) functional haplotype evidence",
            },
            {
                "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC1181941/",
                "label": "Wooding et al., AJHG (2004) haplotype diversity",
            },
        ],
    },
    "rs10246939": {
        "rsid": "rs10246939",
        "name": "PTC/PROP bitter-taste perception (TAS2R38 position 3 of 3)",
        "genotype_meanings": {
            "CC": "Supports the common bitter-sensitive PAV haplotype.",
            "CT": "One PAV-associated and one AVI-associated allele at this position; this marker alone cannot assign a diplotype or taste-sensitivity category.",
            "TT": "Supports the common less-sensitive AVI haplotype.",
        },
        "european_validation_note": (
            "This is one position in a three-marker TAS2R38 haplotype. Raw calls "
            "are unphased, rarer haplotypes occur, and one marker alone cannot "
            "assign a diplotype or taste-sensitivity category."
        ),
        "citation": "https://pubmed.ncbi.nlm.nih.gov/12595690/",
        "additional_citations": [
            {
                "url": "https://pubmed.ncbi.nlm.nih.gov/15723792/",
                "label": "Bufe et al., Current Biology (2005) functional haplotype evidence",
            },
            {
                "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC1181941/",
                "label": "Wooding et al., AJHG (2004) haplotype diversity",
            },
        ],
    },
    "rs10427255": {
        "rsid": "rs10427255",
        "name": "Photic sneeze reflex",
        "genotype_meanings": {
            "CC": "This marker was associated with photic sneeze in self-reported studies, but the higher-odds allele differed between cohorts, so this report does not assign a portable genotype direction.",
            "CT": "This marker was associated with photic sneeze in self-reported studies, but the higher-odds allele differed between cohorts, so this report does not assign a portable genotype direction.",
            "TT": "This marker was associated with photic sneeze in self-reported studies, but the higher-odds allele differed between cohorts, so this report does not assign a portable genotype direction.",
        },
        "european_validation_note": (
            "The locus-level association appeared in an original northern-European "
            "cohort and in 3,417 Chinese participants, but the reported higher-odds "
            "allele switched from C to T. The intergenic marker is not known to be "
            "causal, so a universal higher/lower interpretation would be misleading."
        ),
        "citation": "https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1000993",
        "additional_citations": [
            {
                "url": "https://www.nature.com/articles/s41598-019-41551-0",
                "label": "Wang et al., Scientific Reports (2019) cross-population replication",
            }
        ],
    },
    "rs1815739": {
        "rsid": "rs1815739",
        "name": "ACTN3 alpha-actinin-3 production (R577X)",
        "genotype_meanings": {
            "CC": "Produces alpha-actinin-3 in fast-twitch muscle fibers (the ACTN3 RR form).",
            "CT": "Produces alpha-actinin-3 from one gene copy (the ACTN3 RX form).",
            "TT": "Does not produce alpha-actinin-3 (the common, benign ACTN3 XX form).",
        },
        "european_validation_note": (
            "The protein effect is established: the X577 form causes alpha-actinin-3 "
            "deficiency. Performance studies have reported conflicting results, so "
            "this call does not predict an individual's athletic ability."
        ),
        "citation": "https://pubmed.ncbi.nlm.nih.gov/10192379/",
        "additional_citations": [
            {
                "url": "https://pubmed.ncbi.nlm.nih.gov/12879365/",
                "label": "Yang et al., AJHG (2003) performance association",
            },
            {
                "url": "https://pubmed.ncbi.nlm.nih.gov/20845221/",
                "label": "Döring et al., J Sports Sci (2010) non-replication",
            },
        ],
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
            "using a separate cilantro-preference phenotype. The marker explained "
            "about 0.5% of variation in soapy-taste reporting; the study did not "
            "identify what explains the remaining variation."
        ),
        "citation": "https://link.springer.com/article/10.1186/2044-7248-1-22",
    },
}

TAS2R38_RSIDS = ("rs713598", "rs1726866", "rs10246939")
_TAS2R38_PAV_HOMOZYGOUS = {
    "rs713598": "GG",
    "rs1726866": "GG",
    "rs10246939": "CC",
}
_TAS2R38_AVI_HOMOZYGOUS = {
    "rs713598": "CC",
    "rs1726866": "AA",
    "rs10246939": "TT",
}


def _citations(entry: TraitEntry) -> list[dict[str, str]]:
    return [
        {
            "url": entry["citation"],
            "label": f"Primary evidence for {entry['name']}",
        },
        *entry.get("additional_citations", []),
    ]


def _tas2r38_result(parsed: ParseResult) -> dict:
    """Return one conservative three-marker result from unphased raw calls."""
    calls = {rsid: genotype_for(parsed, rsid) for rsid in TAS2R38_RSIDS}
    canonical_calls = {
        rsid: "".join(sorted(genotype)) if genotype else None
        for rsid, genotype in calls.items()
    }
    measured = all(call is not None for call in canonical_calls.values())
    reference_build = parsed.get("reference_build")
    evidence_note = (
        "TAS2R38 sensitivity evidence is based on the combined PAV/AVI haplotype. "
        "Raw consumer calls are unphased and rarer haplotypes occur, so only "
        "unambiguous all-PAV or all-AVI homozygous patterns receive a direction."
    )

    if not measured:
        interpretation = (
            "The complete three-marker TAS2R38 set was not measured on this chip, "
            "so no bitter-taste category was assigned."
        )
        status = "not_fully_measured"
        interpretable = False
    elif reference_build != "GRCh37":
        interpretation = (
            "Trait allele orientation was curated for 23andMe GRCh37 plus-strand "
            "data; this file's build could not be verified as GRCh37, so no "
            "genotype meaning was assigned."
        )
        status = "unverified_reference_build"
        interpretable = False
    elif canonical_calls == _TAS2R38_PAV_HOMOZYGOUS:
        interpretation = (
            "All three calls support a PAV/PAV pattern, which was associated with "
            "higher PTC/PROP bitter sensitivity in the cited functional evidence; "
            "it is not a deterministic prediction of taste experience."
        )
        status = "interpreted"
        interpretable = True
    elif canonical_calls == _TAS2R38_AVI_HOMOZYGOUS:
        interpretation = (
            "All three calls support an AVI/AVI pattern, which was associated with "
            "lower PTC/PROP bitter sensitivity in the cited functional evidence; "
            "it is not a deterministic prediction of taste experience."
        )
        status = "interpreted"
        interpretable = True
    else:
        interpretation = (
            "All three markers were measured, but the unphased calls and possible "
            "rarer haplotypes do not support a confident diplotype or taste-"
            "sensitivity category."
        )
        status = "unresolved_haplotype"
        interpretable = False

    entry = ALLOWLIST[TAS2R38_RSIDS[0]]
    return {
        "rsid": "/".join(TAS2R38_RSIDS),
        "rsids": list(TAS2R38_RSIDS),
        "name": "PTC/PROP bitter-taste perception (TAS2R38 three-marker haplotype)",
        "genotype": calls if measured else None,
        "marker_calls": calls,
        "measured": measured,
        "partially_measured": any(call is not None for call in calls.values()),
        "interpretable": interpretable,
        "interpretation_status": status,
        "interpretation": interpretation,
        "evidence_note": evidence_note,
        "citation": entry["citation"],
        "citations": _citations(entry),
        "reference_build": reference_build,
    }


def lookup(parsed: ParseResult) -> list[dict]:
    """Return an interpretation row for every allowlisted SNP.

    A trait whose rsid is absent from the chip is reported as "not measured",
    not silently dropped. Alleles are sorted before lookup so AG and GA calls
    behave identically without changing the parser's stored raw call.
    """
    results = []
    reference_build = parsed.get("reference_build")
    supported_build = reference_build == "GRCh37"
    for rsid, entry in ALLOWLIST.items():
        if rsid in TAS2R38_RSIDS:
            if rsid == TAS2R38_RSIDS[0]:
                results.append(_tas2r38_result(parsed))
            continue
        genotype = genotype_for(parsed, rsid)
        canonical_genotype = "".join(sorted(genotype)) if genotype else None
        if canonical_genotype is None:
            interpretation = "Not measured on this chip."
            interpretation_status = "not_measured"
            interpretable = False
        elif not supported_build:
            interpretation = (
                "Trait allele orientation was curated for 23andMe GRCh37 "
                "plus-strand data; this file's build could not be verified as "
                "GRCh37, so no genotype meaning was assigned."
            )
            interpretation_status = "unverified_reference_build"
            interpretable = False
        elif canonical_genotype in entry["genotype_meanings"]:
            interpretation = entry["genotype_meanings"][canonical_genotype]
            interpretation_status = "interpreted"
            interpretable = True
        else:
            interpretation = "Measured, but this genotype is not mapped by the curated evidence."
            interpretation_status = "unmapped_genotype"
            interpretable = False

        results.append(
            {
                "rsid": rsid,
                "name": entry["name"],
                "genotype": genotype,
                "measured": genotype is not None,
                "interpretable": interpretable,
                "interpretation_status": interpretation_status,
                "interpretation": interpretation,
                "evidence_note": entry["european_validation_note"],
                "citation": entry["citation"],
                "citations": _citations(entry),
                "reference_build": reference_build,
            }
        )
    return results
