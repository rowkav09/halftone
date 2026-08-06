import { afterEach, describe, expect, it } from "vitest";
import { brailleGlyphAt, edgeDirectionGlyphForTone, glyphForTone, orderGlyphsByDensity, textureGlyphForTone } from "@/lib/renderer/glyphs";
import { installCanvasMock } from "../helpers/canvas";

let restore: (() => void) | undefined;
afterEach(() => restore?.());

describe("renderer glyph selection", () => {
  const installDensityCanvas = () => {
    const mock = installCanvasMock();
    restore = mock.restore;
  };
  it("orders and selects density glyphs deterministically", () => {
    installDensityCanvas();
    const first = orderGlyphsByDensity("@ .#");
    const second = orderGlyphsByDensity("@ .#");

    expect(first).toEqual(second);
    expect(glyphForTone(-1, first)).toBe(first[0]);
    expect(glyphForTone(2, first)).toBe(first.at(-1));
  });

  it("uses stable texture and directional glyph choices", () => {
    expect(textureGlyphForTone(0.6, "matrix", 4, 7)).toBe(textureGlyphForTone(0.6, "matrix", 4, 7));
    expect(edgeDirectionGlyphForTone(0.8, Math.PI / 2)).toBe(edgeDirectionGlyphForTone(0.8, Math.PI / 2));
  });

  it("maps a compact tone field to the expected braille dot", () => {
    const field = { width: 2, height: 4, values: new Float32Array([1, 0, 0, 0, 0, 0, 0, 0]) };
    expect(brailleGlyphAt(field, 0, 0)).toBe("⠁");
  });
});
