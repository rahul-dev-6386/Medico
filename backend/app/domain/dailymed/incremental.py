"""
Incremental update support for DailyMed SPL labels.

Tracks which SPLs have been ingested and only processes
new, updated, or deleted labels since the last run.

Uses DailyMed's application notes API which provides revision dates.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

logger = logging.getLogger("dailymed.incremental")

STATE_FILE = "data/dailymed_state.json"


def set_state_file(path: str) -> None:
    global STATE_FILE
    STATE_FILE = path


def load_state() -> dict[str, Any]:
    if not os.path.exists(STATE_FILE):
        return {"version": 1, "ingested_spls": {}, "last_run": None}
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning(f"Could not load state file: {e}")
        return {"version": 1, "ingested_spls": {}, "last_run": None}


def save_state(state: dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def mark_ingested(state: dict[str, Any], set_id: str, revision_date: Optional[str] = None) -> None:
    state["ingested_spls"][set_id] = {
        "revision_date": revision_date,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


def mark_deleted(state: dict[str, Any], set_id: str) -> None:
    state["ingested_spls"].pop(set_id, None)


def get_spls_to_update(
    state: dict[str, Any],
    spls: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    to_ingest: list[dict[str, Any]] = []
    to_delete: list[str] = []

    ingested = state.get("ingested_spls", {})
    current_set_ids = set()

    for spl in spls:
        set_id = spl.get("setid")
        if not set_id:
            continue
        current_set_ids.add(set_id)

        spl_revision = spl.get("spl_version") or spl.get("effective_time")
        stored = ingested.get(set_id)

        if stored is None:
            to_ingest.append(spl)
        elif spl_revision and stored.get("revision_date") != spl_revision:
            to_ingest.append(spl)

    for set_id in ingested:
        if set_id not in current_set_ids:
            to_delete.append(set_id)

    return to_ingest, to_delete


def check_for_updates_via_api(
    state: dict[str, Any],
    drug_name: Optional[str] = None,
    limit: int = 1000,
) -> tuple[list[dict[str, Any]], list[str]]:
    from app.domain.dailymed.downloader import list_spls

    all_spls: list[dict[str, Any]] = []
    offset = 0
    while True:
        batch = list_spls(drug_name=drug_name, limit=limit, offset=offset)
        if not batch:
            break
        all_spls.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    return get_spls_to_update(state, all_spls)
