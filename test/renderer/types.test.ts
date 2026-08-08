import { describe, expect, it } from "vitest";
import { DITHER_ALGORITHMS, DITHER_METADATA } from "@/lib/renderer/types";

describe("dither metadata", () => {
  it("describes and groups every available algorithm", () => {
    DITHER_ALGORITHMS.forEach((algorithm) => {
      expect(DITHER_METADATA[algorithm].group.length).toBeGreaterThan(0);
      expect(DITHER_METADATA[algorithm].description.length).toBeGreaterThan(0);
    });
  });
});
