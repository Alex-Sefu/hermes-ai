"""Import the cleaned Fragrantica catalog into Supabase in batches."""

import argparse
import hashlib
import logging
import os
import random
import sys
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client
from tqdm import tqdm

BACKEND_ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = BACKEND_ROOT / "data" / "fra_cleaned.csv"
BATCH_SIZE = 1000
ARABIC_BRANDS = (
    "lattafa",
    "armaf",
    "afnan",
    "rasasi",
    "swiss arabian",
    "al haramain",
    "orientica",
    "ajmal",
    "fragrance world",
    "paris corner",
)
NICHE_BRANDS = (
    "creed",
    "amouage",
    "roja",
    "xerjoff",
    "parfums de marly",
    "marly",
    "nishane",
    "kurkdjian",
    "kilian",
    "tiziana terenzi",
    "tom ford",
    "le labo",
    "byredo",
    "jo malone",
    "penhaligon",
    "initio",
    "clive christian",
    "baccarat",
)
LOGGER = logging.getLogger("import_csv")


def _clean_value(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    cleaned = str(value).strip()
    if not cleaned or cleaned.casefold() == "unknown":
        return None
    return cleaned


def _split_values(value: Any) -> list[str]:
    cleaned = _clean_value(value)
    if cleaned is None:
        return []
    return [part.strip() for part in cleaned.split(",") if part.strip()]


def _price_for_brand(brand: str) -> int:
    normalized = brand.casefold()
    if any(term in normalized for term in ARABIC_BRANDS):
        return random.randint(100, 250)
    if any(term in normalized for term in NICHE_BRANDS):
        return random.randint(800, 2500)
    return random.randint(350, 650)


def _budget_range(price: int) -> str:
    if price <= 250:
        return "100 - 200 RON" if price <= 200 else "250 - 400 RON"
    if price <= 400:
        return "250 - 400 RON"
    if price <= 850:
        return "450 - 850 RON"
    if price <= 1500:
        return "900 - 1500 RON"
    return "1700+ RON"


def load_records(csv_path: Path = CSV_PATH) -> list[dict[str, Any]]:
    """Read the semicolon-delimited source and map rows to the Supabase schema."""
    if not csv_path.is_file():
        raise FileNotFoundError(f"CSV source does not exist: {csv_path}")

    frame = pd.read_csv(
        csv_path,
        sep=";",
        encoding="cp1252",
        dtype=str,
        keep_default_na=False,
    )
    required_columns = {"url", "Perfume", "Brand", "Top", "Middle", "Base"}
    missing_columns = required_columns - set(frame.columns)
    if missing_columns:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing_columns))}")

    frame["Perfume"] = frame["Perfume"].map(_clean_value)
    frame["Brand"] = frame["Brand"].map(_clean_value)
    frame["url"] = frame["url"].map(_clean_value)
    frame = frame.dropna(subset=["Perfume", "url"])

    records: list[dict[str, Any]] = []
    for row in frame.to_dict(orient="records"):
        name = row["Perfume"]
        brand = row["Brand"] or "Unknown brand"
        reference_url = row["url"]
        price = _price_for_brand(brand)
        top_notes = _split_values(row["Top"])
        heart_notes = _split_values(row["Middle"])
        base_notes = _split_values(row["Base"])
        accords = [
            value
            for column in ("mainaccord1", "mainaccord2", "mainaccord3", "mainaccord4", "mainaccord5")
            if (value := _clean_value(row.get(column))) is not None
        ]
        all_notes = list(dict.fromkeys([*top_notes, *heart_notes, *base_notes, *accords]))
        stable_id = hashlib.sha256(reference_url.encode("utf-8")).hexdigest()[:32]

        records.append(
            {
                "id": stable_id,
                "name": name,
                "brand": brand,
                "notes": ", ".join(all_notes) or None,
                "reference_url": reference_url,
                "price": price,
                "price_ron": price,
                "budget_range": _budget_range(price),
                "image_url": None,
                "bottle_style": "Sticlă de parfum",
                "top_notes": top_notes,
                "heart_notes": heart_notes,
                "base_notes": base_notes,
                "accords": accords,
                "description_ro": f"{name} de {brand}.",
                "cross_modal": {},
                "context": {},
                "memory_keywords_ro": all_notes,
                "bio_profile": {},
            }
        )

    if not records:
        raise ValueError("CSV contains no valid rows after filtering missing names and URLs.")
    if len({record["id"] for record in records}) != len(records):
        raise ValueError("CSV contains duplicate profile URLs; stable record IDs would collide.")
    return records


def import_records(records: list[dict[str, Any]], dry_run: bool = False) -> int:
    """Insert records in batches, showing progress and surfacing failed batches."""
    if not dry_run:
        load_dotenv(BACKEND_ROOT / ".env")
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_key = os.getenv("SUPABASE_KEY", "").strip()
        if not supabase_url or not supabase_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY are required. Configure backend/.env before importing."
            )
        client = create_client(supabase_url, supabase_key)
    else:
        client = None

    total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE
    for batch_number, start in enumerate(
        tqdm(range(0, len(records), BATCH_SIZE), total=total_batches, desc="Import batches"),
        start=1,
    ):
        batch = records[start : start + BATCH_SIZE]
        if dry_run:
            continue
        try:
            client.table("perfumes").insert(batch).execute()
        except Exception:
            LOGGER.exception(
                "Supabase insert failed for batch %s/%s (records %s-%s).",
                batch_number,
                total_batches,
                start + 1,
                start + len(batch),
            )
            raise
    return len(records)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Transform and validate the CSV without writing to Supabase.",
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    try:
        records = load_records()
        imported_count = import_records(records, dry_run=args.dry_run)
    except Exception as error:
        LOGGER.error("%s", error)
        return 1

    action = "Validated" if args.dry_run else "Inserted"
    print(f"{action} {imported_count:,} records in batches of at most {BATCH_SIZE}.")
    if args.dry_run:
        print(
            "Dry run only. Apply backend/data/supabase_schema.sql and configure "
            "SUPABASE_URL/SUPABASE_KEY in backend/.env before the live import."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
