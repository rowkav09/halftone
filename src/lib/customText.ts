import figlet from "figlet";
import type { GeneratedArt } from "@/lib/art";
import ThreeD from "figlet/fonts/3-D";
import ThreeByFive from "figlet/fonts/3x5";
import AnsiShadow from "figlet/fonts/ANSI Shadow";
import Alligator from "figlet/fonts/Alligator";
import AnsiRegular from "figlet/fonts/ANSI Regular";
import Banner from "figlet/fonts/Banner";
import Banner3 from "figlet/fonts/Banner3";
import BannerThreeD from "figlet/fonts/Banner3-D";
import Big from "figlet/fonts/Big";
import BigMoney from "figlet/fonts/Big Money-ne";
import Bloody from "figlet/fonts/Bloody";
import Block from "figlet/fonts/Block";
import Bubble from "figlet/fonts/Bubble";
import Bulbhead from "figlet/fonts/Bulbhead";
import Chunky from "figlet/fonts/Chunky";
import Cyberlarge from "figlet/fonts/Cyberlarge";
import DeltaCorps from "figlet/fonts/Delta Corps Priest 1";
import Doom from "figlet/fonts/Doom";
import EftiChess from "figlet/fonts/Efti Chess";
import Epic from "figlet/fonts/Epic";
import FunFaces from "figlet/fonts/Fun Faces";
import Graffiti from "figlet/fonts/Graffiti";
import HenryThreeD from "figlet/fonts/Henry 3D";
import LarryThreeD from "figlet/fonts/Larry 3D";
import Lean from "figlet/fonts/Lean";
import Modular from "figlet/fonts/Modular";
import Ogre from "figlet/fonts/Ogre";
import OldBanner from "figlet/fonts/Old Banner";
import Rectangles from "figlet/fonts/Rectangles";
import Roman from "figlet/fonts/Roman";
import Shadow from "figlet/fonts/Shadow";
import Slant from "figlet/fonts/Slant";
import Small from "figlet/fonts/Small";
import StarWars from "figlet/fonts/Star Wars";
import SubZero from "figlet/fonts/Sub-Zero";
import SwampLand from "figlet/fonts/Swamp Land";
import TheEdge from "figlet/fonts/The Edge";
import Standard from "figlet/fonts/Standard";

export type CustomTextStyle = { id: string; name: string; font: string };
export type TextOutputFormat = {
  id: "ascii" | "discord" | "slash" | "tripleSlash" | "slashStar" | "sql" | "javaDoc" | "bash" | "bashMultiline" | "sgml" | "echo" | "python" | "batch" | "singleQuote" | "matlab";
  name: string;
};

export const CUSTOM_TEXT_STYLES: readonly CustomTextStyle[] = [
  { id: "3-d", name: "3-D", font: "3-D" },
  { id: "3x5", name: "3x5", font: "3x5" },
  { id: "ansi-shadow", name: "ANSI Shadow", font: "ANSI Shadow" },
  { id: "alligator", name: "Alligator", font: "Alligator" },
  { id: "ansi", name: "ANSI Regular", font: "ANSI Regular" },
  { id: "banner", name: "Banner", font: "Banner" },
  { id: "banner3", name: "Banner 3", font: "Banner3" },
  { id: "banner-3d", name: "Banner 3-D", font: "Banner3-D" },
  { id: "standard", name: "Standard", font: "Standard" },
  { id: "big", name: "Big", font: "Big" },
  { id: "big-money", name: "Big Money", font: "Big Money-ne" },
  { id: "bloody", name: "Bloody", font: "Bloody" },
  { id: "block", name: "Block", font: "Block" },
  { id: "bubble", name: "Bubble", font: "Bubble" },
  { id: "bulbhead", name: "Bulbhead", font: "Bulbhead" },
  { id: "chunky", name: "Chunky", font: "Chunky" },
  { id: "cyberlarge", name: "Cyberlarge", font: "Cyberlarge" },
  { id: "delta-corps", name: "Delta Corps", font: "Delta Corps Priest 1" },
  { id: "doom", name: "Doom", font: "Doom" },
  { id: "efti-chess", name: "Efti Chess", font: "Efti Chess" },
  { id: "epic", name: "Epic", font: "Epic" },
  { id: "fun-faces", name: "Fun Faces", font: "Fun Faces" },
  { id: "graffiti", name: "Graffiti", font: "Graffiti" },
  { id: "henry-3d", name: "Henry 3D", font: "Henry 3D" },
  { id: "larry-3d", name: "Larry 3D", font: "Larry 3D" },
  { id: "lean", name: "Lean", font: "Lean" },
  { id: "modular", name: "Modular", font: "Modular" },
  { id: "ogre", name: "Ogre", font: "Ogre" },
  { id: "old-banner", name: "Old Banner", font: "Old Banner" },
  { id: "rectangles", name: "Rectangles", font: "Rectangles" },
  { id: "roman", name: "Roman", font: "Roman" },
  { id: "shadow", name: "Shadow", font: "Shadow" },
  { id: "slant", name: "Slant", font: "Slant" },
  { id: "small", name: "Small", font: "Small" },
  { id: "star-wars", name: "Star Wars", font: "Star Wars" },
  { id: "sub-zero", name: "Sub-Zero", font: "Sub-Zero" },
  { id: "swamp-land", name: "Swamp Land", font: "Swamp Land" },
  { id: "the-edge", name: "The Edge", font: "The Edge" },
];

export const TEXT_OUTPUT_FORMATS: readonly TextOutputFormat[] = [
  { id: "ascii", name: "None" },
  { id: "discord", name: "Discord code block · ```" },
  { id: "slash", name: "Single Line Double Slash · //" },
  { id: "tripleSlash", name: "Single Line Triple Slash · ///" },
  { id: "slashStar", name: "Slash Star · /* */" },
  { id: "sql", name: "SQL Comment · --" },
  { id: "javaDoc", name: "JavaDoc · /** */" },
  { id: "bash", name: "Bash Comment · #" },
  { id: "bashMultiline", name: "Bash Multiline · : ' '" },
  { id: "sgml", name: "SGML Comment · <!-- -->" },
  { id: "echo", name: "Echo Commands" },
  { id: "python", name: "Python Multiline · \"\"\"" },
  { id: "batch", name: "Batch · REM" },
  { id: "singleQuote", name: "Single Quote (VBA) · '" },
  { id: "matlab", name: "MATLAB · %" },
];

let fontsRegistered = false;

const registerFonts = () => {
  if (fontsRegistered) return;
  [["3-D", ThreeD], ["3x5", ThreeByFive], ["ANSI Shadow", AnsiShadow], ["Alligator", Alligator], ["ANSI Regular", AnsiRegular], ["Banner", Banner], ["Banner3", Banner3], ["Banner3-D", BannerThreeD], ["Standard", Standard], ["Big", Big], ["Big Money-ne", BigMoney], ["Bloody", Bloody], ["Block", Block], ["Bubble", Bubble], ["Bulbhead", Bulbhead], ["Chunky", Chunky], ["Cyberlarge", Cyberlarge], ["Delta Corps Priest 1", DeltaCorps], ["Doom", Doom], ["Efti Chess", EftiChess], ["Epic", Epic], ["Fun Faces", FunFaces], ["Graffiti", Graffiti], ["Henry 3D", HenryThreeD], ["Larry 3D", LarryThreeD], ["Lean", Lean], ["Modular", Modular], ["Ogre", Ogre], ["Old Banner", OldBanner], ["Rectangles", Rectangles], ["Roman", Roman], ["Shadow", Shadow], ["Slant", Slant], ["Small", Small], ["Star Wars", StarWars], ["Sub-Zero", SubZero], ["Swamp Land", SwampLand], ["The Edge", TheEdge]].forEach(([name, font]) => figlet.parseFont(name, font));
  fontsRegistered = true;
};

export const formatTextOutput = (lines: string[], format: TextOutputFormat["id"]) => {
  switch (format) {
    case "discord": return ["```", ...lines, "```"];
    case "slash": return lines.map((line) => `// ${line}`);
    case "tripleSlash": return lines.map((line) => `/// ${line}`);
    case "slashStar": return lines.map((line) => `/* ${line} */`);
    case "sql": return lines.map((line) => `-- ${line}`);
    case "javaDoc": return ["/**", ...lines.map((line) => ` * ${line}`), " */"];
    case "bash": return lines.map((line) => `# ${line}`);
    case "bashMultiline": return [": '", ...lines, "'"];
    case "sgml": return ["<!--", ...lines, "-->"];
    case "echo": return lines.map((line) => `echo \"${line.replaceAll("\"", "\\\"")}\"`);
    case "python": return ["\"\"\"", ...lines, "\"\"\""];
    case "batch": return lines.map((line) => `REM ${line}`);
    case "singleQuote": return lines.map((line) => `' ${line}`);
    case "matlab": return lines.map((line) => `% ${line}`);
    default: return lines;
  }
};

const singleColour = (line: string, foreground: string) => Array.from(line, () => foreground);
const joinedColours = (prefix: string, colors: string[], suffix: string, foreground: string) => [
  ...singleColour(prefix, foreground),
  ...colors,
  ...singleColour(suffix, foreground),
];

/** Adds optional code/comment wrappers without losing the colour map of the FIGlet rows. */
export const formatGeneratedTextOutput = (art: GeneratedArt, format: TextOutputFormat["id"]): GeneratedArt => {
  if (format === "ascii") return art;
  const decoratedRows = (prefix: string, suffix = "") => art.lines.map((line, row) => ({
    line: `${prefix}${line}${suffix}`,
    colors: joinedColours(prefix, art.colors[row] ?? singleColour(line, art.foreground), suffix, art.foreground),
  }));
  const wrappers = (start: string, end: string, rows = art.lines.map((line, row) => ({ line, colors: art.colors[row] ?? singleColour(line, art.foreground) }))) => [
    { line: start, colors: singleColour(start, art.foreground) },
    ...rows,
    { line: end, colors: singleColour(end, art.foreground) },
  ];
  let rows: Array<{ line: string; colors: string[] }>;
  switch (format) {
    case "discord": rows = wrappers("```", "```"); break;
    case "slash": rows = decoratedRows("// "); break;
    case "tripleSlash": rows = decoratedRows("/// "); break;
    case "slashStar": rows = decoratedRows("/* ", " */"); break;
    case "sql": rows = decoratedRows("-- "); break;
    case "javaDoc": rows = wrappers("/**", " */", decoratedRows(" * ")); break;
    case "bash": rows = decoratedRows("# "); break;
    case "bashMultiline": rows = wrappers(": '", "'"); break;
    case "sgml": rows = wrappers("<!--", "-->"); break;
    case "batch": rows = decoratedRows("REM "); break;
    case "singleQuote": rows = decoratedRows("' "); break;
    case "matlab": rows = decoratedRows("% "); break;
    case "echo": rows = formatTextOutput(art.lines, format).map((line) => ({ line, colors: singleColour(line, art.foreground) })); break;
    case "python": rows = wrappers("\"\"\"", "\"\"\""); break;
    default: rows = art.lines.map((line) => ({ line, colors: singleColour(line, art.foreground) }));
  }
  return {
    ...art,
    lines: rows.map((row) => row.line),
    colors: rows.map((row) => row.colors),
    columns: Math.max(...rows.map((row) => Array.from(row.line).length), 0),
    rows: rows.length,
  };
};

export const generateFigletArt = (text: string, font: string, format: TextOutputFormat["id"] = "ascii"): GeneratedArt => {
  registerFonts();
  const lines = figlet.textSync(text.trim() || "TEXT", { font }).replace(/\s+$/u, "").split("\n");
  const art: GeneratedArt = {
    lines,
    colors: lines.map((line) => Array.from(line, () => "#c8ffbf")),
    columns: Math.max(...lines.map((line) => line.length), 0),
    rows: lines.length,
    foreground: "#c8ffbf",
    background: "#000000",
  };
  return formatGeneratedTextOutput(art, format);
};

export const generateCustomTextArt = (text: string, style: CustomTextStyle, format: TextOutputFormat["id"] = "ascii") => generateFigletArt(text, style.font, format);
