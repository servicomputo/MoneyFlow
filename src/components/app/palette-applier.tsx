"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { usePaletteStore } from "@/lib/palette-store";
import { getPalette } from "@/lib/palettes";

export function PaletteApplier() {
  const palette = usePaletteStore((s) => s.palette);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const p = getPalette(palette);
    const isDark = (resolvedTheme || theme) === "dark";
    const vars = isDark ? p.dark : p.light;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  }, [palette, theme, resolvedTheme]);

  return null;
}
