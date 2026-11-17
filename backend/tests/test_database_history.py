"""Tests for optional Supabase recommendation-history persistence."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock
from unittest.mock import patch

from app.core import database


class RecommendationHistoryTests(unittest.TestCase):
    def setUp(self) -> None:
        database.clear_catalog_cache()

    def tearDown(self) -> None:
        database.clear_catalog_cache()

    def test_catalog_accepts_perfumes_without_reference_urls(self) -> None:
        perfume = database._read_local_seed()[0]
        perfume.pop("reference_url", None)

        self.assertTrue(database._is_valid_catalog([perfume, perfume.copy(), perfume.copy()]))

    def test_remote_catalog_is_loaded_across_all_supabase_pages(self) -> None:
        first_page = [{"id": str(index)} for index in range(database.SUPABASE_PAGE_SIZE)]
        last_page = [{"id": "last-page-record"}]
        requested_ranges: list[tuple[int, int]] = []

        class FakeQuery:
            def __init__(self, offset: int = 0) -> None:
                self.offset = offset

            def eq(self, _column: str, _value: str) -> "FakeQuery":
                return self

            def range(self, start: int, end: int) -> "FakeQuery":
                requested_ranges.append((start, end))
                return FakeQuery(start)

            def execute(self) -> SimpleNamespace:
                page = {0: first_page, 1000: last_page}.get(self.offset, [])
                return SimpleNamespace(data=page)

        class FakeTable:
            def select(self, _columns: str) -> FakeQuery:
                return FakeQuery()

        class FakeClient:
            def table(self, _name: str) -> FakeTable:
                return FakeTable()

        records = database._load_supabase_catalog(FakeClient(), "450 - 850 RON")

        self.assertEqual(len(records), database.SUPABASE_PAGE_SIZE + 1)
        self.assertEqual(records[-1]["id"], "last-page-record")
        self.assertEqual(
            sorted(requested_ranges),
            [(0, 999), (1000, 1999)],
        )

    def test_missing_database_images_use_matching_seed_product_images(self) -> None:
        seed = database._read_local_seed()[0]
        remote_perfume = {
            "brand": seed["brand"],
            "name": seed["name"],
            "image_url": None,
        }

        database._add_seed_images([remote_perfume])

        self.assertEqual(remote_perfume["image_url"], seed["image_url"])

    def test_skips_history_when_supabase_credentials_are_missing(self) -> None:
        with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_KEY": ""}):
            self.assertFalse(database.save_recommendation_history({}, []))

    def test_saves_profile_recommendations_and_utc_timestamp(self) -> None:
        from datetime import datetime
        from unittest.mock import MagicMock

        mock_client = MagicMock()
        with (
            patch.dict(
                os.environ,
                {
                    "SUPABASE_URL": "https://example.supabase.co",
                    "SUPABASE_KEY": "server-test-key",
                },
            ),
            patch("supabase.create_client", return_value=mock_client) as create_client,
        ):
            saved = database.save_recommendation_history(
                {"budget_range": "250 - 400 RON"},
                [{"id": "test-perfume", "compatibility_score": 91.2}],
            )

        self.assertTrue(saved)
        create_client.assert_called_once_with(
            "https://example.supabase.co",
            "server-test-key",
        )
        inserted = mock_client.table.return_value.insert.call_args.args[0]
        self.assertEqual(inserted["user_profile"]["budget_range"], "250 - 400 RON")
        self.assertEqual(inserted["recommended_perfumes"][0]["id"], "test-perfume")
        self.assertIsNotNone(datetime.fromisoformat(inserted["timestamp"]))


if __name__ == "__main__":
    unittest.main()
