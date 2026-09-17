export type ThemeKey = "forest" | "crimson" | "navy" | "royal" | "amber" | "slate";

export type ThemeConfig = {
  key: ThemeKey;
  name: string;
  emoji: string;
  primary: string; // Representative accent color (pitch-600)
  pitch: Record<string, string>;
};

export const themes: Record<ThemeKey, ThemeConfig> = {
  forest: {
    key: "forest",
    name: "Forest",
    emoji: "🌲",
    primary: "#2a6f53",
    pitch: {
      "50": "#f0f7f4", "100": "#dbeee5", "200": "#b8dccc", "300": "#89c4aa",
      "400": "#5aa684", "500": "#3a8a68", "600": "#2a6f53", "700": "#235a44",
      "800": "#1e4837", "900": "#1a3c2e",
    },
  },
  crimson: {
    key: "crimson",
    name: "Crimson",
    emoji: "❤️",
    primary: "#dc2626",
    pitch: {
      "50": "#fef2f2", "100": "#fee2e2", "200": "#fecaca", "300": "#fca5a5",
      "400": "#f87171", "500": "#ef4444", "600": "#dc2626", "700": "#b91c1c",
      "800": "#991b1b", "900": "#7f1d1d",
    },
  },
  navy: {
    key: "navy",
    name: "Navy",
    emoji: "⚓",
    primary: "#2563eb",
    pitch: {
      "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd",
      "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8",
      "800": "#1e40af", "900": "#1e3a8a",
    },
  },
  royal: {
    key: "royal",
    name: "Royal",
    emoji: "👑",
    primary: "#9333ea",
    pitch: {
      "50": "#faf5ff", "100": "#f3e8ff", "200": "#e9d5ff", "300": "#d8b4fe",
      "400": "#c084fc", "500": "#a855f7", "600": "#9333ea", "700": "#7e22ce",
      "800": "#6b21a8", "900": "#581c87",
    },
  },
  amber: {
    key: "amber",
    name: "Amber",
    emoji: "🏆",
    primary: "#d97706",
    pitch: {
      "50": "#fffbeb", "100": "#fef3c7", "200": "#fde68a", "300": "#fcd34d",
      "400": "#fbbf24", "500": "#f59e0b", "600": "#d97706", "700": "#b45309",
      "800": "#92400e", "900": "#78350f",
    },
  },
  slate: {
    key: "slate",
    name: "Slate",
    emoji: "🖤",
    primary: "#475569",
    pitch: {
      "50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0", "300": "#cbd5e1",
      "400": "#94a3b8", "500": "#64748b", "600": "#475569", "700": "#334155",
      "800": "#1e293b", "900": "#0f172a",
    },
  },
};

export const themeKeys = Object.keys(themes) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = "forest";

/** Apply a theme by setting CSS custom properties on the root element */
export function applyTheme(key: ThemeKey): void {
  const theme = themes[key];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.pitch).forEach(([shade, color]) => {
    root.style.setProperty(`--pitch-${shade}`, color);
  });
  // Update the browser's theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.primary);
}
