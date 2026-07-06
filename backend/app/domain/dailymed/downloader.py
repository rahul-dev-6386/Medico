"""
SPL XML downloader.

Downloads SPL XML files from DailyMed using the official REST API.

Two modes:
1. Download SPL XML by set_id
2. List SPLs via the DailyMed API

We DO NOT scrape rendered HTML pages.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("dailymed.downloader")

DAILYMED_BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2"
SPL_DOWNLOAD_BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls"

DOWNLOAD_DIR = "data/dailymed_xml"


def set_download_dir(path: str) -> None:
    global DOWNLOAD_DIR
    DOWNLOAD_DIR = path


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def list_spls(
    drug_name: Optional[str] = None,
    set_id: Optional[str] = None,
    ndc: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"pagesize": limit, "page": offset // limit + 1}
    if drug_name:
        params["drug_name"] = drug_name
    if set_id:
        params["setid"] = set_id
    if ndc:
        params["ndc"] = ndc

    url = f"{DAILYMED_BASE}/spls.json?{urlencode(params)}"

    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        resp = client.get(url, headers={"Accept": "application/json"})

    if resp.status_code != 200:
        logger.warning(f"DailyMed list SPLs returned {resp.status_code}: {url}")
        return []

    data = resp.json()
    return data.get("data", [])


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def download_spl_xml(set_id: str, output_dir: Optional[str] = None) -> Optional[bytes]:
    if output_dir is None:
        output_dir = DOWNLOAD_DIR

    os.makedirs(output_dir, exist_ok=True)

    url = f"{SPL_DOWNLOAD_BASE}/{set_id}.xml"
    logger.info(f"Downloading SPL XML: {set_id}")

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(url, headers={"Accept": "*/*"})

    if resp.status_code != 200:
        logger.warning(f"SPL XML download failed: {set_id} (HTTP {resp.status_code})")
        return None

    filepath = os.path.join(output_dir, f"{set_id}.xml")
    with open(filepath, "wb") as f:
        f.write(resp.content)

    logger.info(f"Saved SPL XML: {filepath} ({len(resp.content)} bytes)")
    return resp.content


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def download_spl_by_ndc(ndc: str) -> Optional[bytes]:
    spls = list_spls(ndc=ndc, limit=1)
    if not spls:
        logger.warning(f"No SPL found for NDC: {ndc}")
        return None
    set_id = spls[0].get("setid")
    if not set_id:
        return None
    return download_spl_xml(set_id)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def download_spl_by_name(drug_name: str) -> Optional[bytes]:
    from app.domain.dailymed.crawler import _pick_best_spl
    spls = list_spls(drug_name=drug_name, limit=10)
    if not spls:
        logger.warning(f"No SPL found for drug: {drug_name}")
        return None
    best = _pick_best_spl(drug_name, spls)
    if not best:
        logger.warning(f"Could not pick best SPL for: {drug_name}")
        return None
    set_id = best.get("setid")
    if not set_id:
        return None
    logger.info(f"Selected SPL for '{drug_name}': {best.get('title', '')[:60]} ({set_id})")
    return download_spl_xml(set_id)
