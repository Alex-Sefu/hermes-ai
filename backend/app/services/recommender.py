"""Hybrid cross-modal, context, memory, and skin-response perfume ranking."""

import re
import unicodedata
from functools import lru_cache
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer

from app.models.schemas import RecommendationRequest

CROSS_MODAL_WEIGHTS = {
    "color": 10,
    "shape": 8,
    "texture": 8,
    "environment": 7,
    "music": 7,
}
CONTEXT_WEIGHTS = {
    "moment": 5,
    "space": 5,
    "occasion": 5,
    "season": 5,
    "region": 5,
}
MEMORY_WEIGHTS = {
    "favorite_memory": 8,
    "childhood_smell": 6,
    "previous_perfumes": 6,
    "unpleasant_smell": 5,
}
BIO_WEIGHTS = {"skin_evolution": 5, "natural_skin_scent": 5}
BLACKLIST_PENALTY = 0.25
BUDGET_RANGES = {
    "100 - 200 RON": (100, 200),
    "250 - 400 RON": (250, 400),
    "450 - 850 RON": (450, 850),
    "900 - 1500 RON": (900, 1500),
    "1700+ RON": (1700, float("inf")),
}

OLFACTORY_FAMILIES = (
    "citrus",
    "floral",
    "aquatic",
    "green",
    "amber",
    "woody",
    "gourmand",
    "spicy",
    "musk",
    "powdery",
    "smoky",
    "leather",
    "aromatic",
)

# Each UI association projects into the same olfactory-family vector space as the catalog.
W_CROSS: dict[str, dict[str, dict[str, float]]] = {
    "color": {
        "citrus": {"citrus": 1.0, "aromatic": 0.3},
        "floral": {"floral": 1.0, "powdery": 0.25},
        "aquatic": {"aquatic": 1.0, "citrus": 0.25},
        "green": {"green": 1.0, "aromatic": 0.4},
        "violet": {"amber": 0.55, "floral": 0.35, "spicy": 0.25},
        "amber": {"amber": 1.0, "woody": 0.45, "gourmand": 0.3},
        "neutral": {"musk": 0.45, "powdery": 0.3, "floral": 0.2},
    },
    "shape": {
        "sphere": {"floral": 0.3, "gourmand": 0.35, "musk": 0.3},
        "sharp": {"spicy": 0.45, "citrus": 0.35, "woody": 0.3},
        "cube": {"woody": 0.5, "aromatic": 0.35},
        "dodecahedron": {"amber": 0.35, "woody": 0.35, "spicy": 0.25},
        "spiral": {"aquatic": 0.35, "aromatic": 0.4, "citrus": 0.3},
    },
    "texture": {
        "linen": {"citrus": 0.5, "aquatic": 0.5, "aromatic": 0.2},
        "velvet": {"gourmand": 0.4, "amber": 0.4, "powdery": 0.25},
        "silk": {"floral": 0.45, "musk": 0.3, "powdery": 0.25},
        "cotton": {"musk": 0.4, "powdery": 0.35, "floral": 0.2},
        "leather": {"leather": 0.65, "woody": 0.35, "smoky": 0.2},
        "wool": {"amber": 0.35, "woody": 0.3, "gourmand": 0.25},
    },
    "environment": {
        "forest": {"green": 0.6, "woody": 0.55, "aromatic": 0.25},
        "coast": {"aquatic": 0.65, "aromatic": 0.25, "citrus": 0.2},
        "garden": {"citrus": 0.55, "floral": 0.45, "green": 0.2},
        "volcanic": {"smoky": 0.5, "amber": 0.45, "spicy": 0.3},
        "field": {"aromatic": 0.45, "citrus": 0.3, "green": 0.25},
        "lake": {"aquatic": 0.5, "green": 0.3, "aromatic": 0.2},
    },
    "music": {
        "pop": {"floral": 0.3, "musk": 0.35, "gourmand": 0.25},
        "urban": {"woody": 0.35, "amber": 0.3, "spicy": 0.3},
        "classical": {"floral": 0.35, "aromatic": 0.3, "powdery": 0.25},
        "jazz": {"woody": 0.4, "leather": 0.3, "amber": 0.25},
        "rock": {"smoky": 0.4, "leather": 0.35, "spicy": 0.25},
        "electronic": {"aquatic": 0.35, "aromatic": 0.35, "citrus": 0.25},
        "folk": {"woody": 0.35, "green": 0.35, "aromatic": 0.25},
    },
}

FAMILY_SYNONYMS: dict[str, set[str]] = {
    "citrus": {
        "citrice", "lamaie", "limeta", "bergamota", "grapefruit", "portocala",
        "mandarina", "yuzu", "citron", "lime",
    },
    "floral": {
        "floral", "trandafir", "iasomie", "tuberoza", "bujor", "floare", "iris",
        "magnolie", "lavanda", "neroli", "ylang", "violeta", "gardenie",
    },
    "aquatic": {
        "acvatic", "marin", "marine", "apa", "briza", "ozonic", "sare", "calone",
        "oceanic", "sea",
    },
    "green": {
        "verde", "iarba", "frunze", "galbanum", "ceai verde", "busuioc", "menta",
        "conifere", "pini", "mușchi", "moss",
    },
    "amber": {
        "ambra", "chihlimbar", "rasina", "labdanum", "benzoin", "tamaie", "smirna",
        "balsamic", "amber",
    },
    "woody": {
        "lemn", "cedru", "santal", "vetiver", "oud", "paciuli", "guaiac", "cashmeran",
        "chiparos", "stejar",
    },
    "gourmand": {
        "vanilie", "caramel", "pralina", "miere", "ciocolata", "cafea", "prajitura",
        "patiserie", "tonka", "migdal", "zahar", "cacao",
    },
    "spicy": {
        "condiment", "piper", "scortisoara", "cardamom", "sofran", "ghimbir",
        "cuisoare", "nucsoara", "cumin",
    },
    "musk": {"mosc", "musk", "mosc alb"},
    "powdery": {"pudrat", "pudra", "iris", "violeta", "heliotrop", "talcul"},
    "smoky": {"fum", "afumat", "tutun", "cenusa", "incens", "tamaie", "smoky"},
    "leather": {"piele", "piele intoarsa", "suede", "leather"},
    "aromatic": {
        "aromatic", "rozmarin", "salvie", "lavanda", "cimbru", "tarhon", "busuioc",
        "ienupar",
    },
}

MEMORY_SYNONYMS: dict[str, set[str]] = {
    "tei": {"tei", "linden", "floare de tei"},
    "ploaie": {"ploaie", "petrichor", "pamant ud", "asfalt ud", "miros de ploaie"},
    "mare": {"mare", "sare", "marin", "acvatic", "briza", "plaja", "ocean"},
    "fum": {"fum", "afumat", "tamaie", "incens", "cenusa", "lemn ars"},
    "lemn": {"lemn", "cedru", "santal", "vetiver", "padure", "stejar"},
    "citrice": {"citrice", "lamaie", "limeta", "bergamota", "grapefruit", "portocala"},
    "trandafir": {"trandafir", "rose", "bujor", "petale"},
    "cafea": {"cafea", "espresso", "cappuccino", "boabe de cafea"},
    "prajituri": {"prajituri", "patiserie", "vanilie", "caramel", "aluat copt"},
    "iarba": {"iarba", "verde", "frunze", "camp", "cosit"},
    "piele": {"piele", "leather", "suede", "piele intoarsa"},
    "mosc": {"mosc", "musk", "curat", "sapun"},
    "dulce": {"dulce", "vanilie", "caramel", "miere", "zahar"},
    "condimentat": {"condiment", "piper", "scortisoara", "cardamom", "sofran"},
    "floral": {"floral", "iasomie", "tuberoza", "floare", "lavanda"},
    "fructat": {"fruct", "mar", "para", "piersica", "pruna", "cireasa"},
    "curat": {"curat", "proaspat", "bumbac", "rufarie", "sapun", "proaspat spalat"},
    "menta": {"menta", "mentol", "eucalipt"},
    "pudrat": {"pudrat", "pudra", "talcul", "iris"},
    "ambra": {"ambra", "chihlimbar", "rasina", "balsamic"},
    "tutun": {"tutun", "tigara", "trabuc"},
    "vanilie": {"vanilie", "vanilla", "crema de vanilie"},
    "cacao": {"cacao", "ciocolata", "ciocolata neagra"},
}

def _normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.lower())
    without_accents = "".join(
        char for char in decomposed if not unicodedata.combining(char)
    )
    return re.sub(r"[^a-z0-9]+", " ", without_accents).strip()


_FAMILY_TERM_INDEX = {
    family: {_normalize(term) for term in terms}
    for family, terms in FAMILY_SYNONYMS.items()
}
_MEMORY_TERM_INDEX = {
    concept: {_normalize(term) for term in terms}
    for concept, terms in MEMORY_SYNONYMS.items()
}


def _term_pattern(terms: set[str]) -> re.Pattern[str]:
    alternatives = "|".join(re.escape(term) for term in sorted(terms, key=len, reverse=True))
    return re.compile(rf"(?<!\w)(?:{alternatives})(?!\w)")


_FAMILY_PATTERNS = {
    family: _term_pattern(terms)
    for family, terms in _FAMILY_TERM_INDEX.items()
}
_MEMORY_PATTERNS = {
    concept: _term_pattern(terms)
    for concept, terms in _MEMORY_TERM_INDEX.items()
}


def _canonical(value: str, dimension: str) -> str:
    normalized = _normalize(value)
    if dimension == "color":
        if any(term in normalized for term in ("galben", "portocaliu", "citric")):
            return "citrus"
        if any(term in normalized for term in ("roz", "floral", "petale", "pink")):
            return "floral"
        if any(term in normalized for term in ("albastru", "azur", "egee", "acvatic")):
            return "aquatic"
        if any(term in normalized for term in ("verde", "smarald", "botanic", "maslin")):
            return "green"
        if any(term in normalized for term in ("purpuriu", "violet", "nocturn")):
            return "violet"
        if any(term in normalized for term in ("chihlimbar", "rasinos", "amber", "auriu")):
            return "amber"
        if any(term in normalized for term in ("alb", "marmura", "neutru")):
            return "neutral"
    elif dimension == "shape":
        if any(term in normalized for term in ("sfera", "bouba", "rotunjita", "organica")):
            return "sphere"
        if any(term in normalized for term in ("piramida", "tetraedru", "kiki", "muchii", "ascutit")):
            return "sharp"
        if any(term in normalized for term in ("cub", "hexagonal", "hexagon")):
            return "cube"
        if "dodecaedru" in normalized:
            return "dodecahedron"
        if any(term in normalized for term in ("spirala", "vartej", "archimede", "val")):
            return "spiral"
    elif dimension == "texture":
        if any(term in normalized for term in ("in racoros", "panza aerata", "racoros")):
            return "linen"
        if any(term in normalized for term in ("catifea", "velvet")):
            return "velvet"
        if any(term in normalized for term in ("matase", "silk")):
            return "silk"
        if "bumbac" in normalized or "cotton" in normalized:
            return "cotton"
        if any(term in normalized for term in ("piele", "suede")):
            return "leather"
        if "lana" in normalized or "wool" in normalized:
            return "wool"
    elif dimension == "environment":
        if any(term in normalized for term in ("conifere", "padure", "ceata", "forest")):
            return "forest"
        if any(term in normalized for term in ("stancoasa", "plaja", "coasta", "briza", "mare")):
            return "coast"
        if any(term in normalized for term in ("gradina", "mediteranean", "citrice")):
            return "garden"
        if any(term in normalized for term in ("vulcan", "foc", "nocturn")):
            return "volcanic"
        if any(term in normalized for term in ("camp", "uscat", "soare")):
            return "field"
        if "lac" in normalized:
            return "lake"
    elif dimension == "music":
        if any(term in normalized for term in ("rap", "trap", "urban", "hip hop", "hiphop")):
            return "urban"
        if any(term in normalized for term in ("pop", "r b", "r&b")):
            return "pop"
        if any(term in normalized for term in ("clasic", "instrumental")):
            return "classical"
        if any(term in normalized for term in ("jazz", "blues")):
            return "jazz"
        if any(term in normalized for term in ("rock", "alternativ")):
            return "rock"
        if any(term in normalized for term in ("electronic", "synth", "ambient")):
            return "electronic"
        if any(term in normalized for term in ("acoustic", "folk")):
            return "folk"
    elif dimension == "moment":
        return "zi" if "zi" in normalized else "noapte"
    elif dimension == "space":
        return "interior" if "interior" in normalized else "exterior"
    return normalized


def _project_answer(dimension: str, answer: str) -> dict[str, float]:
    category = _canonical(answer, dimension)
    return W_CROSS.get(dimension, {}).get(category, {})


@lru_cache(maxsize=50_000)
def _family_vector(text: str) -> np.ndarray:
    normalized = _normalize(text)
    vector = np.zeros(len(OLFACTORY_FAMILIES), dtype=float)
    for index, family in enumerate(OLFACTORY_FAMILIES):
        hits = len(set(_FAMILY_PATTERNS[family].findall(normalized)))
        vector[index] = min(1.0, hits / 2)
    return vector


def _perfume_family_vector(perfume: dict[str, Any]) -> np.ndarray:
    searchable_fields = (
        "top_notes",
        "heart_notes",
        "base_notes",
        "accords",
        "memory_keywords_ro",
    )
    text_parts = [
        str(value)
        for field in searchable_fields
        for value in perfume.get(field, [])
    ]
    text_parts.append(str(perfume.get("description_ro", "")))
    note_vector = _family_vector(" ".join(text_parts))

    tags = perfume.get("cross_modal", {})
    projected_vectors = []
    for dimension in CROSS_MODAL_WEIGHTS:
        for tag in tags.get(dimension, []):
            projection = _project_answer(dimension, str(tag))
            if projection:
                projected_vectors.append(
                    np.array(
                        [projection.get(family, 0.0) for family in OLFACTORY_FAMILIES],
                        dtype=float,
                    )
                )
    if projected_vectors:
        legacy_vector = np.mean(projected_vectors, axis=0)
        note_vector = note_vector * 0.8 + legacy_vector * 0.2
    return note_vector


def _cross_modal_similarity(
    perfumes: list[dict[str, Any]],
    answers: dict[str, str],
) -> np.ndarray:
    query_vector = np.zeros(len(OLFACTORY_FAMILIES), dtype=float)
    for dimension, weight in CROSS_MODAL_WEIGHTS.items():
        projection = _project_answer(dimension, answers[dimension])
        for index, family in enumerate(OLFACTORY_FAMILIES):
            query_vector[index] += weight * projection.get(family, 0.0)

    if not np.any(query_vector):
        return np.zeros(len(perfumes), dtype=float)

    catalog_matrix = np.vstack([_perfume_family_vector(perfume) for perfume in perfumes])
    return cosine_similarity(query_vector.reshape(1, -1), catalog_matrix)[0]


def _tags(perfume: dict[str, Any], group: str, dimension: str) -> list[str]:
    values = perfume.get(group, {}).get(dimension, [])
    return [
        _canonical(str(value), dimension)
        for value in values
        if str(value).strip()
    ]


def _dimension_similarity(
    perfumes: list[dict[str, Any]],
    group: str,
    dimension: str,
    answer: str,
) -> np.ndarray:
    labels = [_tags(perfume, group, dimension) for perfume in perfumes]
    if not any(labels):
        return np.full(len(perfumes), 0.5, dtype=float)
    query = [_canonical(answer, dimension)]
    known_labels = sorted({tag for row in labels for tag in row} | set(query))
    encoder = MultiLabelBinarizer(classes=known_labels)
    matrix = encoder.fit_transform(labels)
    query_vector = encoder.transform([query])
    return cosine_similarity(query_vector, matrix)[0]


def _extract_memory_concepts(text: str) -> set[str]:
    normalized = _normalize(text)
    return {
        concept for concept, pattern in _MEMORY_PATTERNS.items() if pattern.search(normalized)
    }


def _memory_documents(perfume: dict[str, Any]) -> str:
    return " ".join(
        [
            str(perfume.get("name", "")),
            str(perfume.get("brand", "")),
            *[str(value) for field in ("top_notes", "heart_notes", "base_notes", "accords", "memory_keywords_ro")
              for value in perfume.get(field, [])],
            str(perfume.get("description_ro", "")),
        ]
    )


@lru_cache(maxsize=1)
def _memory_catalog_features(
    documents: tuple[str, ...],
) -> tuple[TfidfVectorizer, Any, tuple[str, ...]]:
    vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        sublinear_tf=True,
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w+\b",
    )
    catalog_matrix = vectorizer.fit_transform(documents)
    normalized_documents = tuple(_normalize(document) for document in documents)
    return vectorizer, catalog_matrix, normalized_documents


def _memory_query_scores(
    perfumes: list[dict[str, Any]],
    queries: list[str],
) -> tuple[np.ndarray, list[set[str]]]:
    documents = tuple(_memory_documents(perfume) for perfume in perfumes)
    vectorizer, catalog_matrix, normalized_documents = _memory_catalog_features(
        documents
    )
    query_matrix = vectorizer.transform(queries)
    similarities = cosine_similarity(query_matrix, catalog_matrix)
    extracted = [_extract_memory_concepts(query) for query in queries]
    positive_weight_total = sum(
        MEMORY_WEIGHTS[key]
        for key in ("favorite_memory", "childhood_smell", "previous_perfumes")
    )
    memory_weights = np.array(
        [
            MEMORY_WEIGHTS["favorite_memory"],
            MEMORY_WEIGHTS["childhood_smell"],
            MEMORY_WEIGHTS["previous_perfumes"],
        ],
        dtype=float,
    ) / positive_weight_total
    result = np.zeros(len(perfumes), dtype=float)

    for query_index, concepts in enumerate(extracted):
        if concepts:
            keyword_scores = np.zeros(len(perfumes), dtype=float)
            for perfume_index, searchable in enumerate(normalized_documents):
                matched = sum(
                    bool(_MEMORY_PATTERNS[concept].search(searchable))
                    for concept in concepts
                )
                keyword_scores[perfume_index] = matched / len(concepts)
            similarities[query_index] = (
                0.65 * keyword_scores + 0.35 * similarities[query_index]
            )
        result += memory_weights[query_index] * similarities[query_index]
    return np.clip(result, 0, 1), extracted


def _negative_memory_matches(perfume: dict[str, Any], disliked: str) -> bool:
    concepts = _extract_memory_concepts(disliked)
    if not concepts:
        return False
    searchable = _normalize(_memory_documents(perfume))
    return any(_MEMORY_PATTERNS[concept].search(searchable) for concept in concepts)


def _bio_similarity(perfume: dict[str, Any], request: RecommendationRequest) -> float:
    profile = perfume.get("bio_profile", {})
    evolution = _normalize(request.bio_profile.skin_evolution)
    skin_scent = _normalize(request.bio_profile.natural_skin_scent)
    evolution_tags = [_normalize(str(value)) for value in profile.get("skin_evolution", [])]
    skin_tags = [_normalize(str(value)) for value in profile.get("natural_skin_scent", [])]

    if "dulce" in evolution:
        evolution_score = (
            1.0
            if any("dulce" in tag for tag in evolution_tags)
            else float(profile.get("warmth", 0.5))
        )
    elif "acrisor" in evolution:
        evolution_score = (
            1.0
            if any("acrisor" in tag for tag in evolution_tags)
            else 1.0 - float(profile.get("citrus_acidity", 0.5))
        )
    elif any(term in evolution for term in ("pierde", "intensitate", "dispare")):
        evolution_score = float(profile.get("fixative_strength", 0.5))
    else:
        evolution_score = 0.5

    if "dulce" in skin_scent:
        scent_score = (
            1.0
            if any("dulce" in tag for tag in skin_tags)
            else float(profile.get("warmth", 0.5))
        )
    elif any(term in skin_scent for term in ("sarat", "moscat")):
        scent_score = (
            1.0
            if any(term in tag for tag in skin_tags for term in ("sarat", "moscat"))
            else 0.5
        )
    elif any(term in skin_scent for term in ("neutru", "niciun")):
        scent_score = 1.0 if any("neutru" in tag for tag in skin_tags) else 0.65
    else:
        scent_score = 0.5
    weighted_score = (
        evolution_score * BIO_WEIGHTS["skin_evolution"]
        + scent_score * BIO_WEIGHTS["natural_skin_scent"]
    ) / sum(BIO_WEIGHTS.values())
    return float(np.clip(weighted_score, 0, 1))


def _budget_distance(price: float, budget: tuple[float, float]) -> float:
    lower, upper = budget
    if lower <= price <= upper:
        return 0
    if price < lower:
        return lower - price
    return price - upper


def _explanation(
    perfume: dict[str, Any],
    request: RecommendationRequest,
    negative_match: bool,
    memory_concepts: list[set[str]],
) -> str:
    notes = (
        perfume.get("top_notes", [])[:1]
        + perfume.get("heart_notes", [])[:1]
        + perfume.get("base_notes", [])[:2]
    )
    note_text = ", ".join(notes) or ", ".join(perfume.get("accords", [])[:2])
    remembered = sorted(memory_concepts[0] | memory_concepts[1])
    memory_text = ", ".join(remembered[:3]) or "descrierea amintirilor tale"
    blacklist_text = (
        "Am identificat o notă asociată unei amintiri neplăcute și am redus scorul cu 25%."
        if negative_match
        else "Nu am identificat în profilul parfumului o notă din lista ta de evitat."
    )
    return (
        f"Muritorule, asocierea {request.cross_modal.shape.lower()} și textura "
        f"{request.cross_modal.texture.lower()} proiectează spre familii olfactive care se "
        f"întâlnesc în notele de {note_text}. Din amintirile tale am extras indicii precum "
        f"{memory_text}, iar {perfume['name']} oferă o potrivire relevantă în catalog. "
        f"{blacklist_text} Scorul este o estimare euristică, nu o măsurătoare genetică "
        f"sau medicală."
    )


def _calibrate_scores(raw_scores: np.ndarray) -> np.ndarray:
    """Keep ranking order while mapping the strongest catalog match to 82–96%."""
    best_raw = float(np.max(raw_scores))
    target_max = 82.0 + 14.0 * float(np.clip(best_raw / 100.0, 0, 1))
    lowest = float(np.min(raw_scores))
    spread = best_raw - lowest
    if spread <= 1e-12:
        return np.full(raw_scores.shape, target_max, dtype=float)

    floor = min(68.0, target_max - 14.0)
    return floor + (raw_scores - lowest) / spread * (target_max - floor)


def recommend(
    request: RecommendationRequest,
    perfumes: list[dict[str, Any]],
    data_source: str,
) -> dict[str, Any]:
    """Return three explainable recommendations using a weighted hybrid model."""
    if len(perfumes) < 3:
        raise ValueError("At least three perfume records are required to make recommendations.")

    budget = BUDGET_RANGES.get(request.budget_range)
    if budget is None:
        raise ValueError(f"Unsupported budget range: {request.budget_range}")
    matching_budget = [
        perfume
        for perfume in perfumes
        if str(perfume.get("budget_range", "")).strip() == request.budget_range
    ]
    in_budget = [
        perfume
        for perfume in matching_budget
        if _budget_distance(float(perfume["price_ron"]), budget) == 0
    ]
    if len(in_budget) >= 3:
        perfumes = in_budget
    elif len(matching_budget) >= 3:
        perfumes = matching_budget

    cross_answers = request.cross_modal.model_dump()
    context_answers = request.context.model_dump()
    cross_scores = _cross_modal_similarity(perfumes, cross_answers)
    for dimension, weight in CROSS_MODAL_WEIGHTS.items():
        if not _project_answer(dimension, cross_answers[dimension]):
            cross_scores = np.maximum(
                cross_scores,
                _dimension_similarity(perfumes, "cross_modal", dimension, cross_answers[dimension])
                * (weight / sum(CROSS_MODAL_WEIGHTS.values())),
            )

    context_scores = np.zeros(len(perfumes), dtype=float)
    for dimension, weight in CONTEXT_WEIGHTS.items():
        context_scores += _dimension_similarity(
            perfumes,
            "context",
            dimension,
            context_answers[dimension],
        ) * weight
    context_scores /= sum(CONTEXT_WEIGHTS.values())

    memory_queries = [
        request.memories.favorite_memory,
        request.memories.childhood_smell,
        request.memories.previous_perfumes,
    ]
    positive_memory_scores, memory_concepts = _memory_query_scores(perfumes, memory_queries)
    negative_matches = np.array(
        [
            _negative_memory_matches(perfume, request.memories.unpleasant_smell)
            for perfume in perfumes
        ],
        dtype=bool,
    )
    positive_memory_weight = sum(MEMORY_WEIGHTS.values()) - MEMORY_WEIGHTS["unpleasant_smell"]
    memory_scores = (
        positive_memory_scores * positive_memory_weight
        + (~negative_matches).astype(float) * MEMORY_WEIGHTS["unpleasant_smell"]
    ) / sum(MEMORY_WEIGHTS.values())
    bio_scores = np.array(
        [_bio_similarity(perfume, request) for perfume in perfumes],
        dtype=float,
    )

    total_scores = (
        cross_scores * 0.40
        + context_scores * 0.25
        + memory_scores * 0.25
        + bio_scores * 0.10
    ) * 100
    total_scores = np.where(
        negative_matches,
        total_scores * (1.0 - BLACKLIST_PENALTY),
        total_scores,
    )

    calibrated_scores = _calibrate_scores(total_scores)

    ranked = sorted(
        range(len(perfumes)),
        key=lambda index: (
            total_scores[index],
            -_budget_distance(float(perfumes[index]["price_ron"]), budget),
            str(perfumes[index]["id"]),
        ),
        reverse=True,
    )[:3]

    recommendations = []
    for index in ranked:
        perfume = perfumes[index]
        score_parts = {
            "cross_modal_score": round(float(cross_scores[index] * 100), 1),
            "context_score": round(float(context_scores[index] * 100), 1),
            "memory_score": round(float(memory_scores[index] * 100), 1),
            "bio_score": round(float(bio_scores[index] * 100), 1),
        }
        recommendations.append(
            {
                "id": str(perfume["id"]),
                "name": perfume["name"],
                "brand": perfume["brand"],
                "price_ron": float(perfume["price_ron"]),
                "budget_range": perfume["budget_range"],
                "image_url": perfume.get("image_url"),
                "bottle_style": perfume.get("bottle_style", "Sticlă de parfum"),
                "top_notes": perfume.get("top_notes", []),
                "heart_notes": perfume.get("heart_notes", []),
                "base_notes": perfume.get("base_notes", []),
                "accords": perfume.get("accords", []),
                "description_ro": perfume.get("description_ro", ""),
                "reference_url": perfume.get("reference_url"),
                "compatibility_score": round(float(calibrated_scores[index]), 1),
                "scores": score_parts,
                "explanation_ro": _explanation(
                    perfume,
                    request,
                    bool(negative_matches[index]),
                    memory_concepts,
                ),
            }
        )

    return {
        "recommendations": recommendations,
        "data_source": data_source,
        "disclaimer_ro": (
            "Scorurile sunt estimări euristice calibrate relativ la catalogul și bugetul "
            "selectat; nu reprezintă un test genetic, medical sau o garanție a felului în "
            "care parfumul va evolua pe piele. Prețurile sunt orientative."
        ),
    }
