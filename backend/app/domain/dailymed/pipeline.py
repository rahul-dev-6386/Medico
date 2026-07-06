"""
Main DailyMed ingestion pipeline orchestrator.

Coordinates the full pipeline:
  Crawler -> Downloader -> XML Parser -> Section Extractor -> Normalizer
  -> JSON Builder -> PostgreSQL -> Vector Embeddings
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.database import SessionLocal
from app.domain.dailymed.crawler import crawl_by_drug_name
from app.domain.dailymed.downloader import download_spl_xml, set_download_dir
from app.domain.dailymed.parser import parse_spl_xml
from app.domain.dailymed.extractor import extract
from app.domain.dailymed.models import DrugDocument
from app.domain.dailymed.builder import write_drug_json, set_output_dir
from app.domain.dailymed.storage import store_drug_document
from app.domain.dailymed.incremental import (
    load_state,
    save_state,
    mark_ingested,
    mark_deleted,
    check_for_updates_via_api,
)
from app.domain.dailymed.stats import (
    IngestionStats,
    validate_document,
    print_stats,
)
from app.infrastructure.vector_store import vector_store

logger = logging.getLogger("dailymed.pipeline")


def run_pipeline(
    drug_names: Optional[list[str]] = None,
    set_ids: Optional[list[str]] = None,
    output_dir: str = "data/dailymed_json",
    xml_dir: str = "data/dailymed_xml",
    store_in_db: bool = True,
    generate_embeddings: bool = True,
    incremental: bool = True,
    skip_validation: bool = False,
    max_drugs: Optional[int] = None,
) -> IngestionStats:
    set_download_dir(xml_dir)
    set_output_dir(output_dir)
    os.makedirs(xml_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    stats = IngestionStats()
    stats.start_time = time.time()

    state = load_state() if incremental else {"version": 1, "ingested_spls": {}, "last_run": None}

    if drug_names:
        logger.info(f"Phase 1: Crawling {len(drug_names)} drug names from DailyMed API")
        spls = crawl_by_drug_name(drug_names)
    elif set_ids:
        spls = [{"setid": sid} for sid in set_ids]
    else:
        logger.info("Phase 1: Checking for updates via DailyMed API")
        to_ingest, to_delete = check_for_updates_via_api(state)
        spls = to_ingest
        for sid in to_delete:
            logger.info(f"Deleting withdrawn SPL: {sid}")
            mark_deleted(state, sid)

    if max_drugs:
        spls = spls[:max_drugs]

    stats.total_drugs = len(spls)
    logger.info(f"Phase 2: Processing {len(spls)} SPLs")

    for i, spl in enumerate(spls):
        set_id = spl.get("setid")
        drug_name = spl.get("title") or spl.get("generic_name") or set_id
        requested_name = spl.get("_requested_name")
        logger.info(f"[{i + 1}/{len(spls)}] {drug_name} ({set_id})")

        try:
            doc = _process_single_spl(set_id, xml_dir, output_dir, spl,
                                       fallback_name=requested_name)
            if doc is None:
                stats.failed += 1
                stats.errors.append(f"{set_id}: failed to parse")
                continue

            if not skip_validation:
                is_valid, missing_req, missing_imp = validate_document(doc)
                if not is_valid:
                    stats.missing_required.append(doc.generic_name or set_id)
                if missing_imp:
                    stats.missing_important[doc.generic_name or set_id] = missing_imp

            if store_in_db:
                success = store_drug_document(doc)
                if success:
                    stats.successful += 1
                else:
                    stats.failed += 1
                    stats.errors.append(f"{doc.generic_name}: DB storage failed")
                    continue
            else:
                stats.successful += 1

            # Write JSON file
            write_drug_json(doc, output_dir)
            revision = doc.references.revision_date
            mark_ingested(state, set_id, revision)

        except Exception as e:
            stats.failed += 1
            stats.errors.append(f"{set_id}: {e}")
            logger.exception(f"Failed to process {set_id}: {e}")

    state["last_run"] = datetime.now(timezone.utc).isoformat()
    save_state(state)
    stats.end_time = time.time()

    print_stats(stats)
    return stats


def _process_single_spl(
    set_id: str,
    xml_dir: str,
    output_dir: str,
    spl_data: Optional[dict] = None,
    fallback_name: Optional[str] = None,
) -> Optional[DrugDocument]:
    xml_path = os.path.join(xml_dir, f"{set_id}.xml")

    xml_bytes: Optional[bytes] = None
    if os.path.exists(xml_path):
        with open(xml_path, "rb") as f:
            xml_bytes = f.read()
    else:
        xml_bytes = download_spl_xml(set_id, xml_dir)

    if not xml_bytes:
        logger.warning(f"No XML content for {set_id}")
        return None

    parsed = parse_spl_xml(xml_bytes)
    if not parsed:
        logger.warning(f"Failed to parse XML for {set_id}")
        return None

    generic_name = (
        fallback_name
        or (spl_data.get("generic_name") if spl_data else None)
        or parsed.get("generic_name")
        or _extract_generic_from_title(parsed.get("title", ""))
        or set_id
    )

    brand_names: list[str] = []
    if spl_data:
        bn = spl_data.get("brand_name")
        if bn:
            brand_names = [bn]
    if not brand_names:
        title = parsed.get("title", "")
        if " - " in title:
            brand = title.split(" -")[0].strip()
            if brand and brand.lower() != generic_name.lower():
                brand_names = [brand]

    doc = DrugDocument(
        set_id=set_id,
        generic_name=generic_name,
        brand_names=brand_names,
    )
    doc.basic_info.brand_names = brand_names

    setattr(doc.references, "spl_set_id", set_id)
    if parsed.get("version_number"):
        doc.references.label_version = parsed["version_number"]
    if parsed.get("effective_time"):
        dt_val = parsed["effective_time"]
        if dt_val and len(dt_val) >= 8:
            doc.references.revision_date = f"{dt_val[:4]}-{dt_val[4:6]}-{dt_val[6:8]}"
    if parsed.get("manufacturer"):
        doc.references.manufacturer = parsed["manufacturer"]

    doc = extract(doc, parsed)
    return doc


def _extract_generic_from_title(title: str) -> Optional[str]:
    if not title:
        return None
    # "BRAND NAME - generic name (ingredient)..."
    if " - " in title:
        parts = title.split(" - ", 1)
        return parts[1].strip()
    # "GENERIC NAME (ingredient) DOSAGE FORM [MANUFACTURER]"
    title = title.strip()
    # Take the first meaningful segment before [ or (
    for sep in (" [", " (", " —"):
        idx = title.find(sep)
        if idx > 0:
            title = title[:idx]
            break
    return title.strip() if title else None


def process_single_drug(
    drug_name: str,
    output_dir: str = "data/dailymed_json",
    xml_dir: str = "data/dailymed_xml",
    store_in_db: bool = True,
) -> Optional[DrugDocument]:
    from app.domain.dailymed.downloader import download_spl_by_name

    set_download_dir(xml_dir)
    set_output_dir(output_dir)

    xml_bytes = download_spl_by_name(drug_name)
    if not xml_bytes:
        logger.error(f"No SPL found for drug: {drug_name}")
        return None

    parsed = parse_spl_xml(xml_bytes)
    if not parsed:
        return None

    set_id = parsed.get("set_id") or "unknown"
    generic_name = drug_name
    doc = DrugDocument(set_id=set_id, generic_name=generic_name)
    doc = extract(doc, parsed)

    write_drug_json(doc, output_dir)

    if store_in_db:
        success = store_drug_document(doc)
        if not success:
            logger.warning(f"DB storage failed for {drug_name}")

    return doc
