"""Aggregate, cited region signal for the 3D globe visualization.

This module never geolocates a person or infers where they are "from." It
returns real, named reference populations (1000 Genomes Project and Human
Genome Diversity Project panels — public, citable, real sampling locations)
each carrying an *expected aggregate genetic similarity* to the user's own
already-measured, boundary-checked trait genotypes, computed from the same
published allele-frequency literature used in ``backend.comparison``.

A "you are here" marker is only ever placed when the user supplied their own
broad population label through the existing ``backend.ancestry`` flow — this
module never fabricates a location from DNA. If no label was supplied, or the
label was not recognized, there is no marker.
"""
from __future__ import annotations

from typing import Any

from backend.comparison import (
    ACTN3_FREQUENCIES,
    EARWAX_FREQUENCIES,
    LACTASE_FREQUENCIES,
    TAS2R38_FREQUENCIES,
    user_trait_genotypes,
)

ONE_THOUSAND_GENOMES_SOURCE = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/"
HGDP_SOURCE = "https://doi.org/10.1126/science.aay5012"

# Real, named reference populations with their real sampling-location
# coordinates (1000 Genomes Project phase 3; HGDP per Bergstrom et al.,
# Science 2020). Coordinates mark where the reference cohort was sampled,
# not a claim about any individual uploader's location.
POPULATIONS: list[dict[str, Any]] = [
    {"id": "CEU", "label": "Utah residents with Northern/Western European ancestry", "country": "United States", "lat": 40.7, "lon": -111.9, "group": "european", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "GBR", "label": "British in England and Scotland", "country": "United Kingdom", "lat": 54.0, "lon": -2.0, "group": "european", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "FIN", "label": "Finnish in Finland", "country": "Finland", "lat": 61.9, "lon": 25.7, "group": "european", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "TSI", "label": "Toscani in Italia", "country": "Italy", "lat": 43.8, "lon": 11.25, "group": "european", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "IBS", "label": "Iberian populations in Spain", "country": "Spain", "lat": 40.0, "lon": -4.0, "group": "european", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "YRI", "label": "Yoruba in Ibadan", "country": "Nigeria", "lat": 7.4, "lon": 3.9, "group": "african", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "LWK", "label": "Luhya in Webuye", "country": "Kenya", "lat": 0.6, "lon": 34.8, "group": "african", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "GWD", "label": "Gambian in Western Division", "country": "The Gambia", "lat": 13.4, "lon": -16.6, "group": "african", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "MSL", "label": "Mende in Sierra Leone", "country": "Sierra Leone", "lat": 8.5, "lon": -11.8, "group": "african", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "ASW", "label": "Americans of African ancestry in SW US", "country": "United States", "lat": 33.4, "lon": -112.1, "group": "african", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "CHB", "label": "Han Chinese in Beijing", "country": "China", "lat": 39.9, "lon": 116.4, "group": "east_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "JPT", "label": "Japanese in Tokyo", "country": "Japan", "lat": 35.7, "lon": 139.7, "group": "east_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "CHS", "label": "Southern Han Chinese", "country": "China", "lat": 23.1, "lon": 113.3, "group": "east_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "CDX", "label": "Chinese Dai in Xishuangbanna", "country": "China", "lat": 22.0, "lon": 100.8, "group": "southeast_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "KHV", "label": "Kinh in Ho Chi Minh City", "country": "Vietnam", "lat": 10.8, "lon": 106.7, "group": "southeast_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "GIH", "label": "Gujarati Indians (ancestral region: Gujarat)", "country": "India", "lat": 22.3, "lon": 72.6, "group": "south_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "PJL", "label": "Punjabi (ancestral region: Lahore)", "country": "Pakistan", "lat": 31.5, "lon": 74.3, "group": "south_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "BEB", "label": "Bengali", "country": "Bangladesh", "lat": 23.7, "lon": 90.4, "group": "south_asian", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "MXL", "label": "Mexican ancestry in Los Angeles", "country": "Mexico", "lat": 34.0, "lon": -118.2, "group": "hispanic_latino", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "PUR", "label": "Puerto Rican", "country": "Puerto Rico", "lat": 18.2, "lon": -66.5, "group": "hispanic_latino", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "CLM", "label": "Colombian in Medellin", "country": "Colombia", "lat": 6.2, "lon": -75.6, "group": "hispanic_latino", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "PEL", "label": "Peruvian in Lima", "country": "Peru", "lat": -12.0, "lon": -77.0, "group": "hispanic_latino", "source": ONE_THOUSAND_GENOMES_SOURCE},
    {"id": "Druze", "label": "Druze (HGDP)", "country": "Israel/Lebanon region", "lat": 32.7, "lon": 35.3, "group": "middle_eastern_north_african", "source": HGDP_SOURCE},
    {"id": "Bedouin", "label": "Bedouin (HGDP)", "country": "Negev region", "lat": 30.8, "lon": 34.8, "group": "middle_eastern_north_african", "source": HGDP_SOURCE},
    {"id": "Mozabite", "label": "Mozabite (HGDP)", "country": "Algeria", "lat": 32.0, "lon": 3.0, "group": "middle_eastern_north_african", "source": HGDP_SOURCE},
    {"id": "Maya", "label": "Maya (HGDP)", "country": "Mexico", "lat": 20.7, "lon": -89.1, "group": "indigenous_american", "source": HGDP_SOURCE},
    {"id": "Karitiana", "label": "Karitiana (HGDP)", "country": "Brazil", "lat": -9.3, "lon": -64.8, "group": "indigenous_american", "source": HGDP_SOURCE},
    {"id": "Papuan", "label": "Papuan (HGDP)", "country": "Papua New Guinea", "lat": -6.3, "lon": 143.9, "group": "pacific_islander", "source": HGDP_SOURCE},
    {"id": "Bougainville", "label": "Bougainville Islander (HGDP)", "country": "Papua New Guinea", "lat": -6.2, "lon": 155.0, "group": "pacific_islander", "source": HGDP_SOURCE},
]

_FREQUENCY_TABLES: dict[str, dict[str, dict[str, float]]] = {
    "rs4988235": LACTASE_FREQUENCIES,
    "rs17822931": EARWAX_FREQUENCIES,
    "rs1815739": ACTN3_FREQUENCIES,
    "tas2r38": TAS2R38_FREQUENCIES,
}


def _expected_similarity(user_genotypes: dict[str, str | None], group: str) -> float | None:
    scores = []
    for rsid, table in _FREQUENCY_TABLES.items():
        user_genotype = user_genotypes.get(rsid)
        if user_genotype is None:
            continue
        frequencies = table.get(group, {})
        scores.append(frequencies.get(user_genotype, 0.0))
    if not scores:
        return None
    return round(sum(scores) / len(scores), 4)


def build_population_map(
    report: dict[str, Any], population_context: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Return real reference populations with a cited, expected similarity.

    ``population_context`` is the already-normalized object from
    ``backend.ancestry.normalize_population_label`` (as included in the
    ``/api/analyze`` response's ``population_context`` field). It is used
    only to place an optional, explicitly self-supplied "you" marker.
    """
    user_genotypes = user_trait_genotypes(report)

    entries = []
    for population in POPULATIONS:
        similarity = _expected_similarity(user_genotypes, population["group"])
        entries.append(
            {
                **population,
                "expected_similarity": similarity,
            }
        )

    you_marker = None
    canonical_key = (population_context or {}).get("canonical_key")
    if canonical_key:
        match = next((p for p in POPULATIONS if p["group"] == canonical_key), None)
        if match is not None:
            you_marker = {
                "population_id": match["id"],
                "source": "user_supplied_label",
                "label": (population_context or {}).get("canonical_label"),
            }

    return {
        "populations": entries,
        "you_marker": you_marker,
        "disclaimer": (
            "This map shows real, named reference populations and an expected "
            "aggregate similarity computed from published allele-frequency "
            "literature for your already-measured traits. It does not locate, "
            "classify, or assign an ancestry or ethnicity to you. The \"you\" "
            "marker, when present, reflects only a label you supplied yourself."
        ),
        "citations": [
            {"label": "1000 Genomes Project global reference", "url": ONE_THOUSAND_GENOMES_SOURCE},
            {"label": "Human Genome Diversity Project panel (Bergstrom et al., 2020)", "url": HGDP_SOURCE},
        ],
    }
