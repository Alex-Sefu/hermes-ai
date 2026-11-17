"""Tests for Ollama-backed recommendation explanations."""

import asyncio
import unittest
from unittest.mock import patch

import httpx

from app.models.schemas import (
    BioProfileAnswers,
    ContextAnswers,
    CrossModalAnswers,
    MemoryAnswers,
    RecommendationRequest,
)
from app.services.llm_service import (
    OLLAMA_MODEL,
    OLLAMA_URL,
    REVELATION_FALLBACK,
    generate_revelation,
)


def build_request() -> RecommendationRequest:
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
            unpleasant_smell="niciunul",
            previous_perfumes="Parfumuri dulci, ambrate.",
        ),
        bio_profile=BioProfileAnswers(
            skin_evolution="Devine mai dulce",
            natural_skin_scent="Dulce",
        ),
        budget_range="100 - 200 RON",
    )


class FakeResponse:
    def __init__(self, body: object) -> None:
        self.body = body

    def raise_for_status(self) -> None:
        return None

    def json(self) -> object:
        return self.body


class FakeAsyncClient:
    def __init__(
        self,
        response: FakeResponse | None = None,
        error: Exception | None = None,
    ) -> None:
        self.response = response
        self.error = error
        self.request: tuple[str, dict[str, object]] | None = None

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def post(self, url: str, *, json: dict[str, object]) -> FakeResponse:
        self.request = (url, json)
        if self.error:
            raise self.error
        assert self.response is not None
        return self.response


class RevelationTests(unittest.TestCase):
    def test_sends_user_profile_and_all_three_perfume_note_sets_to_ollama(self) -> None:
        client = FakeAsyncClient(FakeResponse({"response": "Notele tale spun o poveste."}))
        perfumes = [
            {
                "name": f"Parfum {index}",
                "brand": "Hermes",
                "top_notes": [f"Vârf {index}"],
                "heart_notes": [f"Inimă {index}"],
                "base_notes": [f"Bază {index}"],
            }
            for index in range(1, 4)
        ]

        with patch("app.services.llm_service.httpx.AsyncClient", return_value=client):
            result = asyncio.run(generate_revelation(build_request(), perfumes))

        self.assertEqual(result, "Notele tale spun o poveste.")
        self.assertIsNotNone(client.request)
        url, payload = client.request
        self.assertEqual(url, OLLAMA_URL)
        self.assertEqual(payload["model"], OLLAMA_MODEL)
        self.assertEqual(payload["stream"], False)
        prompt = str(payload["prompt"])
        self.assertIn("Chihlimbar Auriu", prompt)
        self.assertIn("Seară lângă foc", prompt)
        for index in range(1, 4):
            self.assertIn(f"Vârf {index}", prompt)
            self.assertIn(f"Inimă {index}", prompt)
            self.assertIn(f"Bază {index}", prompt)
        self.assertIn("Hermes", str(payload["system"]))

    def test_returns_fallback_when_ollama_is_unavailable(self) -> None:
        client = FakeAsyncClient(
            error=httpx.ConnectError(
                "Ollama is unavailable",
                request=httpx.Request("POST", OLLAMA_URL),
            )
        )
        perfumes = [{"name": "Parfum", "brand": "Hermes"} for _ in range(3)]

        with patch("app.services.llm_service.httpx.AsyncClient", return_value=client):
            result = asyncio.run(generate_revelation(build_request(), perfumes))

        self.assertEqual(result, REVELATION_FALLBACK)

    def test_returns_fallback_for_invalid_ollama_response(self) -> None:
        client = FakeAsyncClient(FakeResponse({"unexpected": "shape"}))
        perfumes = [{"name": "Parfum", "brand": "Hermes"} for _ in range(3)]

        with patch("app.services.llm_service.httpx.AsyncClient", return_value=client):
            result = asyncio.run(generate_revelation(build_request(), perfumes))

        self.assertEqual(result, REVELATION_FALLBACK)
