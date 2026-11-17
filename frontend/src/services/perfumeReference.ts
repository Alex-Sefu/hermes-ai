import type { Recommendation } from "./recommendationApi";

type PerfumeReferenceInput = Pick<Recommendation, "brand" | "name" | "reference_url">;

export function resolvePerfumeReference(perfume: PerfumeReferenceInput) {
  const referenceUrl = perfume.reference_url?.trim();
  if (referenceUrl) {
    try {
      const url = new URL(referenceUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        const host = url.hostname.toLowerCase();
        const label = host.includes("fragrantica.com")
          ? "VEZI PROFILUL PE FRAGRANTICA"
          : host.includes("parfumo.com")
            ? "VEZI PROFILUL PE PARFUMO"
            : "VEZI PROFILUL PARFUMULUI";
        return { href: url.href, label };
      }
    } catch {
      // Invalid catalog URLs use the safe Parfumo search fallback below.
    }
  }

  return {
    href: `https://www.parfumo.com/search?q=${encodeURIComponent(`${perfume.brand} ${perfume.name}`)}`,
    label: "VEZI PROFILUL PE PARFUMO",
  };
}
