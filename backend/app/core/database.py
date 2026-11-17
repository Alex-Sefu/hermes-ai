"""Load the perfume catalog from Supabase, falling back to the local seed."""

import json
import logging
import os
import re
import unicodedata
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

from dotenv import load_dotenv

LOGGER = logging.getLogger(__name__)
BACKEND_ROOT = Path(__file__).resolve().parents[2]
SEED_PATH = BACKEND_ROOT / "data" / "perfumes_seed.json"
load_dotenv(BACKEND_ROOT / ".env")

_cached_catalogs: dict[str, tuple[list[dict[str, Any]], str]] = {}
_supabase_client: Any | None = None
SUPABASE_PAGE_SIZE = 1000
PERFUME_CATALOG_COLUMNS = (
    "id",
    "name",
    "brand",
    "price_ron",
    "budget_range",
    "image_url",
    "reference_url",
    "bottle_style",
    "top_notes",
    "heart_notes",
    "base_notes",
    "accords",
    "description_ro",
    "cross_modal",
    "context",
    "memory_keywords_ro",
    "bio_profile",
)
_required_fields = {
    "id",
    "name",
    "brand",
    "price_ron",
    "budget_range",
    "top_notes",
    "heart_notes",
    "base_notes",
    "accords",
    "description_ro",
    "cross_modal",
    "context",
    "memory_keywords_ro",
    "bio_profile",
}


def _catalog_key(perfume: dict[str, Any]) -> str:
    parts = []
    for field in ("brand", "name"):
        normalized = unicodedata.normalize("NFKD", str(perfume.get(field, "")))
        ascii_text = "".join(
            character for character in normalized if not unicodedata.combining(character)
        )
        parts.append(re.sub(r"[^a-z0-9]+", " ", ascii_text.casefold()).strip())
    return "|".join(parts)


def _add_seed_images(perfumes: list[dict[str, Any]]) -> None:
    """Use curated local images only when the remote catalog has no product image."""
    seed_images = {
        _catalog_key(perfume): perfume["image_url"]
        for perfume in _read_local_seed()
        if perfume.get("image_url")
    }
    for perfume in perfumes:
        if not perfume.get("image_url"):
            image_url = seed_images.get(_catalog_key(perfume))
            if image_url:
                perfume["image_url"] = image_url


def _load_supabase_catalog(
    client: Any,
    budget_range: str | None = None,
) -> list[dict[str, Any]]:
    perfumes: list[dict[str, Any]] = []
    offset = 0

    def load_page(page_offset: int) -> list[dict[str, Any]]:
        query = client.table("perfumes").select(",".join(PERFUME_CATALOG_COLUMNS))
        if budget_range is not None:
            query = query.eq("budget_range", budget_range)
        response = query.range(page_offset, page_offset + SUPABASE_PAGE_SIZE - 1).execute()
        return response.data

    while True:
        page = load_page(offset)
        perfumes.extend(page)
        if len(page) < SUPABASE_PAGE_SIZE:
            return perfumes
        offset += SUPABASE_PAGE_SIZE


def _is_valid_catalog(perfumes: Any) -> bool:
    return (
        isinstance(perfumes, list)
        and len(perfumes) >= 3
        and all(isinstance(perfume, dict) and _required_fields <= perfume.keys() for perfume in perfumes)
    )


def _read_local_seed() -> list[dict[str, Any]]:
    try:
        with SEED_PATH.open(encoding="utf-8") as seed_file:
            perfumes = json.load(seed_file)
    except (OSError, json.JSONDecodeError) as error:
        LOGGER.exception("Could not read the local perfume catalog at %s", SEED_PATH)
        raise RuntimeError("The local perfume catalog is unavailable.") from error

    if isinstance(perfumes, dict):
        perfumes = perfumes.get("perfumes")
    if not _is_valid_catalog(perfumes):
        raise RuntimeError("The local perfume catalog must contain at least three complete records.")
    return perfumes


def get_perfumes(
    budget_range: str | None = None,
) -> tuple[list[dict[str, Any]], str]:
    """Return the requested cached catalog slice or the bundled seed fallback."""
    cache_key = budget_range or "*"
    if cache_key in _cached_catalogs:
        return _cached_catalogs[cache_key]

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_KEY", "").strip()
    if supabase_url and supabase_key:
        try:
            from supabase import create_client

            remote_perfumes = _load_supabase_catalog(
                create_client(supabase_url, supabase_key),
                budget_range,
            )
            if _is_valid_catalog(remote_perfumes):
                _add_seed_images(remote_perfumes)
                _cached_catalogs[cache_key] = (remote_perfumes, "supabase")
                return _cached_catalogs[cache_key]
            LOGGER.warning("Supabase returned an empty or incomplete perfume table; using the local seed catalog.")
        except Exception:
            LOGGER.exception("Could not load perfumes from Supabase; using the local seed catalog.")
    else:
        LOGGER.info("Supabase credentials are not configured; using the local seed catalog.")

    local_perfumes = _read_local_seed()
    _cached_catalogs[cache_key] = (local_perfumes, "local_seed")
    return _cached_catalogs[cache_key]


def save_recommendation_history(
    user_profile: dict[str, Any],
    recommended_perfumes: list[dict[str, Any]],
) -> bool:
    """Persist a recommendation event when Supabase is configured; otherwise skip it."""
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_KEY", "").strip()
    if not supabase_url or not supabase_key:
        LOGGER.info("Supabase credentials are not configured; recommendation history was not saved.")
        return False

    global _supabase_client
    try:
        if _supabase_client is None:
            from supabase import create_client

            _supabase_client = create_client(supabase_url, supabase_key)
        _supabase_client.table("recommendation_history").insert(
            {
                "user_profile": user_profile,
                "recommended_perfumes": recommended_perfumes,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception:
        LOGGER.exception("Could not save recommendation history to Supabase.")
        return False
    return True


def clear_catalog_cache() -> None:
    """Clear the process cache for tests and explicit catalog refreshes."""
    global _supabase_client
    _cached_catalogs.clear()
    _supabase_client = None
