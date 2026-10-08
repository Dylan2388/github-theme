import { ProfileData } from "../types";
import { COLORS, FONT, MONO, WIDTH } from "./theme";
import { rect, svgClose, svgOpen, terminalCard, text } from "./util";

interface Stat {
  icon: string;
  value: number;
  label: string;
  title: string;
}

const TILE_W = 118;
const TILE_H = 78;
const TILE_Y = 44;
const H = 44 + TILE_H + 16;

export function renderStats(d: ProfileData, icons: Record<string, string>): string {
  const stats: Stat[] = [
    { icon: "flame", value: d.calendar.longest, label: "day streak", title: `longest streak: ${d.calendar.longest} days` },
    { icon: "rocket", value: d.calendar.current, label: "days in a row", title: `current streak: ${d.calendar.current} days` },
    { icon: "branch", value: d.publicRepos, label: "public repos", title: "public repositories" },
    { icon: "star", value: d.starsEarned, label: "stars earned", title: "stars on your repositories" },
    { icon: "calendar", value: d.calendar.total, label: "contributions", title: "contributions in the last 12 months" },
    { icon: "code", value: d.years, label: "years coding", title: "account age in years" },
  ];

  let body = "";
  stats.forEach((s, i) => {
    const x = 1 + i * (TILE_W + 10);
    const delay = 0.15 + i * 0.09;
    const inner =
      rect({ x, y: TILE_Y, w: TILE_W, h: TILE_H, rx: 9, fill: COLORS.panel, stroke: COLORS.border, strokeWidth: 1 }) +
      iconAt(s.icon, x + 12, TILE_Y + 12, icons) +
      text({ x: x + 12, y: TILE_Y + 52, text: String(s.value), size: 24, fill: COLORS.text, mono: true, weight: 700 }, MONO, FONT) +
      text({ x: x + 12, y: TILE_Y + 68, text: s.label, size: 9, fill: COLORS.muted, spacing: 0.6 }, FONT, FONT) +
      `<title>${s.title}</title>`;
    body += `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.5s" fill="freeze"></animate>${inner}</g>`;
  });

  const { chrome } = terminalCard("numbers", WIDTH, H, MONO);
  return svgOpen(WIDTH, H) + chrome + body + svgClose();
}

function iconAt(name: string, x: number, y: number, icons: Record<string, string>): string {
  const d = icons[name] ?? icons.code ?? "";
  return `<path d="${d}" transform="translate(${x} ${y}) scale(0.9)" fill="${COLORS.accent}"></path>`;
}
