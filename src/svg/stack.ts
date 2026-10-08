import { Skill } from "../types";
import { COLORS, FONT, MONO, WIDTH } from "./theme";
import { rect, svgClose, svgOpen, terminalCard, text } from "./util";

const ROW_H = 34;
const COL_GAP = 24;
const PAD = 20;
const TRACK_W = 320;

export function renderStack(skills: Skill[]): string {
  const cols = 2;
  const perCol = Math.ceil(skills.length / cols);
  const rows = perCol;
  const H = 30 + rows * ROW_H + 12;
  const colW = (WIDTH - PAD * 2 - COL_GAP) / 2;

  let body = "";
  skills.forEach((s, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = PAD + col * (colW + COL_GAP);
    const y = 44 + row * ROW_H;
    const delay = 0.15 + i * 0.06;
    const fillW = Math.max(3, (s.level / 100) * TRACK_W);
    const inner =
      text({ x, y: y + 8, text: s.name, size: 12.5, fill: COLORS.text }, FONT, FONT) +
      text({ x: x + TRACK_W, y: y + 8, text: `${s.level}%`, size: 11, fill: COLORS.faint, mono: true, anchor: "end" }, MONO, FONT) +
      rect({ x, y: y + 16, w: TRACK_W, h: 7, rx: 3.5, fill: COLORS.panel2 }) +
      `<rect x="${x}" y="${y + 16}" width="0" height="7" rx="3.5" fill="url(#stackgrad)">` +
      `<animate attributeName="width" from="0" to="${fillW}" begin="${delay}s" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.22 0.61 0.36 1"></animate>` +
      `</rect>`;
    body += `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.4s" fill="freeze"></animate>${inner}</g>`;
  });

  const defs =
    `<defs><linearGradient id="stackgrad" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="${COLORS.accent}"></stop>` +
    `<stop offset="100%" stop-color="${COLORS.accent2}"></stop>` +
    `</linearGradient></defs>`;

  const { chrome } = terminalCard("stack", WIDTH, H, MONO);
  return svgOpen(WIDTH, H) + defs + chrome + body + svgClose();
}
