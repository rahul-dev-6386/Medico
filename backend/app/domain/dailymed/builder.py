"""
JSON builder.

Takes a parsed and extracted DrugDocument and serializes it
to one consistent JSON object per drug.

Output format:
  {
    "set_id": "...",
    "generic_name": "...",
    "brand_names": [...],
    "basic_info": { ... },
    "clinical": { ... },
    "dosage": { ... },
    "safety": { ... },
    "interactions": { ... },
    "pregnancy": { ... },
    "monitoring": { ... },
    "patient_counseling": { ... },
    "emergency": { ... },
    "references": { ... },
    "ingestion_timestamp": "..."
  }
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from app.domain.dailymed.models import DrugDocument


OUTPUT_DIR = "data/dailymed_json"


def set_output_dir(path: str) -> None:
    global OUTPUT_DIR
    OUTPUT_DIR = path


def build_json(doc: DrugDocument) -> dict[str, Any]:
    doc.ingestion_timestamp = datetime.now(timezone.utc).isoformat()
    return doc.model_dump(exclude_none=True)


def write_drug_json(doc: DrugDocument, output_dir: Optional[str] = None) -> str:
    if output_dir is None:
        output_dir = OUTPUT_DIR
    os.makedirs(output_dir, exist_ok=True)

    name = doc.generic_name or doc.set_id
    if " " in name and len(name) > 40:
        parts = name.split()
        name = " ".join(parts[:6])
    safe_name = _safe_filename(name)
    filepath = os.path.join(output_dir, f"{safe_name}.json")

    data = build_json(doc)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    return filepath


def read_drug_json(filepath: str) -> Optional[DrugDocument]:
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return DrugDocument(**data)


def _safe_filename(name: str) -> str:
    safe = "".join(c if c.isalnum() or c in ("-", "_", " ") else "_" for c in name)
    safe = safe.strip().lower().replace(" ", "_")
    safe = safe[:200]
    return safe or "unknown_drug"
