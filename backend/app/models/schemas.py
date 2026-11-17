"""Typed request and response models for perfume recommendations."""

from pydantic import BaseModel, Field


class CrossModalAnswers(BaseModel):
    color: str = Field(min_length=1, max_length=80)
    shape: str = Field(min_length=1, max_length=80)
    texture: str = Field(min_length=1, max_length=80)
    environment: str = Field(min_length=1, max_length=100)
    music: str = Field(min_length=1, max_length=80)


class ContextAnswers(BaseModel):
    moment: str = Field(min_length=1, max_length=80)
    space: str = Field(min_length=1, max_length=80)
    occasion: str = Field(min_length=1, max_length=120)
    season: str = Field(min_length=1, max_length=80)
    region: str = Field(min_length=1, max_length=120)


class MemoryAnswers(BaseModel):
    favorite_memory: str = Field(min_length=1, max_length=2000)
    childhood_smell: str = Field(min_length=1, max_length=2000)
    unpleasant_smell: str = Field(min_length=1, max_length=2000)
    previous_perfumes: str = Field(min_length=1, max_length=1000)


class BioProfileAnswers(BaseModel):
    skin_evolution: str = Field(min_length=1, max_length=120)
    natural_skin_scent: str = Field(min_length=1, max_length=120)


class RecommendationRequest(BaseModel):
    cross_modal: CrossModalAnswers
    context: ContextAnswers
    memories: MemoryAnswers
    bio_profile: BioProfileAnswers
    budget_range: str = Field(min_length=1, max_length=40)


class PillarScores(BaseModel):
    cross_modal_score: float = Field(ge=0, le=100)
    context_score: float = Field(ge=0, le=100)
    memory_score: float = Field(ge=0, le=100)
    bio_score: float = Field(ge=0, le=100)


class PerfumeRecommendation(BaseModel):
    id: str
    name: str
    brand: str
    price_ron: float
    budget_range: str
    image_url: str | None = None
    bottle_style: str
    top_notes: list[str]
    heart_notes: list[str]
    base_notes: list[str]
    accords: list[str]
    description_ro: str
    reference_url: str | None = None
    compatibility_score: float = Field(ge=0, le=100)
    scores: PillarScores
    explanation_ro: str


class RecommendationResponse(BaseModel):
    recommendations: list[PerfumeRecommendation] = Field(min_length=3, max_length=3)
    data_source: str
    disclaimer_ro: str
    revelation: str
