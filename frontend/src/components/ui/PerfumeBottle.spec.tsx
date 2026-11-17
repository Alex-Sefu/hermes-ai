import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BottleRoundIcon,
  BottleSquareIcon,
  BottleTallIcon,
  PerfumeBottle,
} from "./PerfumeBottle";

describe("perfume bottle avatars", () => {
  it("renders three distinct decorative bottle silhouettes", () => {
    const square = renderToStaticMarkup(<BottleSquareIcon />);
    const round = renderToStaticMarkup(<BottleRoundIcon />);
    const tall = renderToStaticMarkup(<BottleTallIcon />);

    expect(square).toContain("<svg");
    expect(round).toContain("<svg");
    expect(tall).toContain("<svg");
    expect(new Set([square, round, tall]).size).toBe(3);
    expect(square).toContain('viewBox="0 0 160 200"');
  });

  it("maps each recommendation variant to its own bottle icon", () => {
    const square = renderToStaticMarkup(
      <PerfumeBottle variant="square" className="bottle" />,
    );
    const round = renderToStaticMarkup(
      <PerfumeBottle variant="round" className="bottle" />,
    );
    const tall = renderToStaticMarkup(
      <PerfumeBottle variant="tall" className="bottle" />,
    );

    expect(new Set([square, round, tall]).size).toBe(3);
  });
});
