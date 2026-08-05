const GLYPHS: Record<string, string[]> = {
  A: ["  #  ", " # # ", "#####", "#   #", "#   #"],
  B: ["#### ", "#   #", "#### ", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  F: ["#####", "#    ", "#### ", "#    ", "#    "],
  G: [" ####", "#    ", "# ###", "#   #", " ####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["  ###", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  Q: [" ### ", "#   #", "# # #", "#  ##", " ####"],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "# # #", "## ##", "#   #"],
  X: ["#   #", " # # ", "  #  ", " # # ", "#   #"],
  Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "   # ", "  #  ", " #   ", "#####"],
  "0": [" ### ", "#  ##", "# # #", "##  #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "#####"],
  "2": [" ### ", "#   #", "  ## ", " #   ", "#####"],
  "3": ["#### ", "    #", " ### ", "    #", "#### "],
  "4": ["#  # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "#### "],
  "6": [" ### ", "#    ", "#### ", "#   #", " ### "],
  "7": ["#####", "   # ", "  #  ", " #   ", "#    "],
  "8": [" ### ", "#   #", " ### ", "#   #", " ### "],
  "9": [" ### ", "#   #", " ####", "    #", " ### "],
  "!": ["  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "  ## ", "     ", "  #  "],
};

export type AsciiBannerStyle = {
  fill: string;
  outline?: boolean;
  shadow?: string;
  slant?: boolean;
  spacing?: number;
};

const normalize = (value: string, fallback: string) => value.replace(/\s+/g, " ").trim().toUpperCase() || fallback;

const isEdge = (bitmap: string[], row: number, column: number) => {
  if (bitmap[row]?.[column] !== "#") return false;
  return [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([y, x]) => bitmap[row + y]?.[column + x] !== "#");
};

export const createAsciiBanner = (text: string, style: AsciiBannerStyle, maxWidth: number) => {
  const words = normalize(text, "TEXT").split(" ");
  const width = Math.max(24, maxWidth);
  const lines: string[] = [];

  for (const word of words) {
    const glyphs = Array.from(word).map((character) => GLYPHS[character] ?? GLYPHS["?"]);
    const baseWidth = glyphs.length * 5 + Math.max(0, glyphs.length - 1) * (style.spacing ?? 1);
    const scale = Math.max(1, Math.min(4, Math.floor(width / Math.max(baseWidth, 1))));
    const outputRows: string[] = [];

    for (let row = 0; row < 5; row += 1) {
      const rowParts = glyphs.map((glyph) => Array.from(glyph?.[row] ?? "     ").map((pixel, column) => {
        if (pixel !== "#") return " ".repeat(scale);
        const mark = style.outline && !isEdge(glyph ?? [], row, column) ? " " : style.fill;
        return mark.repeat(scale);
      }).join("")).join(" ".repeat((style.spacing ?? 1) * scale));
      const padded = style.slant ? `${" ".repeat((4 - row) * scale)}${rowParts}` : rowParts;
      for (let repeat = 0; repeat < scale; repeat += 1) outputRows.push(padded);
    }

    if (style.shadow) {
      lines.push(...outputRows.map((line) => `${line}${style.shadow}`.slice(0, width)));
    } else {
      lines.push(...outputRows.map((line) => line.slice(0, width)));
    }
    lines.push("");
  }

  return lines.slice(0, -1);
};
