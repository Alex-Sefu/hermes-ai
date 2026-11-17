import { describe, expect, it } from "vitest";
import { resolvePerfumeReference } from "./perfumeReference";

describe("perfume profile links", () => {
  it("uses the exact catalog URL and identifies its provider", () => {
    expect(
      resolvePerfumeReference({
        brand: "Chanel",
        name: "Bleu de Chanel",
        reference_url: "https://www.fragrantica.com/perfume/Chanel/Bleu-de-Chanel-9028.html",
      }),
    ).toEqual({
      href: "https://www.fragrantica.com/perfume/Chanel/Bleu-de-Chanel-9028.html",
      label: "VEZI PROFILUL PE FRAGRANTICA",
    });
  });

  it("uses a Parfumo search when the catalog has no usable profile URL", () => {
    expect(
      resolvePerfumeReference({
        brand: "Jean Paul Gaultier",
        name: "Le Beau",
        reference_url: null,
      }),
    ).toEqual({
      href: "https://www.parfumo.com/search?q=Jean%20Paul%20Gaultier%20Le%20Beau",
      label: "VEZI PROFILUL PE PARFUMO",
    });
  });

  it("does not allow non-web protocols from catalog values", () => {
    const reference = resolvePerfumeReference({
      brand: "Chanel",
      name: "Bleu de Chanel",
      reference_url: "javascript:alert(1)",
    });

    expect(reference.href).toMatch(/^https:\/\/www\.parfumo\.com\/search\?/);
  });
});
