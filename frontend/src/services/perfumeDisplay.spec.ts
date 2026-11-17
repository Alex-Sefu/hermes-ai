import { describe, expect, it } from "vitest";
import { formatPerfumeName } from "./perfumeDisplay";

describe("perfume name display", () => {
  it("formats hyphenated and underscored catalog names in title case", () => {
    expect(formatPerfumeName("relax-eau-de-white-floral")).toBe(
      "Relax Eau De White Floral",
    );
    expect(formatPerfumeName("bleu_de_chanel")).toBe("Bleu De Chanel");
  });

  it("trims surrounding whitespace and leaves word boundaries readable", () => {
    expect(formatPerfumeName("  acqua--di_gio  ")).toBe("Acqua Di Gio");
    expect(formatPerfumeName("")).toBe("");
  });
});
