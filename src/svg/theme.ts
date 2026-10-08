export const COLORS = {
  bg: "#0d1117",
  panel: "#161b22",
  panel2: "#1c2129",
  border: "#30363d",
  text: "#e6edf3",
  muted: "#8b949e",
  faint: "#6e7681",
  accent: "#58a6ff",
  accent2: "#bc8cff",
  green: "#3fb950",
  red: "#ff5f56",
  yellow: "#ffbd2e",
  greenDot: "#27c93f",
} as const;

export const CONTRIB = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"] as const;

export const FONT = "-apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans, Helvetica, Arial, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5",
  "Jupyter Notebook": "#DA5B0B",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  "C++": "#f34b7d",
  C: "#555555",
  Rust: "#dea584",
  Go: "#00ADD8",
  Shell: "#89e051",
  TeX: "#3C8C4E",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Dart: "#00B4AB",
  Lua: "#000080",
  Vue: "#41B883",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  "Visual Basic .NET": "#945db7",
  CMake: "#6f4e37",
  SCSS: "#c6538c",
  PowerShell: "#012456",
  R: "#198CE7",
  Julia: "#a270ba",
};

export function langColor(lang?: string | null): string {
  return (lang && LANG_COLORS[lang]) || COLORS.muted;
}

export const WIDTH = 760;
