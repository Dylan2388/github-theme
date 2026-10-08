// Rose Pine palette - kept in sync with ~/.config ghostty themes/rosepine
// (wezterm color_scheme, ghostty config-file, alacritty repothemes/rose-pine).
export const COLORS = {
  bg: "#191724", // rose-pine base
  panel: "#141220",
  panel2: "#1f1d2d",
  border: "#2a2837", // rose-pine surface0
  text: "#e0def4", // rose-pine text
  muted: "#908caa", // between overlay1/subtext0
  faint: "#6e6a86", // rose-pine overlay1
  accent: "#c4a7e7", // mauve
  accent2: "#9ccfd8", // iridescent
  green: "#3e8fb0", // goldish-blue (positive)
  red: "#eb6f92", // pine rose
  yellow: "#f6c177", // pine gold
  greenDot: "#31748f", // pine green-blue
} as const;

// GitHub's contribution green scale, remapped to rose-pine blues/iridescent.
export const CONTRIB = ["#1f1d2d", "#223047", "#2e4a6b", "#4a719c", "#89dceb"] as const;

export const FONT = "-apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans, Helvetica, Arial, sans-serif";
export const MONO = "JetBrainsMono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// GitHub language colors, tinted into the rose-pine family.
export const LANG_COLORS: Record<string, string> = {
  Python: "#9ccfd8",
  TypeScript: "#c4a7e7",
  JavaScript: "#f6c177",
  "Jupyter Notebook": "#ebbcba",
  "C++": "#eb6f92",
  C: "#908caa",
  Rust: "#f5e0dc",
  Go: "#89dceb",
  Shell: "#3e8fb0",
  TeX: "#7aa2f0",
  HTML: "#ebbcba",
  CSS: "#c4a7e7",
  Java: "#f6c177",
  Kotlin: "#c4a7e7",
  Swift: "#eb6f92",
  Ruby: "#f2cdcd",
  PHP: "#908caa",
  Dart: "#31748f",
  Lua: "#7aa2f0",
  Vue: "#3e8fb0",
  Dockerfile: "#6e6a86",
  Makefile: "#31748f",
  CMake: "#f6c177",
  SCSS: "#c4a7e7",
  PowerShell: "#6e6a86",
  R: "#7aa2f0",
  Julia: "#c4a7e7",
};

export function langColor(lang?: string | null): string {
  return (lang && LANG_COLORS[lang]) || COLORS.muted;
}

export const WIDTH = 760;
