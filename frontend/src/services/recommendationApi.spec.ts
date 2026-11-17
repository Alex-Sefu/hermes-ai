import { describe, expect, it } from "vitest";
import { buildRecommendationRequest } from "./recommendationApi";

describe("recommendation request mapping", () => {
  it("maps the complete story profile to the backend contract", () => {
    const request = buildRecommendationRequest({
      1: "Chihlimbar Auriu",
      2: "Sfera Perfectă",
      3: "Catifea regală",
      4: "Pădure cu ceață",
      5: "Jazz / Blues",
      6: "Noapte",
      7: "Interior",
      8: "Nuntă / Eveniment special",
      9: "Toamnă",
      10: "Munte",
      11: "Amintire cu vanilie",
      12: "Mirosul copilăriei",
      13: "Fum",
      14: "Parfumuri lemnoase",
      15: "Devine mai dulce",
      16: "Dulce",
      17: "450 - 850 RON",
    });

    expect(request.cross_modal).toEqual({
      color: "Chihlimbar Auriu",
      shape: "Sfera Perfectă",
      texture: "Catifea regală",
      environment: "Pădure cu ceață",
      music: "Jazz / Blues",
    });
    expect(request.context.region).toBe("Munte");
    expect(request.memories.unpleasant_smell).toBe("Fum");
    expect(request.bio_profile.natural_skin_scent).toBe("Dulce");
    expect(request.budget_range).toBe("450 - 850 RON");
  });

  it("fails explicitly when a required answer is missing", () => {
    expect(() => buildRecommendationRequest({})).toThrow("Lipsește răspunsul");
  });

  it("reuses the favorite memory when the user confirms the childhood scent", () => {
    const request = buildRecommendationRequest({
      1: "Chihlimbar Auriu",
      2: "Sfera Perfectă",
      3: "Catifea regală",
      4: "Pădure cu ceață",
      5: "Jazz / Blues",
      6: "Noapte",
      7: "Interior",
      8: "Zilnic",
      9: "Toamnă",
      10: "Munte",
      11: "Miros de tei după ploaie",
      12: "Da, același miros îmi definește copilăria",
      13: "Niciunul",
      14: "Parfumuri lemnoase",
      15: "Devine mai dulce",
      16: "Dulce",
      17: "100 - 200 RON",
    });

    expect(request.memories.childhood_smell).toBe("Miros de tei după ploaie");
  });
});
