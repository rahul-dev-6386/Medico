"""
DailyMed SPL crawler.

Discovers SPL set IDs through the DailyMed REST API.

Strategies:
1. By drug name (generic or brand)
2. By NDC code
3. Bulk: list all SPLs (paginated)
4. By therapeutic category
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

from app.domain.dailymed.downloader import list_spls

logger = logging.getLogger("dailymed.crawler")

DEFAULT_DELAY = 0.5


def crawl_by_drug_name(
    drug_names: list[str],
    delay: float = DEFAULT_DELAY,
    max_per_drug: int = 10,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    seen_set_ids: set[str] = set()

    for name in drug_names:
        try:
            spls = list_spls(drug_name=name, limit=max_per_drug)
            best = _pick_best_spl(name, spls)
            if best:
                set_id = best.get("setid")
                if set_id and set_id not in seen_set_ids:
                    seen_set_ids.add(set_id)
                    best["_requested_name"] = name
                    results.append(best)
                    logger.debug(f"Selected SPL for '{name}': {best.get('generic_name') or best.get('title')} ({set_id})")
                else:
                    logger.debug(f"Skipping duplicate SPL for '{name}': {set_id}")
            else:
                logger.warning(f"No SPL found for drug: {name}")
            time.sleep(delay)
        except Exception as e:
            logger.warning(f"Error crawling drug '{name}': {e}")

    logger.info(f"Crawled {len(drug_names)} drug names, found {len(results)} unique SPLs")
    return results


def _pick_best_spl(name: str, spls: list[dict]) -> Optional[dict]:
    if not spls:
        return None

    name_lower = name.lower().strip()
    name_words = set(name_lower.split())

    def _score(spl: dict) -> int:
        title = (spl.get("title") or "").lower().strip()
        gn = (spl.get("generic_name") or "").lower().strip()
        bn = (spl.get("brand_name") or "").lower().strip()

        text = title if not gn else gn

        if gn == name_lower or bn == name_lower:
            return 100

        if text == name_lower:
            return 95

        title_words = set(text.split())
        common = name_words & title_words

        if "and" in title_words and len(title_words) > len(name_words) + 1:
            penalty = -30
        else:
            penalty = 0

        if text.startswith(name_lower):
            return 80 + penalty
        if name_lower in text:
            return 70 + penalty

        score = min(len(common) * 15, 60)
        return score + penalty

    scored = [(spl, _score(spl)) for spl in spls]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0]


def crawl_bulk(limit: int = 10000, delay: float = DEFAULT_DELAY) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    offset = 0
    page_size = 100

    while len(results) < limit:
        spls = list_spls(limit=page_size, offset=offset)
        if not spls:
            break
        results.extend(spls)
        offset += len(spls)
        logger.info(f"Crawl progress: {len(results)} SPLs found")
        time.sleep(delay)

    logger.info(f"Bulk crawl complete: {len(results)} SPLs")
    return results


def crawl_by_ndc(ndc_codes: list[str], delay: float = DEFAULT_DELAY) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for ndc in ndc_codes:
        try:
            spls = list_spls(ndc=ndc, limit=1)
            results.extend(spls)
            time.sleep(delay)
        except Exception as e:
            logger.warning(f"Error crawling NDC '{ndc}': {e}")
    return results
