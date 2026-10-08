import { RepoInfo } from "../types";
import { COLORS, FONT, MONO, WIDTH, langColor } from "./theme";
import { esc, rect, svgClose, svgOpen, terminalCard, text, truncate } from "./util";

const CARD_W = 356;
const CARD_H = 84;
const GAP = 16;
const PAD = 20;

export function renderPinned(repos: RepoInfo[], icons: Record<string, string>): string {
  const rows = Math.ceil(repos.length / 2) || 1;
  const H = 30 + rows * (CARD_H + GAP) - GAP + 16;

  let body = "";
  repos.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * (CARD_W + GAP);
    const y = 42 + row * (CARD_H + GAP);
    const delay = 0.15 + i * 0.08;

    const desc = r.description ? truncate(r.description, 58) : "no description";
    const card =
      rect({ x, y, w: CARD_W, h: CARD_H, rx: 9, fill: COLORS.panel, stroke: COLORS.border, strokeWidth: 1 }) +
      text({ x: x + 14, y: y + 24, text: r.name, size: 14, fill: COLORS.accent, weight: 600, mono: true }, MONO, FONT) +
      (r.fork || r.archived ? tag(x + CARD_W - 56, y + 12, r.archived ? "archived" : "fork") : "") +
      text({ x: x + 14, y: y + 44, text: desc, size: 11.5, fill: COLORS.muted }, FONT, FONT) +
      meta(x + 14, y + 66, r, icons);
    const inner = `<a href="https://github.com/${r.fullName}" target="_blank">${card}</a>`;

    body += `<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.45s" fill="freeze"></animate>${inner}</g>`;
  });

  if (repos.length === 0) {
    body += text({ x: PAD, y: 56, text: "no repositories to pin yet", size: 12, fill: COLORS.muted }, FONT, FONT);
  }

  const { chrome } = terminalCard("pinned.sh", WIDTH, H, MONO);
  return svgOpen(WIDTH, H) + chrome + body + svgClose();
}

function meta(x: number, y: number, r: RepoInfo, icons: Record<string, string>): string {
  let out = "";
  if (r.language) {
    out += `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${langColor(r.language)}"></circle>`;
    out += text({ x: x + 16, y, text: r.language, size: 11, fill: COLORS.muted }, FONT, FONT);
  }
  let mx = x + (r.language ? 16 + textWidth(r.language, 11) + 18 : 0);
  out += star(mx, y - 4) + text({ x: mx + 15, y, text: `\u2605 ${r.stars}`, size: 11, fill: COLORS.muted, mono: true }, MONO, FONT);
  mx += 15 + textWidth(`\u2605 ${r.stars}`, 11) + 18;
  if (r.forks > 0) {
    out += fork(mx, y - 4, icons) + text({ x: mx + 15, y, text: `${r.forks}`, size: 11, fill: COLORS.muted, mono: true }, MONO, FONT);
  }
  return out;
}

function star(x: number, y: number): string {
  return `<path d="M4 0 5 2.6 7.8 2.9 5.7 4.8 6.3 7.5 4 6.1 1.7 7.5 2.3 4.8 0.2 2.9 3 2.6 Z" transform="translate(${x} ${y})" fill="${COLORS.yellow}"></path>`;
}

function fork(x: number, y: number, icons: Record<string, string>): string {
  const d = icons.branch ?? "";
  return `<path d="${d}" transform="translate(${x} ${y}) scale(0.75)" fill="${COLORS.muted}"></path>`;
}

function tag(x: number, y: number, label: string): string {
  return (
    rect({ x, y, w: 42, h: 18, rx: 9, fill: COLORS.panel2, stroke: COLORS.border, strokeWidth: 1 }) +
    text({ x: x + 21, y: y + 13, text: label, size: 9, fill: COLORS.faint, anchor: "middle" }, FONT, FONT)
  );
}

function textWidth(s: string, size: number): number {
  return s.length * size * 0.6;
}

export { esc };
