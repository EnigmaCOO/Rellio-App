/**
 * useReaderSettings — persists reader preferences in localStorage.
 * Changes apply instantly; no full reload required.
 */

import { useState, useEffect, useCallback } from "react";

export interface ReaderSettings {
  fontSize: "sm" | "base" | "lg" | "xl";
  lineHeight: "normal" | "relaxed" | "loose";
  theme: "dark" | "midnight";
}

const STORAGE_KEY = "rellio_reader_settings";

const DEFAULTS: ReaderSettings = {
  fontSize: "base",
  lineHeight: "relaxed",
  theme: "dark",
};

const FONT_SIZE_CSS: Record<ReaderSettings["fontSize"], string> = {
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

const LINE_HEIGHT_CSS: Record<ReaderSettings["lineHeight"], string> = {
  normal: "1.6",
  relaxed: "1.85",
  loose: "2.1",
};

function load(): ReaderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(load);

  const update = useCallback(<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const fontSizePx = FONT_SIZE_CSS[settings.fontSize];
  const lineHeightVal = LINE_HEIGHT_CSS[settings.lineHeight];

  return { settings, update, fontSizePx, lineHeightVal };
}
