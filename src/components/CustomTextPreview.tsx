"use client";

import { useEffect, useMemo, useState } from "react";
import { type GeneratedArt } from "@/lib/art";
import {
  CUSTOM_TEXT_ROTATION_MS,
  CUSTOM_TEXT_STYLES,
  generateCustomTextArt,
} from "@/lib/customText";

type CustomTextPreviewProps = {
  text: string;
};

export function CustomTextPreview({ text }: CustomTextPreviewProps) {
  const [styleIndex, setStyleIndex] = useState<number>(0);
  const [previewArt, setPreviewArt] = useState<GeneratedArt | null>(null);
  const label = useMemo(() => text.trim().toUpperCase() || "TEXT", [text]);
  const activeStyle = CUSTOM_TEXT_STYLES[styleIndex] ?? CUSTOM_TEXT_STYLES[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStyleIndex((value) => (value + 1) % CUSTOM_TEXT_STYLES.length);
    }, CUSTOM_TEXT_ROTATION_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const style = CUSTOM_TEXT_STYLES[styleIndex] ?? CUSTOM_TEXT_STYLES[0];

    const renderPreview = async () => {
      try {
        const generated = await generateCustomTextArt(label, style);
        if (!cancelled) {
          setPreviewArt(generated);
        }
      } catch {
        if (!cancelled) {
          setPreviewArt(null);
        }
      }
    };

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [label, styleIndex]);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/70 p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-emerald-100/80">
        <span>{activeStyle.name}</span>
        <span>{styleIndex + 1}/{CUSTOM_TEXT_STYLES.length}</span>
      </div>
      <pre className="max-h-48 overflow-auto text-[7px] leading-[0.95] text-emerald-200/80 sm:text-[8px]">
        {previewArt ? previewArt.lines.join("\n") : label}
      </pre>
    </div>
  );
}
