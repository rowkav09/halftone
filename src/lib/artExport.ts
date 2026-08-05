import type { GeneratedArt } from "@/lib/art";

const escapeMarkup = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const hexToRgb = (value: string) => {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
  if (!match) return [232, 237, 242] as const;
  return [Number.parseInt(match[1] ?? "e8", 16), Number.parseInt(match[2] ?? "ed", 16), Number.parseInt(match[3] ?? "f2", 16)] as const;
};

const colouredRuns = (line: string, colors: string[], fallback: string) => {
  const runs: Array<{ text: string; color: string }> = [];
  Array.from(line).forEach((glyph, index) => {
    const color = colors[index] ?? fallback;
    const current = runs[runs.length - 1];
    if (current?.color === color) current.text += glyph;
    else runs.push({ text: glyph, color });
  });
  return runs;
};

/** An HTML fragment that retains the per-character colour of an image render. */
export const generateHtmlExport = (art: GeneratedArt) => {
  const rows = art.lines.map((line, row) => colouredRuns(line, art.colors[row] ?? [], art.foreground)
    .map((run) => `<span style="color:${run.color}">${escapeMarkup(run.text)}</span>`).join("")).join("\n");
  return `<!doctype html>
<meta charset="utf-8">
<title>Halftone ASCII art</title>
<pre style="margin:0;padding:24px;background:${art.background};color:${art.foreground};font:16px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre">${rows}</pre>`;
};

/** A standalone SVG made from text nodes, suitable for browser and design-tool import. */
export const generateSvgExport = (art: GeneratedArt) => {
  const fontSize = 16;
  const glyphWidth = 9.6;
  const lineHeight = 20;
  const padding = 24;
  const width = Math.ceil(art.columns * glyphWidth + padding * 2);
  const height = Math.ceil(art.rows * lineHeight + padding * 2);
  const text = art.lines.map((line, row) => {
    const y = padding + fontSize + row * lineHeight;
    return colouredRuns(line, art.colors[row] ?? [], art.foreground).map((run, runIndex, runs) => {
      const previousLength = runs.slice(0, runIndex).reduce((total, previous) => total + Array.from(previous.text).length, 0);
      return `<text x="${padding + previousLength * glyphWidth}" y="${y}" fill="${run.color}">${escapeMarkup(run.text)}</text>`;
    }).join("");
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${art.background}"/><g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${fontSize}" xml:space="preserve">${text}</g></svg>`;
};

/** Proper 24-bit ANSI foreground colour escapes, reset at each line ending. */
export const generateAnsiExport = (art: GeneratedArt) => art.lines.map((line, row) => {
  let activeColor = "";
  let output = "";
  Array.from(line).forEach((glyph, column) => {
    const color = art.colors[row]?.[column] ?? art.foreground;
    if (color !== activeColor) {
      const [red, green, blue] = hexToRgb(color);
      output += `\u001b[38;2;${red};${green};${blue}m`;
      activeColor = color;
    }
    output += glyph;
  });
  return `${output}\u001b[0m`;
}).join("\n");
