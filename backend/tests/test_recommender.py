"""Regression tests for the seeded perfume catalog and scoring pipeline."""

import json
import unittest
from pathlib import Path

from app.models.schemas import (
    BioProfileAnswers,
    ContextAnswers,
    CrossModalAnswers,
    MemoryAnswers,
    PerfumeRecommendation,
    RecommendationRequest,
)
from app.services.recommender import (
    BIO_WEIGHTS,
    CONTEXT_WEIGHTS,
    CROSS_MODAL_WEIGHTS,
    MEMORY_WEIGHTS,
    _cross_modal_similarity,
    _dimension_similarity,
    _project_answer,
    recommend,
)

CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "perfumes_seed.json"


def build_request(
    budget_range: str = "100 - 200 RON",
    unpleasant_smell: str = "niciunul",
) -> RecommendationRequest:
    return RecommendationRequest(
        cross_modal=CrossModalAnswers(
            color="Chihlimbar Auriu",
            shape="Sfera Perfectă",
            texture="Catifea regală",
            environment="Zonă vulcanică",
            music="Jazz / Blues",
        ),
        context=ContextAnswers(
            moment="Noapte",
            space="Interior",
            occasion="Întâlnire / Seară în oraș",
            season="Toamnă",
            region="Oraș mare (Metropolă)",
        ),
        memories=MemoryAnswers(
            favorite_memory="Seară lângă foc, cu vanilie și scorțișoară.",
            childhood_smell="Mirosul prăjiturilor cu vanilie.",
            unpleasant_smell=unpleasant_smell,
            previous_perfumes="Parfumuri dulci, ambrate.",
        ),
        bio_profile=BioProfileAnswers(
            skin_evolution="Devine mai dulce",
            natural_skin_scent="Dulce",
        ),
        budget_range=budget_range,
    )


class RecommenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with CATALOG_PATH.open(encoding="utf-8") as catalog_file:
            cls.perfumes = json.load(catalog_file)["perfumes"]

    def test_seed_catalog_has_complete_products_in_every_budget_tier(self) -> None:
        required_fields = {
            "id",
            "name",
            "brand",
            "price_ron",
            "budget_range",
            "image_url",
            "reference_url",
            "top_notes", "heart_notes", "base_notes", "accords", "description_ro",
            "cross_modal", "context", "memory_keywords_ro", "bio_profile",
        }
        self.assertGreaterEqual(len(self.perfumes), 40)
        self.assertTrue(all(required_fields.issubset(perfume) for perfume in self.perfumes))
        self.assertTrue(
            all(
                perfume["image_url"].startswith("https://")
                for perfume in self.perfumes
            )
        )
        self.assertTrue(
            all(
                perfume["reference_url"] is None
                or perfume["reference_url"].startswith("https://www.parfumo.com/Perfumes/")
                for perfume in self.perfumes
            )
        )
        self.assertEqual(
            {perfume["budget_range"] for perfume in self.perfumes},
            {
                "100 - 200 RON",
                "250 - 400 RON",
                "450 - 850 RON",
                "900 - 1500 RON",
                "1700+ RON",
            },
        )

    def test_returns_three_ranked_recommendations_inside_the_selected_budget(self) -> None:
        result = recommend(build_request(), self.perfumes, "local_seed")

        self.assertEqual(len(result["recommendations"]), 3)
        self.assertGreaterEqual(result["recommendations"][0]["compatibility_score"], 82)
        self.assertLessEqual(result["recommendations"][0]["compatibility_score"], 96)
        self.assertTrue(
            all(item["budget_range"] == "100 - 200 RON" for item in result["recommendations"])
        )
        self.assertEqual(
            sorted(
                item["compatibility_score"]
                for item in result["recommendations"]
            ),
            [
                item["compatibility_score"]
                for item in reversed(result["recommendations"])
            ],
        )
        for item in result["recommendations"]:
            self.assertEqual(
                set(item["scores"]),
                {"cross_modal_score", "context_score", "memory_score", "bio_score"},
            )
            self.assertTrue(item["explanation_ro"])

    def test_selected_budget_does_not_recommend_out_of_range_prices(self) -> None:
        templates = [
            perfume
            for perfume in self.perfumes
            if perfume["budget_range"] == "450 - 850 RON"
        ][:4]
        catalog = [
            {**perfume, "id": f"budget-boundary-{price}", "price_ron": price}
            for perfume, price in zip(templates, (440, 450, 700, 850), strict=True)
        ]

        result = recommend(build_request("450 - 850 RON"), catalog, "test")

        self.assertEqual(len(result["recommendations"]), 3)
        self.assertTrue(
            all(450 <= item["price_ron"] <= 850 for item in result["recommendations"])
        )

    def test_recommendations_include_the_seeded_reference_url(self) -> None:
        self.assertIn("reference_url", PerfumeRecommendation.model_fields)
        result = recommend(build_request(), self.perfumes, "local_seed")
        for item in result["recommendations"]:
            catalog_item = next(perfume for perfume in self.perfumes if perfume["id"] == item["id"])
            self.assertEqual(item["reference_url"], catalog_item["reference_url"])

    def test_missing_imported_context_tags_are_scored_as_neutral(self) -> None:
        imported_perfumes = [
            {"context": {}},
            {"context": {}},
            {"context": {}},
        ]

        scores = _dimension_similarity(
            imported_perfumes,
            "context",
            "moment",
            "Noapte",
        )

        self.assertEqual(scores.tolist(), [0.5, 0.5, 0.5])

    def test_seed_profiles_match_verified_parfumo_product_pages(self) -> None:
        profiles = {perfume["id"]: perfume["reference_url"] for perfume in self.perfumes}
        self.assertEqual(
            profiles["armani-acqua-di-gio-edt"],
            "https://www.parfumo.com/Perfumes/Giorgio_Armani/"
            "Acqua_di_Gio_pour_Homme_Eau_de_Toilette",
        )
        self.assertEqual(
            profiles["chanel-bleu-de-chanel-edp"],
            "https://www.parfumo.com/Perfumes/Chanel/Bleu_de_Chanel_Eau_de_Parfum",
        )
        self.assertEqual(
            profiles["armani-my-way"],
            "https://www.parfumo.com/Perfumes/Giorgio_Armani/My_Way",
        )
        self.assertIsNone(profiles["jeanne-arthes-cassandra-rose"])

    def test_scoring_weights_match_the_architecture(self) -> None:
        self.assertEqual(
            CROSS_MODAL_WEIGHTS,
            {"color": 10, "shape": 8, "texture": 8, "environment": 7, "music": 7},
        )
        self.assertEqual(sum(CROSS_MODAL_WEIGHTS.values()), 40)
        self.assertEqual(sum(CONTEXT_WEIGHTS.values()), 25)
        self.assertEqual(
            MEMORY_WEIGHTS,
            {
                "favorite_memory": 8,
                "childhood_smell": 6,
                "previous_perfumes": 6,
                "unpleasant_smell": 5,
            },
        )
        self.assertEqual(sum(MEMORY_WEIGHTS.values()), 25)
        self.assertEqual(sum(BIO_WEIGHTS.values()), 10)

    def test_current_ui_options_project_to_expected_olfactory_families(self) -> None:
        self.assertEqual(
            _project_answer("color", "Roz Pastel / Floral")["floral"],
            1.0,
        )
        linen_projection = _project_answer("texture", "In răcoros (Pânză aerată)")
        self.assertIn("citrus", linen_projection)
        self.assertIn("aquatic", linen_projection)
        self.assertIn("spicy", _project_answer("shape", "Piramidă / Muchii Ascuțite (Kiki)"))
        self.assertIn("amber", _project_answer("music", "Rap / Trap urban"))

    def test_cross_modal_projection_prefers_matching_olfactory_families(self) -> None:
        catalog = [
            {
                "top_notes": ["trandafir", "bergamotă"],
                "heart_notes": ["bujor"],
                "base_notes": ["mosc"],
                "accords": ["floral"],
                "memory_keywords_ro": [],
                "description_ro": "",
                "cross_modal": {},
            },
            {
                "top_notes": ["bergamotă", "lămâie"],
                "heart_notes": ["neroli"],
                "base_notes": ["cedru"],
                "accords": ["citrice", "proaspăt"],
                "memory_keywords_ro": [],
                "description_ro": "",
                "cross_modal": {},
            },
        ]
        floral_answers = {
            "color": "Roz Pastel / Floral",
            "shape": "Sferă Organică Rotunjită (Bouba)",
            "texture": "Mătase fluidă",
            "environment": "Grădină mediteraneană cu citrice",
            "music": "Pop / R&B",
        }
        fresh_answers = {
            "color": "Galben-Portocaliu Citric",
            "shape": "Piramidă / Muchii Ascuțite (Kiki)",
            "texture": "In răcoros (Pânză aerată)",
            "environment": "Grădină mediteraneană cu citrice",
            "music": "Electronic / Synth",
        }

        floral_scores = _cross_modal_similarity(catalog, floral_answers)
        fresh_scores = _cross_modal_similarity(catalog, fresh_answers)
        self.assertGreater(floral_scores[0], floral_scores[1])
        self.assertGreater(fresh_scores[1], fresh_scores[0])

    def test_each_budget_tier_returns_three_results_from_that_tier(self) -> None:
        for budget_range in (
            "100 - 200 RON",
            "250 - 400 RON",
            "450 - 850 RON",
            "900 - 1500 RON",
            "1700+ RON",
        ):
            with self.subTest(budget_range=budget_range):
                result = recommend(
                    build_request(budget_range=budget_range),
                    self.perfumes,
                    "local_seed",
                )
                self.assertEqual(len(result["recommendations"]), 3)
                self.assertTrue(
                    all(
                        perfume["budget_range"] == budget_range
                        for perfume in result["recommendations"]
                    )
                )

    def test_negative_memory_filter_severely_penalizes_matching_notes(self) -> None:
        focused_catalog = [
            perfume
            for perfume in self.perfumes
            if perfume["id"] in {"lattafa-asad", "zara-gardenia", "nike-indigo"}
        ]
        clean_result = recommend(build_request(), focused_catalog, "local_seed")
        smoke_result = recommend(
            build_request(unpleasant_smell="fum"),
            focused_catalog,
            "local_seed",
        )
        clean_scores = {
            item["id"]: item["compatibility_score"] for item in clean_result["recommendations"]
        }
        smoke_scores = {
            item["id"]: item["compatibility_score"] for item in smoke_result["recommendations"]
        }

        self.assertIn("lattafa-asad", clean_scores)
        self.assertIn("lattafa-asad", smoke_scores)
        self.assertLess(smoke_scores["lattafa-asad"], clean_scores["lattafa-asad"])
        self.assertIn(
            "redus",
            next(
                item["explanation_ro"]
                for item in smoke_result["recommendations"]
                if item["id"] == "lattafa-asad"
            ),
        )


if __name__ == "__main__":
    unittest.main()
