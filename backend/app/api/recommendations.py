"""Perfume recommendation API endpoints."""

import logging

from fastapi import APIRouter, HTTPException

from app.core.database import get_perfumes, save_recommendation_history
from app.models.schemas import RecommendationRequest, RecommendationResponse
from app.services.llm_service import generate_revelation
from app.services.recommender import recommend

LOGGER = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["recommendations"])


@router.post("/recommend", response_model=RecommendationResponse)
async def recommend_perfumes(request: RecommendationRequest) -> RecommendationResponse:
    perfumes, data_source = get_perfumes(request.budget_range)
    try:
        result = recommend(request, perfumes, data_source)
    except ValueError as error:
        LOGGER.exception("The recommendation request could not be ranked.")
        raise HTTPException(status_code=503, detail=str(error)) from error
    result["revelation"] = await generate_revelation(
        request,
        result["recommendations"],
    )
    response = RecommendationResponse.model_validate(result)
    save_recommendation_history(
        request.model_dump(mode="json"),
        [
            {
                "id": perfume.id,
                "name": perfume.name,
                "compatibility_score": perfume.compatibility_score,
                "price_ron": perfume.price_ron,
            }
            for perfume in response.recommendations
        ],
    )
    return response
