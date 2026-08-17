// Definición de paletas de color para Money Flow
// Cada paleta define los tokens CSS que se aplican dinámicamente

export type PaletteKey = "emerald" | "rose" | "violet" | "amber" | "ocean" | "slate" | "gold";

export interface Palette {
  key: PaletteKey;
  name: string;
  description: string;
  swatch: string; // color representativo para el selector
  // Variables CSS para modo claro y oscuro
  light: Record<string, string>;
  dark: Record<string, string>;
}

// Helper para construir una paleta a partir de un color base oklch
function buildPalette(
  key: PaletteKey,
  name: string,
  description: string,
  swatch: string,
  // L=lightness C=chroma H=hue del color primario
  primaryLCH: [number, number, number]
): Palette {
  const [L, C, H] = primaryLCH;
  const isWarm = H < 100 || H > 320;

  return {
    key,
    name,
    description,
    swatch,
    light: {
      "--background": `oklch(0.99 0.005 ${H})`,
      "--foreground": `oklch(0.18 0.02 ${H})`,
      "--card": "oklch(1 0 0)",
      "--card-foreground": `oklch(0.18 0.02 ${H})`,
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": `oklch(0.18 0.02 ${H})`,
      "--primary": `oklch(${L} ${C} ${H})`,
      "--primary-foreground": "oklch(0.99 0.01 {H})".replace("{H}", String(H)),
      "--secondary": `oklch(0.96 0.015 ${H})`,
      "--secondary-foreground": `oklch(0.25 0.02 ${H})`,
      "--muted": `oklch(0.96 0.01 ${H})`,
      "--muted-foreground": `oklch(0.5 0.02 ${H})`,
      "--accent": `oklch(0.94 0.04 ${H})`,
      "--accent-foreground": `oklch(0.3 0.05 ${H})`,
      "--destructive": "oklch(0.6 0.22 25)",
      "--destructive-foreground": "oklch(0.99 0 0)",
      "--success": `oklch(${L} ${C} ${H})`,
      "--success-foreground": `oklch(0.99 0.01 ${H})`,
      "--warning": "oklch(0.75 0.16 75)",
      "--warning-foreground": "oklch(0.25 0.04 75)",
      "--border": `oklch(0.92 0.01 ${H})`,
      "--input": `oklch(0.92 0.01 ${H})`,
      "--ring": `oklch(${L} ${C} ${H})`,
      "--chart-1": `oklch(${L} ${C} ${H})`,
      "--chart-2": `oklch(0.65 0.13 ${isWarm ? (H + 60) % 360 : (H + 50) % 360})`,
      "--chart-3": `oklch(0.7 0.15 75)`,
      "--chart-4": "oklch(0.6 0.2 25)",
      "--chart-5": `oklch(0.55 0.18 ${isWarm ? (H + 200) % 360 : (H + 180) % 360})`,
      "--sidebar": `oklch(0.98 0.008 ${H})`,
      "--sidebar-foreground": `oklch(0.18 0.02 ${H})`,
      "--sidebar-primary": `oklch(${L} ${C} ${H})`,
      "--sidebar-primary-foreground": `oklch(0.99 0.01 ${H})`,
      "--sidebar-accent": `oklch(0.94 0.04 ${H})`,
      "--sidebar-accent-foreground": `oklch(0.3 0.05 ${H})`,
      "--sidebar-border": `oklch(0.92 0.01 ${H})`,
      "--sidebar-ring": `oklch(${L} ${C} ${H})`,
    },
    dark: {
      "--background": `oklch(0.16 0.015 ${H})`,
      "--foreground": `oklch(0.97 0.01 ${H})`,
      "--card": `oklch(0.21 0.018 ${H})`,
      "--card-foreground": `oklch(0.97 0.01 ${H})`,
      "--popover": `oklch(0.21 0.018 ${H})`,
      "--popover-foreground": `oklch(0.97 0.01 ${H})`,
      "--primary": `oklch(${Math.min(L + 0.08, 0.78)} ${C} ${H})`,
      "--primary-foreground": `oklch(0.16 0.02 ${H})`,
      "--secondary": `oklch(0.27 0.02 ${H})`,
      "--secondary-foreground": `oklch(0.97 0.01 ${H})`,
      "--muted": `oklch(0.25 0.015 ${H})`,
      "--muted-foreground": `oklch(0.68 0.02 ${H})`,
      "--accent": `oklch(0.3 0.04 ${H})`,
      "--accent-foreground": `oklch(0.97 0.01 ${H})`,
      "--destructive": "oklch(0.65 0.2 25)",
      "--destructive-foreground": "oklch(0.99 0 0)",
      "--success": `oklch(${Math.min(L + 0.08, 0.78)} ${C} ${H})`,
      "--success-foreground": `oklch(0.16 0.02 ${H})`,
      "--warning": "oklch(0.78 0.16 75)",
      "--warning-foreground": "oklch(0.16 0.02 75)",
      "--border": "oklch(1 0 0 / 10%)",
      "--input": "oklch(1 0 0 / 14%)",
      "--ring": `oklch(${Math.min(L + 0.08, 0.78)} ${C} ${H})`,
      "--chart-1": `oklch(${Math.min(L + 0.08, 0.78)} ${C} ${H})`,
      "--chart-2": `oklch(0.68 0.13 ${isWarm ? (H + 60) % 360 : (H + 50) % 360})`,
      "--chart-3": "oklch(0.75 0.15 75)",
      "--chart-4": "oklch(0.65 0.2 25)",
      "--chart-5": `oklch(0.6 0.18 ${isWarm ? (H + 200) % 360 : (H + 180) % 360})`,
      "--sidebar": `oklch(0.19 0.015 ${H})`,
      "--sidebar-foreground": `oklch(0.97 0.01 ${H})`,
      "--sidebar-primary": `oklch(${Math.min(L + 0.08, 0.78)} ${C} ${H})`,
      "--sidebar-primary-foreground": `oklch(0.16 0.02 ${H})`,
      "--sidebar-accent": `oklch(0.3 0.04 ${H})`,
      "--sidebar-accent-foreground": `oklch(0.97 0.01 ${H})`,
      "--sidebar-border": "oklch(1 0 0 / 10%)",
      "--sidebar-ring": `oklch(${Math.min(L + 0.08, 0.78)} ${C} ${H})`,
    },
  };
}

export const PALETTES: Palette[] = [
  buildPalette(
    "emerald",
    "Esmeralda",
    "Verde fresco, asociado a dinero y finanzas",
    "#10b981",
    [0.62, 0.15, 155]
  ),
  buildPalette(
    "rose",
    "Rosa",
    "Cálido y moderno, estilo Revolut",
    "#f43f5e",
    [0.62, 0.21, 12]
  ),
  buildPalette(
    "violet",
    "Violeta",
    "Elegante y creativo",
    "#8b5cf6",
    [0.58, 0.2, 285]
  ),
  buildPalette(
    "amber",
    "Ámbar",
    "Dorado y energético",
    "#f59e0b",
    [0.72, 0.16, 65]
  ),
  buildPalette(
    "ocean",
    "Océano",
    "Turquesa sereno",
    "#06b6d4",
    [0.62, 0.13, 210]
  ),
  buildPalette(
    "slate",
    "Pizarra",
    "Neutral y sofisticado",
    "#64748b",
    [0.55, 0.015, 250]
  ),
  {
    key: "gold",
    name: "Negro Dorado",
    description: "Premium, elegante y lujoso",
    swatch: "#D4AF37",
    light: {
      "--background": "oklch(0.14 0.005 80)",
      "--foreground": "oklch(0.92 0.02 80)",
      "--card": "oklch(0.18 0.008 80)",
      "--card-foreground": "oklch(0.92 0.02 80)",
      "--popover": "oklch(0.18 0.008 80)",
      "--popover-foreground": "oklch(0.92 0.02 80)",
      "--primary": "oklch(0.76 0.13 85)",
      "--primary-foreground": "oklch(0.14 0.01 80)",
      "--secondary": "oklch(0.22 0.01 80)",
      "--secondary-foreground": "oklch(0.92 0.02 80)",
      "--muted": "oklch(0.22 0.01 80)",
      "--muted-foreground": "oklch(0.65 0.02 80)",
      "--accent": "oklch(0.25 0.03 85)",
      "--accent-foreground": "oklch(0.92 0.02 80)",
      "--destructive": "oklch(0.6 0.22 25)",
      "--destructive-foreground": "oklch(0.99 0 0)",
      "--success": "oklch(0.76 0.13 85)",
      "--success-foreground": "oklch(0.14 0.01 80)",
      "--warning": "oklch(0.75 0.16 75)",
      "--warning-foreground": "oklch(0.14 0.01 80)",
      "--border": "oklch(0.28 0.02 80)",
      "--input": "oklch(0.28 0.02 80)",
      "--ring": "oklch(0.76 0.13 85)",
      "--chart-1": "oklch(0.76 0.13 85)",
      "--chart-2": "oklch(0.68 0.1 50)",
      "--chart-3": "oklch(0.7 0.12 30)",
      "--chart-4": "oklch(0.6 0.15 15)",
      "--chart-5": "oklch(0.65 0.1 200)",
      "--sidebar": "oklch(0.12 0.005 80)",
      "--sidebar-foreground": "oklch(0.92 0.02 80)",
      "--sidebar-primary": "oklch(0.76 0.13 85)",
      "--sidebar-primary-foreground": "oklch(0.14 0.01 80)",
      "--sidebar-accent": "oklch(0.25 0.03 85)",
      "--sidebar-accent-foreground": "oklch(0.92 0.02 80)",
      "--sidebar-border": "oklch(0.28 0.02 80)",
      "--sidebar-ring": "oklch(0.76 0.13 85)",
    },
    dark: {
      "--background": "oklch(0.11 0.005 80)",
      "--foreground": "oklch(0.93 0.02 80)",
      "--card": "oklch(0.16 0.008 80)",
      "--card-foreground": "oklch(0.93 0.02 80)",
      "--popover": "oklch(0.16 0.008 80)",
      "--popover-foreground": "oklch(0.93 0.02 80)",
      "--primary": "oklch(0.8 0.14 85)",
      "--primary-foreground": "oklch(0.11 0.01 80)",
      "--secondary": "oklch(0.22 0.01 80)",
      "--secondary-foreground": "oklch(0.93 0.02 80)",
      "--muted": "oklch(0.22 0.01 80)",
      "--muted-foreground": "oklch(0.7 0.02 80)",
      "--accent": "oklch(0.28 0.04 85)",
      "--accent-foreground": "oklch(0.93 0.02 80)",
      "--destructive": "oklch(0.65 0.2 25)",
      "--destructive-foreground": "oklch(0.99 0 0)",
      "--success": "oklch(0.8 0.14 85)",
      "--success-foreground": "oklch(0.11 0.01 80)",
      "--warning": "oklch(0.78 0.16 75)",
      "--warning-foreground": "oklch(0.11 0.01 80)",
      "--border": "oklch(0.3 0.025 80)",
      "--input": "oklch(0.3 0.025 80)",
      "--ring": "oklch(0.8 0.14 85)",
      "--chart-1": "oklch(0.8 0.14 85)",
      "--chart-2": "oklch(0.68 0.1 50)",
      "--chart-3": "oklch(0.7 0.12 30)",
      "--chart-4": "oklch(0.65 0.15 15)",
      "--chart-5": "oklch(0.6 0.1 200)",
      "--sidebar": "oklch(0.09 0.005 80)",
      "--sidebar-foreground": "oklch(0.93 0.02 80)",
      "--sidebar-primary": "oklch(0.8 0.14 85)",
      "--sidebar-primary-foreground": "oklch(0.11 0.01 80)",
      "--sidebar-accent": "oklch(0.28 0.04 85)",
      "--sidebar-accent-foreground": "oklch(0.93 0.02 80)",
      "--sidebar-border": "oklch(0.3 0.025 80)",
      "--sidebar-ring": "oklch(0.8 0.14 85)",
    },
  },
];

export const PALETTE_MAP: Record<PaletteKey, Palette> = PALETTES.reduce(
  (acc, p) => {
    acc[p.key] = p;
    return acc;
  },
  {} as Record<PaletteKey, Palette>
);

export function getPalette(key: PaletteKey): Palette {
  return PALETTE_MAP[key] || PALETTES[0];
}
