import axios from "axios";

export interface RecommendationRequest {
  cross_modal: {
    color: string;
    shape: string;
    texture: string;
    environment: string;
    music: string;
  };
  context: {
    moment: string;
    space: string;
    occasion: string;
    season: string;
    region: string;
  };
  memories: {
    favorite_memory: string;
    childhood_smell: string;
    unpleasant_smell: string;
    previous_perfumes: string;
  };
  bio_profile: {
    skin_evolution: string;
    natural_skin_scent: string;
  };
  budget_range: string;
}

export interface Recommendation {
  id: string;
  name: string;
  brand: string;
  price_ron: number;
  budget_range: string;
  image_url: string | null;
  bottle_style: string;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  accords: string[];
  description_ro: string;
  reference_url?: string | null;
  compatibility_score: number;
  scores: {
    cross_modal_score: number;
    context_score: number;
    memory_score: number;
    bio_score: number;
  };
  explanation_ro: string;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  data_source: string;
  disclaimer_ro: string;
  revelation: string;
}

function answer(answers: Record<number, string>, stepId: number) {
  const value = answers[stepId]?.trim();
  if (!value) {
    throw new Error(`Lipsește răspunsul pentru pasul ${stepId}.`);
  }
  return value;
}

export function buildRecommendationRequest(
  answers: Record<number, string>,
): RecommendationRequest {
  const childhoodAnswer = answer(answers, 12);
  return {
    cross_modal: {
      color: answer(answers, 1),
      shape: answer(answers, 2),
      texture: answer(answers, 3),
      environment: answer(answers, 4),
      music: answer(answers, 5),
    },
    context: {
      moment: answer(answers, 6),
      space: answer(answers, 7),
      occasion: answer(answers, 8),
      season: answer(answers, 9),
      region: answer(answers, 10),
    },
    memories: {
      favorite_memory: answer(answers, 11),
      childhood_smell: childhoodAnswer.startsWith("Da, același miros")
        ? answer(answers, 11)
        : childhoodAnswer,
      unpleasant_smell: answer(answers, 13),
      previous_perfumes: answer(answers, 14),
    },
    bio_profile: {
      skin_evolution: answer(answers, 15),
      natural_skin_scent: answer(answers, 16),
    },
    budget_range: answer(answers, 17),
  };
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchRecommendations(
  answers: Record<number, string>,
  signal?: AbortSignal,
) {
  const payload = buildRecommendationRequest(answers);
  try {
    const response = await axios.post<RecommendationResponse>(
      `${apiBaseUrl}/api/recommend`,
      payload,
      { signal, timeout: 120_000 },
    );
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === "string") throw new Error(detail);
      if (error.code === "ECONNABORTED") {
        throw new Error("Calculul a durat prea mult. Încearcă din nou.");
      }
      throw new Error(
        "Nu am putut contacta API-ul Hermes. Verifică dacă backendul rulează pe portul 8000 și încearcă din nou.",
      );
    }
    throw error;
  }
}
