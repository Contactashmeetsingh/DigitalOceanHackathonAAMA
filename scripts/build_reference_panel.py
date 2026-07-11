#!/usr/bin/env python3
"""Build the compact 1000 Genomes frequency panel used by the audit UI.

Raw PGEN/PVAR data stays outside Git. This script consumes PLINK 2 ``--freq``
outputs for the deterministic SNP set documented in ``data/reference/README.md``
and writes a gzip-compressed runtime artifact. NumPy is only a build-time
dependency; the Flask application loads the completed artifact with the Python
standard library.
"""

from __future__ import annotations

import argparse
from collections import Counter
import csv
import glob
import gzip
import hashlib
import json
from pathlib import Path
import re
from typing import Any

try:
    import numpy as np
except ImportError as error:  # pragma: no cover - exercised by operator setup
    raise SystemExit("NumPy is required to build the reference artifact.") from error


PLINK_RESOURCES_URL = "https://www.cog-genomics.org/plink/2.0/resources#1kg_phase3"
POPULATIONS_URL = (
    "https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase3/"
    "20131219.populations.tsv"
)
SUPERPOPULATIONS_URL = (
    "https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase3/"
    "20131219.superpopulations.tsv"
)

# Approximate display anchors derived from the location phrases in the official
# population descriptions. They are not participant residences or inferred
# origins. Broad descriptions intentionally use broad country/region anchors.
DISPLAY_ANCHORS: dict[str, dict[str, object]] = {
    "ACB": {"lat": 13.19, "lon": -59.54, "precision": "country", "label": "Barbados"},
    "ASW": {"lat": 34.05, "lon": -111.09, "precision": "region", "label": "Southwest United States"},
    "BEB": {"lat": 23.68, "lon": 90.36, "precision": "country", "label": "Bangladesh"},
    "CDX": {"lat": 22.01, "lon": 100.80, "precision": "region", "label": "Xishuangbanna, China"},
    "CEU": {"lat": 39.32, "lon": -111.09, "precision": "region", "label": "Utah, United States"},
    "CHB": {"lat": 39.90, "lon": 116.41, "precision": "city", "label": "Beijing, China"},
    "CHS": {"lat": 23.13, "lon": 113.26, "precision": "region", "label": "Southern China"},
    "CLM": {"lat": 6.24, "lon": -75.58, "precision": "city", "label": "Medellín, Colombia"},
    "ESN": {"lat": 6.34, "lon": 5.62, "precision": "region", "label": "Edo State, Nigeria"},
    "FIN": {"lat": 64.00, "lon": 26.00, "precision": "country", "label": "Finland"},
    "GBR": {"lat": 54.50, "lon": -3.50, "precision": "region", "label": "England and Scotland"},
    "GIH": {"lat": 29.76, "lon": -95.37, "precision": "city", "label": "Houston, United States"},
    "GWD": {"lat": 13.28, "lon": -16.66, "precision": "region", "label": "Western Gambia"},
    "IBS": {"lat": 40.46, "lon": -3.75, "precision": "country", "label": "Spain"},
    "ITU": {"lat": 52.36, "lon": -1.17, "precision": "country", "label": "United Kingdom"},
    "JPT": {"lat": 35.68, "lon": 139.69, "precision": "city", "label": "Tokyo, Japan"},
    "KHV": {"lat": 10.82, "lon": 106.63, "precision": "city", "label": "Ho Chi Minh City, Vietnam"},
    "LWK": {"lat": 0.62, "lon": 34.77, "precision": "city", "label": "Webuye, Kenya"},
    "MSL": {"lat": 8.46, "lon": -11.78, "precision": "country", "label": "Sierra Leone"},
    "MXL": {"lat": 34.05, "lon": -118.24, "precision": "city", "label": "Los Angeles, United States"},
    "PEL": {"lat": -12.05, "lon": -77.04, "precision": "city", "label": "Lima, Peru"},
    "PJL": {"lat": 31.52, "lon": 74.36, "precision": "city", "label": "Lahore, Pakistan"},
    "PUR": {"lat": 18.22, "lon": -66.59, "precision": "country", "label": "Puerto Rico"},
    "STU": {"lat": 52.36, "lon": -1.17, "precision": "country", "label": "United Kingdom"},
    "TSI": {"lat": 43.77, "lon": 11.25, "precision": "region", "label": "Tuscany, Italy"},
    "YRI": {"lat": 7.38, "lon": 3.95, "precision": "city", "label": "Ibadan, Nigeria"},
}


def _sha256(path: Path | None) -> str | None:
    if path is None:
        return None
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_table(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source, delimiter="\t"))


def _read_sample_metadata(path: Path) -> tuple[Counter[str], dict[str, str]]:
    counts: Counter[str] = Counter()
    superpop_by_population: dict[str, str] = {}
    for row in _read_table(path):
        population = (row.get("Population") or "").strip()
        superpopulation = (row.get("SuperPop") or "").strip()
        if not population or not superpopulation:
            continue
        counts[population] += 1
        previous = superpop_by_population.setdefault(population, superpopulation)
        if previous != superpopulation:
            raise ValueError(f"Population {population} maps to multiple superpopulations")
    return counts, superpop_by_population


def _frequency_code(path: Path, prefix: str) -> str:
    match = re.fullmatch(re.escape(prefix) + r"\.([A-Z0-9]+)\.afreq", str(path))
    if not match:
        raise ValueError(f"Unexpected PLINK frequency filename: {path}")
    return match.group(1)


def _load_frequencies(
    prefix: str,
    population_codes: list[str],
) -> tuple[list[list[object]], np.ndarray]:
    paths = { _frequency_code(Path(name), prefix): Path(name) for name in glob.glob(f"{prefix}.*.afreq") }
    missing = sorted(set(population_codes) - set(paths))
    if missing:
        raise ValueError(f"Missing frequency files for: {', '.join(missing)}")

    variants: list[list[object]] = []
    frequency_columns: list[list[float]] = []
    expected_ids: list[str] | None = None
    for population in population_codes:
        rows = _read_table(paths[population])
        rows = [row for row in rows if re.fullmatch(r"rs[0-9]+", row.get("ID", ""))]
        ids = [row["ID"] for row in rows]
        if expected_ids is None:
            expected_ids = ids
            variants = [
                [row["ID"], row["#CHROM"], int(row["POS"]), row["REF"], row["ALT1"]]
                for row in rows
            ]
        elif ids != expected_ids:
            raise ValueError(f"Variant order differs in {paths[population]}")
        frequency_columns.append([float(row["ALT1_FREQ"]) for row in rows])

    matrix = np.asarray(frequency_columns, dtype=np.float64)
    if matrix.shape[1] < 1000:
        raise ValueError("Reference panel is unexpectedly small")
    return variants, matrix


def _classical_mds(frequencies: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    deltas = frequencies[:, None, :] - frequencies[None, :, :]
    distances = np.sqrt(np.mean(deltas * deltas, axis=2))
    count = distances.shape[0]
    centering = np.eye(count) - np.ones((count, count)) / count
    gram = -0.5 * centering @ (distances * distances) @ centering
    eigenvalues, eigenvectors = np.linalg.eigh(gram)
    order = np.argsort(eigenvalues)[::-1][:3]
    positive = np.maximum(eigenvalues[order], 0)
    coordinates = eigenvectors[:, order] * np.sqrt(positive)
    scale = float(np.max(np.linalg.norm(coordinates, axis=1))) or 1.0
    return coordinates / scale, distances


def build(args: argparse.Namespace) -> dict[str, Any]:
    sample_counts, sample_superpop = _read_sample_metadata(args.psam)
    description_rows = {
        row["Population Code"].strip(): row
        for row in _read_table(args.populations)
        if (row.get("Population Code") or "").strip()
    }
    superpopulation_names = {
        row["Population Code"].strip(): row["Description"].strip()
        for row in _read_table(args.superpopulations)
        if (row.get("Population Code") or "").strip()
    }
    population_codes = sorted(sample_counts, key=lambda code: (sample_superpop[code], code))
    if set(population_codes) != set(DISPLAY_ANCHORS):
        raise ValueError("Display anchors must exactly match the PSAM populations")

    variants, frequencies = _load_frequencies(args.frequency_prefix, population_codes)
    coordinates, population_distances = _classical_mds(frequencies)

    populations: list[dict[str, object]] = []
    for index, code in enumerate(population_codes):
        description = description_rows.get(code)
        if description is None:
            raise ValueError(f"Missing official description for {code}")
        sample_count = sample_counts[code]
        populations.append(
            {
                "code": code,
                "name": description["Population Description"].strip(),
                "superpopulation": sample_superpop[code],
                "superpopulation_name": superpopulation_names[sample_superpop[code]],
                "sample_count": sample_count,
                "thin_reference": sample_count < 80,
                "location": DISPLAY_ANCHORS[code],
                "mds_direction": [round(float(value), 6) for value in coordinates[index]],
            }
        )

    variant_rows = []
    for index, variant in enumerate(variants):
        scaled_frequencies = [int(round(value * 10_000)) for value in frequencies[:, index]]
        variant_rows.append([*variant, scaled_frequencies])

    source_files = {
        "all_phase3.pgen.zst": _sha256(args.pgen_zst),
        "all_phase3.pvar.zst": _sha256(args.pvar_zst),
        args.psam.name: _sha256(args.psam),
        args.populations.name: _sha256(args.populations),
        args.superpopulations.name: _sha256(args.superpopulations),
    }
    return {
        "schema_version": "1.0",
        "generated_on": args.generated_on,
        "reference_build": "GRCh37",
        "method": {
            "id": "allele-frequency-rms-distance",
            "label": "Allele-frequency distance (1000 Genomes Phase 3)",
            "description": (
                "Root-mean-square distance between the uploaded diploid allele "
                "fraction and each population's alternate-allele frequency over "
                "overlapping SNPs. The 3D angle is derived from classical MDS of "
                "population-frequency distances; radial length is user-specific."
            ),
            "selection": (
                "Autosomal biallelic A/C/G/T SNPs; palindromic SNPs excluded; "
                "global MAF >= 0.05; missingness <= 0.02; duplicate IDs excluded; "
                "LD pruning at 200 kb/r2 0.2; deterministic thin-count seed 20260711."
            ),
            "frequency_scale": 10_000,
            "minimum_overlap": 200,
            "panel_variant_count": len(variant_rows),
            "thin_reference_threshold": 80,
        },
        "sources": {
            "plink_resources": PLINK_RESOURCES_URL,
            "population_descriptions": POPULATIONS_URL,
            "superpopulation_descriptions": SUPERPOPULATIONS_URL,
            "release": "1000 Genomes Phase 3 primary release, 2016-05-05",
            "sample_count": sum(sample_counts.values()),
            "files_sha256": source_files,
        },
        "population_order": population_codes,
        "superpopulations": superpopulation_names,
        "populations": populations,
        "population_distance_matrix": [
            [round(float(value), 7) for value in row] for row in population_distances
        ],
        "variants": variant_rows,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--psam", type=Path, required=True)
    parser.add_argument("--populations", type=Path, required=True)
    parser.add_argument("--superpopulations", type=Path, required=True)
    parser.add_argument("--frequency-prefix", required=True)
    parser.add_argument("--pgen-zst", type=Path)
    parser.add_argument("--pvar-zst", type=Path)
    parser.add_argument("--generated-on", default="2026-07-11")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--metadata-output", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    artifact = build(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(artifact, separators=(",", ":"), sort_keys=True).encode("utf-8")
    args.output.write_bytes(gzip.compress(serialized, compresslevel=9, mtime=0))
    if args.metadata_output:
        metadata = {key: value for key, value in artifact.items() if key != "variants"}
        args.metadata_output.parent.mkdir(parents=True, exist_ok=True)
        args.metadata_output.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(
        f"Wrote {artifact['method']['panel_variant_count']} variants and "
        f"{len(artifact['populations'])} populations to {args.output}"
    )


if __name__ == "__main__":
    main()
