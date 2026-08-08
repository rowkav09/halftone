import { describe, expect, it } from "vitest";
import { cssBackground, linearGradientEndpoints, svgBackground, type Background } from "@/lib/background";
import { generateHtmlExport, generateSvgExport } from "@/lib/artExport";
import type { GeneratedArt } from "@/lib/art";

const art = (background: Background): GeneratedArt => ({
  lines: ["AB"],
  colors: [["#ffffff", "#ffffff"]],
  columns: 2,
  rows: 1,
  foreground: "#ffffff",
  background,
  backgroundColour: "#000000",
});

describe("background rendering", () => {
  it("maps the documented angles to full-box endpoints", () => {
    expect(linearGradientEndpoints(100, 50, 0)).toMatchObject({ startX: 0, endX: 100, startY: 25, endY: 25 });
    expect(linearGradientEndpoints(100, 50, 90)).toMatchObject({ startX: 50, endX: 50, endY: 50 });
    expect(linearGradientEndpoints(100, 50, 90).startY).toBeCloseTo(0);
    expect(linearGradientEndpoints(100, 50, 45).startX).toBeLessThan(50);
    expect(linearGradientEndpoints(100, 50, 45).endY).toBeGreaterThan(25);
  });

  it("shares interpolation direction in CSS and SVG", () => {
    const background: Background = { kind: "linear", startColour: "#ff0000", endColour: "#0000ff", angle: 90 };
    const svg = svgBackground(background, 100, 50);
    expect(svg.defs).toContain('x1="50" y1="');
    expect(svg.defs).toContain('" x2="50" y2="50"');
    expect(cssBackground(background)).toContain("180deg");
  });

  it("omits transparent backgrounds from HTML and SVG", () => {
    const transparent = art({ kind: "transparent" });
    expect(generateSvgExport(transparent)).not.toContain("<rect");
    expect(generateHtmlExport(transparent)).not.toContain("background:");
    expect(cssBackground(transparent.background)).toBeUndefined();
  });
});
