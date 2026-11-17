"""Tests for the CSV-to-Supabase perfume importer."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from scripts.import_csv import load_records


class CsvImporterTests(unittest.TestCase):
    def test_maps_catalog_fields_prices_brands_and_skips_missing_name_or_url(self) -> None:
        rows = [
            {
                "url": "https://example.test/arabic",
                "Perfume": "Arabian Rose",
                "Brand": "Lattafa",
                "Top": "rose, bergamot",
                "Middle": "jasmine",
                "Base": "musk",
                "mainaccord1": "floral",
                "mainaccord2": "unknown",
                "mainaccord3": "",
                "mainaccord4": "",
                "mainaccord5": "",
            },
            {
                "url": "https://example.test/niche",
                "Perfume": "Niche Oud",
                "Brand": "Xerjoff",
                "Top": "saffron",
                "Middle": "rose",
                "Base": "oud",
                "mainaccord1": "woody",
                "mainaccord2": "",
                "mainaccord3": "",
                "mainaccord4": "",
                "mainaccord5": "",
            },
            {
                "url": "https://example.test/designer",
                "Perfume": "Designer Fresh",
                "Brand": "Chanel",
                "Top": "citrus",
                "Middle": "",
                "Base": "musk",
                "mainaccord1": "fresh",
                "mainaccord2": "",
                "mainaccord3": "",
                "mainaccord4": "",
                "mainaccord5": "",
            },
            {
                "url": "https://example.test/no-name",
                "Perfume": "",
                "Brand": "Chanel",
                "Top": "",
                "Middle": "",
                "Base": "",
            },
            {
                "url": "",
                "Perfume": "No URL",
                "Brand": "Chanel",
                "Top": "",
                "Middle": "",
                "Base": "",
            },
        ]
        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "catalog.csv"
            pd.DataFrame(rows).to_csv(csv_path, sep=";", index=False, encoding="cp1252")
            with patch("scripts.import_csv.random.randint", side_effect=[150, 1000, 500]):
                records = load_records(csv_path)

        self.assertEqual(len(records), 3)
        self.assertEqual([record["price"] for record in records], [150, 1000, 500])
        self.assertEqual(records[0]["price_ron"], 150)
        self.assertEqual(records[0]["budget_range"], "100 - 200 RON")
        self.assertEqual(records[1]["budget_range"], "900 - 1500 RON")
        self.assertEqual(records[2]["budget_range"], "450 - 850 RON")
        self.assertEqual(records[0]["reference_url"], "https://example.test/arabic")
        self.assertEqual(records[0]["top_notes"], ["rose", "bergamot"])
        self.assertEqual(records[0]["accords"], ["floral"])
        self.assertIn("jasmine", records[0]["notes"])


if __name__ == "__main__":
    unittest.main()
