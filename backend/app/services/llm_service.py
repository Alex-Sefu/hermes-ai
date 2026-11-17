"""Local language model service for recommendation explanations."""

import json
import logging
from typing import Any

import httpx

from app.models.schemas import RecommendationRequest

LOGGER = logging.getLogger(__name__)
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"
REVELATION_FALLBACK = (
    "Am ascultat ecoul amintirilor tale și am extras esențele potrivite. "
    "Aceste trei creații poartă amprenta sufletului tău."
)
OLLAMA_SYSTEM_PROMPT = (
    "Acționezi ca Hermes, un ghid olfactiv misterios și poetic. "
    "Răspunzi exclusiv în limba română, cu căldură și claritate."
)


async def generate_revelation(
    request: RecommendationRequest,
    recommendations: list[dict[str, Any]],
) -> str:
    """Generate a short Romanian explanation, falling back when Ollama is unavailable."""
    user_context = {
        "vibe": {
            **request.cross_modal.model_dump(),
            **request.context.model_dump(),
            **request.bio_profile.model_dump(),
        },
        "amintiri": request.memories.model_dump(),
        "parfumuri_recomandate": [
            {
                "nume": perfume["name"],
                "brand": perfume["brand"],
                "note_de_varf": perfume.get("top_notes", []),
                "note_de_inima": perfume.get("heart_notes", []),
                "note_de_baza": perfume.get("base_notes", []),
            }
            for perfume in recommendations
        ],
    }
    prompt = (
        "Explică de ce ai ales notele acestor trei parfumuri pentru utilizator, "
        "legându-le de vibe-ul și amintirile sale. Scrie doar 3-4 propoziții scurte "
        "în limba română, fără introducere sau listă.\n\n"
        "Datele utilizatorului și notele recomandărilor:\n"
        f"{json.dumps(user_context, ensure_ascii=False)}"
    )

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "system": OLLAMA_SYSTEM_PROMPT,
                    "prompt": prompt,
                    "stream": False,
                },
            )
        response.raise_for_status()
        body = response.json()
        revelation = body.get("response") if isinstance(body, dict) else None
        if not isinstance(revelation, str) or not revelation.strip():
            raise ValueError("Ollama returned an empty or invalid revelation.")
        return revelation.strip()
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        LOGGER.warning(
            "Could not generate the recommendation revelation with Ollama; using fallback.",
            exc_info=True,
        )
        return REVELATION_FALLBACK
