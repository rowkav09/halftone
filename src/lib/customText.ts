import figlet from "figlet";
import type { GeneratedArt } from "@/lib/art";
import ThreeD from "figlet/fonts/3-D";
import ThreeByFive from "figlet/fonts/3x5";
import ThreeDAscii from "figlet/fonts/3D-ASCII";
import Alpha from "figlet/fonts/Alpha";
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
import Caligraphy from "figlet/fonts/Caligraphy";
import Chiseled from "figlet/fonts/Chiseled";
import Cyberlarge from "figlet/fonts/Cyberlarge";
import DeltaCorps from "figlet/fonts/Delta Corps Priest 1";
import Doom from "figlet/fonts/Doom";
import EftiChess from "figlet/fonts/Efti Chess";
import Electronic from "figlet/fonts/Electronic";
import Epic from "figlet/fonts/Epic";
import FunFaces from "figlet/fonts/Fun Faces";
import Ghost from "figlet/fonts/Ghost";
import Graffiti from "figlet/fonts/Graffiti";
import Isometric from "figlet/fonts/Isometric1";
import HenryThreeD from "figlet/fonts/Henry 3D";
import Impossible from "figlet/fonts/Impossible";
import LarryThreeD from "figlet/fonts/Larry 3D";
import Lean from "figlet/fonts/Lean";
import Modular from "figlet/fonts/Modular";
import Ogre from "figlet/fonts/Ogre";
import OldBanner from "figlet/fonts/Old Banner";
import PatorjkHex from "figlet/fonts/Patorjk-HeX";
import Rectangles from "figlet/fonts/Rectangles";
import Roman from "figlet/fonts/Roman";
import Shadow from "figlet/fonts/Shadow";
import Slant from "figlet/fonts/Slant";
import Small from "figlet/fonts/Small";
import SlantRelief from "figlet/fonts/Slant Relief";
import StarWars from "figlet/fonts/Star Wars";
import SubZero from "figlet/fonts/Sub-Zero";
import SwampLand from "figlet/fonts/Swamp Land";
import TheEdge from "figlet/fonts/The Edge";
import Standard from "figlet/fonts/Standard";

export type CustomTextStyle = { id: string; name: string; font: string };
export type TextOutputFormat = {
  id: "ascii" | "slash" | "slashStar" | "sql" | "javaDoc" | "bash" | "bashMultiline" | "sgml" | "echo" | "python" | "batch";
  name: string;
};

export const CUSTOM_TEXT_STYLES: readonly CustomTextStyle[] = [
  { id: "3-d", name: "3-D", font: "3-D" },
  { id: "3x5", name: "3x5", font: "3x5" },
  { id: "3d-ascii", name: "3D ASCII", font: "3D-ASCII" },
  { id: "alpha", name: "Alpha", font: "Alpha" },
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
  { id: "caligraphy", name: "Caligraphy", font: "Caligraphy" },
  { id: "chiseled", name: "Chiseled", font: "Chiseled" },
  { id: "cyberlarge", name: "Cyberlarge", font: "Cyberlarge" },
  { id: "delta-corps", name: "Delta Corps", font: "Delta Corps Priest 1" },
  { id: "doom", name: "Doom", font: "Doom" },
  { id: "efti-chess", name: "Efti Chess", font: "Efti Chess" },
  { id: "electronic", name: "Electronic", font: "Electronic" },
  { id: "epic", name: "Epic", font: "Epic" },
  { id: "fun-faces", name: "Fun Faces", font: "Fun Faces" },
  { id: "ghost", name: "Ghost", font: "Ghost" },
  { id: "graffiti", name: "Graffiti", font: "Graffiti" },
  { id: "isometric", name: "Isometric", font: "Isometric1" },
  { id: "henry-3d", name: "Henry 3D", font: "Henry 3D" },
  { id: "impossible", name: "Impossible", font: "Impossible" },
  { id: "larry-3d", name: "Larry 3D", font: "Larry 3D" },
  { id: "lean", name: "Lean", font: "Lean" },
  { id: "modular", name: "Modular", font: "Modular" },
  { id: "ogre", name: "Ogre", font: "Ogre" },
  { id: "old-banner", name: "Old Banner", font: "Old Banner" },
  { id: "patorjk-hex", name: "Patorjk-HeX", font: "Patorjk-HeX" },
  { id: "rectangles", name: "Rectangles", font: "Rectangles" },
  { id: "roman", name: "Roman", font: "Roman" },
  { id: "shadow", name: "Shadow", font: "Shadow" },
  { id: "slant", name: "Slant", font: "Slant" },
  { id: "small", name: "Small", font: "Small" },
  { id: "slant-relief", name: "Slant Relief", font: "Slant Relief" },
  { id: "star-wars", name: "Star Wars", font: "Star Wars" },
  { id: "sub-zero", name: "Sub-Zero", font: "Sub-Zero" },
  { id: "swamp-land", name: "Swamp Land", font: "Swamp Land" },
  { id: "the-edge", name: "The Edge", font: "The Edge" },
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
  [["3-D", ThreeD], ["3x5", ThreeByFive], ["3D-ASCII", ThreeDAscii], ["Alpha", Alpha], ["ANSI Shadow", AnsiShadow], ["Alligator", Alligator], ["ANSI Regular", AnsiRegular], ["Banner", Banner], ["Banner3", Banner3], ["Banner3-D", BannerThreeD], ["Standard", Standard], ["Big", Big], ["Big Money-ne", BigMoney], ["Bloody", Bloody], ["Block", Block], ["Bubble", Bubble], ["Bulbhead", Bulbhead], ["Chunky", Chunky], ["Caligraphy", Caligraphy], ["Chiseled", Chiseled], ["Cyberlarge", Cyberlarge], ["Delta Corps Priest 1", DeltaCorps], ["Doom", Doom], ["Efti Chess", EftiChess], ["Electronic", Electronic], ["Epic", Epic], ["Fun Faces", FunFaces], ["Ghost", Ghost], ["Graffiti", Graffiti], ["Isometric1", Isometric], ["Henry 3D", HenryThreeD], ["Impossible", Impossible], ["Larry 3D", LarryThreeD], ["Lean", Lean], ["Modular", Modular], ["Ogre", Ogre], ["Old Banner", OldBanner], ["Patorjk-HeX", PatorjkHex], ["Rectangles", Rectangles], ["Roman", Roman], ["Shadow", Shadow], ["Slant", Slant], ["Small", Small], ["Slant Relief", SlantRelief], ["Star Wars", StarWars], ["Sub-Zero", SubZero], ["Swamp Land", SwampLand], ["The Edge", TheEdge]].forEach(([name, font]) => figlet.parseFont(name, font));
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
