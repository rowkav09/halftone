import figlet from "figlet";
import type { GeneratedArt } from "@/lib/art";
import Big from "figlet/fonts/Big";
import Block from "figlet/fonts/Block";
import Bubble from "figlet/fonts/Bubble";
import Digital from "figlet/fonts/Digital";
import Doom from "figlet/fonts/Doom";
import Ghost from "figlet/fonts/Ghost";
import Graffiti from "figlet/fonts/Graffiti";
import Lean from "figlet/fonts/Lean";
import Shadow from "figlet/fonts/Shadow";
import Slant from "figlet/fonts/Slant";
import Small from "figlet/fonts/Small";
import Standard from "figlet/fonts/Standard";

export type CustomTextStyle = { id: string; name: string; font: string };
export type TextOutputFormat = {
  id: "ascii" | "slash" | "slashStar" | "sql" | "javaDoc" | "bash" | "bashMultiline" | "sgml" | "echo" | "python" | "batch";
  name: string;
};

export const CUSTOM_TEXT_STYLES: readonly CustomTextStyle[] = [
  { id: "standard", name: "Standard", font: "Standard" },
  { id: "big", name: "Big", font: "Big" },
  { id: "block", name: "Block", font: "Block" },
  { id: "bubble", name: "Bubble", font: "Bubble" },
  { id: "digital", name: "Digital", font: "Digital" },
  { id: "doom", name: "Doom", font: "Doom" },
  { id: "ghost", name: "Ghost", font: "Ghost" },
  { id: "graffiti", name: "Graffiti", font: "Graffiti" },
  { id: "lean", name: "Lean", font: "Lean" },
  { id: "shadow", name: "Shadow", font: "Shadow" },
  { id: "slant", name: "Slant", font: "Slant" },
  { id: "small", name: "Small", font: "Small" },
];

export const TEXT_OUTPUT_FORMATS: readonly TextOutputFormat[] = [
  { id: "ascii", name: "ASCII Art" },
  { id: "slash", name: "Single Line Double Slash · //" },
  { id: "slashStar", name: "Slash Star · /* */" },
  { id: "sql", name: "SQL Comment · --" },
  { id: "javaDoc", name: "JavaDoc · /** */" },
  { id: "bash", name: "Bash Comment · #" },
  { id: "bashMultiline", name: "Bash Multiline · : ' '" },
  { id: "sgml", name: "SGML Comment · <!-- -->" },
  { id: "echo", name: "Echo Commands" },
  { id: "python", name: "Python Multiline · \"\"\"" },
  { id: "batch", name: "Batch · REM" },
];

let fontsRegistered = false;

const registerFonts = () => {
  if (fontsRegistered) return;
  [["Standard", Standard], ["Big", Big], ["Block", Block], ["Bubble", Bubble], ["Digital", Digital], ["Doom", Doom], ["Ghost", Ghost], ["Graffiti", Graffiti], ["Lean", Lean], ["Shadow", Shadow], ["Slant", Slant], ["Small", Small]].forEach(([name, font]) => figlet.parseFont(name, font));
  fontsRegistered = true;
};

const formatLines = (lines: string[], format: TextOutputFormat["id"]) => {
  switch (format) {
    case "slash": return lines.map((line) => `// ${line}`);
    case "slashStar": return lines.map((line) => `/* ${line} */`);
    case "sql": return lines.map((line) => `-- ${line}`);
    case "javaDoc": return ["/**", ...lines.map((line) => ` * ${line}`), " */"];
    case "bash": return lines.map((line) => `# ${line}`);
    case "bashMultiline": return [": '", ...lines, "'"];
    case "sgml": return ["<!--", ...lines, "-->"];
    case "echo": return lines.map((line) => `echo \"${line.replaceAll("\"", "\\\"")}\"`);
    case "python": return ["\"\"\"", ...lines, "\"\"\""];
    case "batch": return lines.map((line) => `REM ${line}`);
    default: return lines;
  }
};

export const generateFigletArt = (text: string, font: string, format: TextOutputFormat["id"] = "ascii"): GeneratedArt => {
  registerFonts();
  const lines = formatLines(figlet.textSync(text.trim() || "TEXT", { font }).replace(/\s+$/u, "").split("\n"), format);
  return {
    lines,
    colors: lines.map((line) => Array.from(line, () => "#c8ffbf")),
    columns: Math.max(...lines.map((line) => line.length), 0),
    rows: lines.length,
    foreground: "#c8ffbf",
    background: "#000000",
  };
};

export const generateCustomTextArt = (text: string, style: CustomTextStyle, format: TextOutputFormat["id"] = "ascii") => generateFigletArt(text, style.font, format);
