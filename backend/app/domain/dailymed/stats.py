"""
Quality validation and ingestion statistics for the DailyMed pipeline.

Rejects incomplete records.
Warns when required sections are missing.
Generates a summary report.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from app.domain.dailymed.models import DrugDocument

logger = logging.getLogger("dailymed.stats")

REQUIRED_SECTIONS = [
    "generic_name",
    "clinical.indications_and_usage",
    "safety.contraindications",
    "safety.adverse_reactions",
]

IMPORTANT_SECTIONS = [
    "clinical.mechanism_of_action",
    "dosage.adult_dosage",
    "safety.warnings",
    "interactions.drug_interactions",
    "pregnancy.pregnancy",
    "patient_counseling.instructions",
    "emergency.overdose",
]


@dataclass
class IngestionStats:
    total_drugs: int = 0
    successful: int = 0
    failed: int = 0
    skipped_duplicates: int = 0
    missing_required: list[str] = field(default_factory=list)
    missing_important: dict[str, list[str]] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    start_time: float = 0.0
    end_time: float = 0.0

    @property
    def elapsed(self) -> float:
        return self.end_time - self.start_time


def validate_document(doc: DrugDocument) -> tuple[bool, list[str], list[str]]:
    missing_required: list[str] = []
    missing_important: list[str] = []

    for section_path in REQUIRED_SECTIONS:
        if not _get_value_by_path(doc, section_path):
            missing_required.append(section_path)

    for section_path in IMPORTANT_SECTIONS:
        if not _get_value_by_path(doc, section_path):
            missing_important.append(section_path)

    is_valid = len(missing_required) == 0

    if missing_required:
        logger.warning(
            f"Document {doc.generic_name or doc.set_id}: "
            f"missing required sections: {missing_required}"
        )
    if missing_important:
        logger.info(
            f"Document {doc.generic_name or doc.set_id}: "
            f"missing important sections: {missing_important}"
        )

    return is_valid, missing_required, missing_important


def _get_value_by_path(doc: DrugDocument, path: str) -> Any:
    parts = path.split(".")
    current: Any = doc
    for part in parts:
        current = getattr(current, part, None)
        if current is None:
            return None
        if isinstance(current, list):
            return current if current else None
    return current


def print_stats(stats: IngestionStats) -> None:
    elapsed = stats.elapsed
    rate = stats.successful / elapsed if elapsed > 0 else 0

    lines = [
        "=" * 60,
        "DAILYMED INGESTION REPORT",
        "=" * 60,
        f"  Total drugs processed:  {stats.total_drugs}",
        f"  Successfully ingested:  {stats.successful}",
        f"  Failed:                {stats.failed}",
        f"  Skipped (duplicates):  {stats.skipped_duplicates}",
        f"  Elapsed:               {elapsed:.1f}s",
        f"  Rate:                  {rate:.1f} drugs/s",
    ]

    if stats.missing_required:
        lines.append(f"\n  Drugs with missing required sections: {len(stats.missing_required)}")
        for drug in stats.missing_required[:20]:
            lines.append(f"    - {drug}")
        if len(stats.missing_required) > 20:
            lines.append(f"    ... and {len(stats.missing_required) - 20} more")

    if stats.missing_important:
        lines.append(f"\n  Drugs with missing important sections: {len(stats.missing_important)}")

    if stats.errors:
        lines.append(f"\n  Errors ({len(stats.errors)}):")
        for err in stats.errors[:20]:
            lines.append(f"    - {err}")

    lines.append("=" * 60)
    lines.append("VALIDATION SUMMARY")
    lines.append("=" * 60)
    total_with_req = stats.successful - max(0, len(stats.missing_required))
    lines.append(f"  Fully compliant:           {total_with_req}")
    lines.append(f"  Missing required sections: {len(stats.missing_required)}")
    lines.append("=" * 60)

    report = "\n".join(lines)
    print(report)
    logger.info(f"\n{report}")
