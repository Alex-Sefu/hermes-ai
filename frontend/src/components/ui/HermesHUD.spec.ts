// Runtime validation coverage for: the sequential perfume-discovery journey.
import { describe, expect, it } from "vitest";
import { storySteps } from "./HermesHUD";

describe("Hermes guided journey", () => {
  it("defines the complete ordered journey through processing and perfume results", () => {
    expect(storySteps.map(({ id }) => id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index),
    );
    expect(storySteps.every(({ message }) => message.length > 0)).toBe(true);
    expect(storySteps[0].kind).toBe("intro");
    expect(storySteps[18].kind).toBe("summary");
    expect(storySteps[19].kind).toBe("results");
  });

  it("offers six color associations with valid color values", () => {
    const colorChoices = storySteps[1].choices;

    expect(colorChoices).toHaveLength(6);
    expect(colorChoices?.every(({ color }) => /^#[\da-f]{6}$/i.test(color ?? ""))).toBe(true);
  });

  it("keeps the context narration while asking the five ordered context questions", () => {
    const contextSteps = storySteps.slice(6, 11);

    expect(contextSteps.map(({ title }) => title)).toEqual([
      "Moment",
      "Spațiu",
      "Ocazie",
      "Anotimp",
      "Regiune",
    ]);
    expect(new Set(contextSteps.map(({ message }) => message)).size).toBe(1);
    expect(contextSteps.map(({ choices }) => choices?.length)).toEqual([2, 2, 5, 4, 4]);
  });

  it("provides text responses, biological quick choices, and RON budget ranges", () => {
    expect(storySteps[11].kind).toBe("text");
    expect(storySteps[12].quickLabel).toBe("Da, același miros îmi definește copilăria");
    expect(storySteps[15].choices?.map(({ label }) => label)).toEqual([
      "Devine mai dulce",
      "Devine mai acrișor",
      "Își pierde complet intensitatea",
    ]);
    expect(storySteps[16].choices?.map(({ label }) => label)).toEqual([
      "Dulce",
      "Sărat / Moscat",
      "Complet neutru",
    ]);
    expect(storySteps[17].choices?.map(({ label }) => label)).toEqual([
      "100 - 200 RON",
      "250 - 400 RON",
      "450 - 850 RON",
      "900 - 1500 RON",
      "1700+ RON",
    ]);
  });
});
