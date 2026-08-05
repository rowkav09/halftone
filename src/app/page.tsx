"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHARACTER_SETS,
  type GeneratedArt,
  PALETTES,
  RESOLUTION_PRESETS,
  type ColorMode,
  type CharacterSetId,
  type PaletteId,
  type ResolutionKey,
  generateArtFromImage,
  generateArtFromText,
  sanitizeCustomCharacters,
  type TextArtStyle,
} from "@/lib/art";

const CHARACTER_SET_OPTIONS: Array<{ id: CharacterSetId; label: string; sample: string }> = [
  { id: "ascii", label: "ASCII", sample: "@#%*+=-:." },
  { id: "braille", label: "Braille", sample: "⣿⣷⣶⣤⣄⣀" },
  { id: "blocks", label: "Blocks", sample: "█▓▒░" },
  { id: "unicode", label: "Unicode Dense", sample: "▁▂▃▄▅▆▇█▓▒░" },
  { id: "unicodeFine", label: "Unicode Fine", sample: "@#WMW$B8&" },
  { id: "custom", label: "Custom text", sample: "ROWAN" },
];

const RESOLUTION_OPTIONS: ResolutionKey[] = ["low", "medium", "high", "ultra", "packed"];

const PLACEHOLDER_PRESETS = ["Terminal", "Cyberpunk", "Retro", "Medieval", "Minimal"];

const BANNER_STYLE_VARIANTS: TextArtStyle[] = Array.from({ length: 50 }, (_, index) => {
  const shapeVariants = [
    { scaleX: 0.92, skew: -8, outline: 2 },
    { scaleX: 0.96, skew: -5, outline: 1 },
    { scaleX: 1.0, skew: -3, outline: 2 },
    { scaleX: 1.04, skew: 0, outline: 0 },
    { scaleX: 1.08, skew: 4, outline: 1 },
    { scaleX: 0.9, skew: 7, outline: 2 },
    { scaleX: 0.98, skew: -1, outline: 1 },
    { scaleX: 1.06, skew: 2, outline: 0 },
    { scaleX: 0.94, skew: -6, outline: 2 },
    { scaleX: 1.02, skew: 5, outline: 1 },
  ];
  const weightVariants = [500, 600, 700, 800, 900] as const;
  const shape = shapeVariants[Math.floor(index / 5)] ?? shapeVariants[0];

  return {
    fontWeight: weightVariants[index % weightVariants.length] ?? 700,
    italic: index % 2 === 1,
    scaleX: shape.scaleX,
    skew: shape.skew,
    outline: shape.outline,
  };
});

const BANNER_ROTATION_MS = 333;

const clampResolution = (value: number) => Math.min(4, Math.max(0, value));
const USAGE_ENDPOINT = "/api/uses";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewTextRef = useRef<HTMLPreElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<string>("Drop an image to start turning it into text art.");
  const [bannerText, setBannerText] = useState<string>("HALFTONE");
  const [bannerStyleIndex, setBannerStyleIndex] = useState<number>(0);
  const [bannerArt, setBannerArt] = useState<GeneratedArt | null>(null);
  const [characterSet, setCharacterSet] = useState<CharacterSetId>("ascii");
  const [customText, setCustomText] = useState<string>("ROWAN");
  const [resolutionIndex, setResolutionIndex] = useState<number>(1);
  const [invert, setInvert] = useState<boolean>(false);
  const [palette, setPalette] = useState<PaletteId>("bw");
  const [colorMode, setColorMode] = useState<ColorMode>("original");
  const [renderCount, setRenderCount] = useState<number>(0);
  const [artLines, setArtLines] = useState<string[]>([]);
  const [columns, setColumns] = useState<number>(0);
  const [rows, setRows] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageReady, setImageReady] = useState<boolean>(false);

  const selectedResolution = RESOLUTION_OPTIONS[clampResolution(resolutionIndex)];
  const paletteDefinition = useMemo(() => PALETTES.find((option) => option.id === palette) ?? PALETTES[0], [palette]);
  const bannerLabel = useMemo(() => bannerText.trim().toUpperCase() || "HALFTONE", [bannerText]);

  useEffect(() => {
    let cancelled = false;

    const loadUsageCount = async () => {
      try {
        const response = await fetch(USAGE_ENDPOINT, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { count?: number };
        if (!cancelled && typeof data.count === "number") {
          setRenderCount(data.count);
        }
      } catch {
        return;
      }
    };

    void loadUsageCount();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setBannerStyleIndex(0);
  }, [bannerLabel, characterSet, customText, resolutionIndex, invert, palette, colorMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerStyleIndex((value) => (value + 1) % BANNER_STYLE_VARIANTS.length);
    }, BANNER_ROTATION_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const renderBanner = async () => {
      try {
        const generated = await generateArtFromText(
          bannerLabel,
          {
            columns: RESOLUTION_PRESETS[selectedResolution].columns,
            characterSet,
            customText,
            invert,
            palette,
            colorMode,
            packed: selectedResolution === "packed",
          },
          BANNER_STYLE_VARIANTS[bannerStyleIndex] ?? BANNER_STYLE_VARIANTS[0],
        );

        if (!cancelled) {
          setBannerArt(generated);
        }
      } catch {
        if (!cancelled) {
          setBannerArt(null);
        }
      }
    };

    void renderBanner();

    return () => {
      cancelled = true;
    };
  }, [bannerLabel, bannerStyleIndex, characterSet, customText, selectedResolution, invert, palette, colorMode]);

  const incrementUsage = async () => {
    try {
      const response = await fetch(USAGE_ENDPOINT, { method: "POST" });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { count?: number };
      if (typeof data.count === "number") {
        setRenderCount(data.count);
      }
    } catch {
      return;
    }
  };

  const loadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }

    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    setFileName(file.name);
    setStatus("Image loaded. Rendering preview.");
    setImageReady(false);

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      imageRef.current = image;
      setImageReady(true);
      setStatus("Image ready. Preview updates live as you adjust the controls.");
    };
    image.onerror = () => {
      setStatus("That file could not be loaded as an image.");
      setImageReady(false);
    };
    image.src = url;
  };

  const renderArt = async () => {
    if (!imageRef.current || !previewCanvasRef.current) {
      return;
    }

    setIsRendering(true);

    try {
      const generated = await generateArtFromImage(imageRef.current, {
        columns: RESOLUTION_PRESETS[selectedResolution].columns,
        characterSet,
        customText,
        invert,
        palette,
        colorMode,
        packed: selectedResolution === "packed",
      });

      setArtLines(generated.lines);
      setColumns(generated.columns);
      setRows(generated.rows);

      const canvas = previewCanvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas 2D context is unavailable.");
      }

      const isPacked = selectedResolution === "packed";
      const fontSize = isPacked ? 11 : 16;
      const padding = isPacked ? 12 : 20;
      const glyphAdvance = isPacked ? 7 : 12;
      const lineHeight = isPacked ? 11 : 20;
      canvas.width = generated.columns * glyphAdvance + padding * 2;
      canvas.height = generated.rows * lineHeight + padding * 2;

      context.fillStyle = generated.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = `${fontSize}px var(--font-mono), monospace`;
      context.textBaseline = "top";

      generated.lines.forEach((line, index) => {
        Array.from(line).forEach((glyph, glyphIndex) => {
          context.fillStyle = colorMode === "original" ? generated.colors[index]?.[glyphIndex] ?? generated.foreground : generated.foreground;
          context.fillText(glyph, padding + glyphIndex * glyphAdvance, padding + index * lineHeight);
        });
      });

      const text = generated.lines.join("\n");
      if (previewTextRef.current) {
        previewTextRef.current.textContent = text;
      }

      setStatus(`Rendered ${generated.columns} x ${generated.rows} characters.`);
      await incrementUsage();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to render the preview.");
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (imageReady) {
      void renderArt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterSet, customText, resolutionIndex, invert, palette, colorMode, imageReady]);

  const exportText = () => {
    const blob = new Blob([artLines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\.[^.]+$/, "") || "halftone"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${fileName.replace(/\.[^.]+$/, "") || "halftone"}.png`;
    link.click();
  };

  const characterSetDisplay = useMemo(() => {
    if (characterSet === "custom") {
      const sanitized = sanitizeCustomCharacters(customText);
      return sanitized.length > 0 ? sanitized : CHARACTER_SETS.ascii;
    }

    return CHARACTER_SETS[characterSet];
  }, [characterSet, customText]);

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 lg:px-5">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.32em] text-slate-500">
            <span>Halftone</span>
            <span>{renderCount} uses</span>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-black/60 px-3 py-3">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-slate-500">
              <span>Word banner</span>
              <span>{bannerStyleIndex + 1}/50</span>
            </div>
            <pre className="overflow-hidden text-[7px] leading-[0.95] text-emerald-200/80 sm:text-[8px]">
              {bannerArt ? bannerArt.lines.join("\n") : bannerLabel}
            </pre>
          </div>
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          <section className="space-y-3 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
            <div
              className={`rounded-[0.9rem] border border-dashed p-3 transition ${isDragging ? "border-emerald-300 bg-emerald-300/10" : "border-white/15 bg-black/40"}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files.item(0);
                if (file) {
                  void loadFile(file);
                }
              }}
            >
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void loadFile(file);
                  }
                }}
              />
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Upload</p>
                  <h2 className="mt-1 text-base font-semibold text-white">Drop or browse</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.value = "";
                      }
                      imageRef.current = null;
                      setFileName("");
                      setArtLines([]);
                      setColumns(0);
                      setRows(0);
                      setImageReady(false);
                      setStatus("Upload an image.");
                    }}
                    className="rounded-full border border-white/10 bg-black/60 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
                <p className="font-mono text-[11px] tracking-[0.2em] text-slate-500">{fileName || "no file"}</p>
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Banner text</h3>
                <p className="mt-1 text-xs text-slate-400">This word cycles through 50 ASCII styles.</p>
              </div>
              <input
                value={bannerText}
                onChange={(event) => setBannerText(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                placeholder="HALFTONE"
              />
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Charset</h3>
                <span className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80">mvp</span>
              </div>
              <div className="grid gap-2">
                {CHARACTER_SET_OPTIONS.map((option) => {
                  const active = characterSet === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCharacterSet(option.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${active ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/8"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-white">{option.label}</div>
                          <div className="mt-1 font-mono text-[11px] tracking-[0.22em] text-slate-500">{option.sample}</div>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-300" : "bg-white/15"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500">
                <span>Resolution</span>
                <span>{RESOLUTION_PRESETS[selectedResolution].label}</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={resolutionIndex}
                onChange={(event) => setResolutionIndex(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-300"
              />
              <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {RESOLUTION_OPTIONS.map((option) => (
                  <span key={option}>{RESOLUTION_PRESETS[option].label}</span>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Invert</h3>
                  <p className="mt-1 text-xs text-slate-400">Dark/light swap</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInvert((value) => !value)}
                  className={`relative h-7 w-12 rounded-full border transition ${invert ? "border-emerald-300/40 bg-emerald-300/20" : "border-white/10 bg-white/10"}`}
                  aria-pressed={invert}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${invert ? "left-5.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Color mode</h3>
                <p className="mt-1 text-xs text-slate-400">Original keeps sampled colors. Mono uses the terminal palette.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColorMode("original")}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${colorMode === "original" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"}`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode("palette")}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${colorMode === "palette" ? "border-emerald-300/40 bg-emerald-300/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10"}`}
                >
                  Palette
                </button>
              </div>
            </div>

            {characterSet === "custom" ? (
              <div className="space-y-3 rounded-[0.9rem] border border-emerald-300/20 bg-emerald-300/8 p-3">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-emerald-100/80">Custom text</h3>
                  <p className="mt-1 text-xs text-slate-400">Only unique characters are used.</p>
                </div>
                <textarea
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/40"
                  placeholder="ROWAN"
                />
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] tracking-[0.2em] text-slate-300">
                  {characterSetDisplay}
                </div>
              </div>
            ) : null}
          </section>

          <section className="flex min-h-[72vh] flex-col rounded-[1rem] border border-white/10 bg-black/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <span>Preview</span>
              <span>{imageReady ? `${columns} x ${rows}` : "waiting"}</span>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[0.9rem] border border-white/10 bg-black">
              {imageReady ? (
                <canvas ref={previewCanvasRef} className="h-auto w-full max-w-full" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.26em] text-slate-400">
                    drop image
                  </div>
                  <p className="max-w-xs text-sm text-slate-500">
                    The image will render here.
                  </p>
                </div>
              )}
              {isRendering ? (
                <div className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] uppercase tracking-[0.3em] text-emerald-200">
                  Rendering
                </div>
              ) : null}
            </div>
            <pre
              ref={previewTextRef}
              className="mt-3 max-h-40 overflow-auto rounded-[0.9rem] border border-white/10 bg-black px-3 py-2 font-mono text-[10px] leading-[0.9rem] text-emerald-100/90"
            >
              {artLines.length ? artLines.join("\n") : ""}
            </pre>
          </section>

          <aside className="space-y-3 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
            <div className="space-y-3 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Export</h3>
                  <p className="mt-1 text-xs text-slate-400">PNG and TXT</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">live</span>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={!artLines.length}
                  onClick={exportPng}
                  className="rounded-full bg-emerald-300 px-3 py-2 text-sm font-semibold text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export PNG
                </button>
                <button
                  type="button"
                  disabled={!artLines.length}
                  onClick={exportText}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Export TXT
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Palette</h3>
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">v1</span>
              </div>
              <div className="grid gap-2">
                {PALETTES.map((option) => {
                  const active = option.id === palette;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPalette(option.id)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${active ? "border-emerald-300/40 bg-emerald-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/10"}`}
                    >
                      <span className="text-sm text-white">{option.name}</span>
                      <span className="inline-flex gap-1">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.foreground }} />
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.accent }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Presets</h3>
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">soon</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PLACEHOLDER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-2 py-2 text-sm text-slate-400 opacity-75"
                    disabled
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-[0.9rem] border border-white/10 bg-black/40 p-3 text-sm text-slate-300">
              <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Stats</div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Characters</span>
                <span>{characterSetDisplay.length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span>Columns</span>
                <span>{columns || RESOLUTION_PRESETS[selectedResolution].columns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rows</span>
                <span>{rows || "--"}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}