import { COLORS } from "./theme";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface RectOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function rect(o: RectOpts): string {
  const s: string[] = [`x="${o.x}"`, `y="${o.y}"`, `width="${o.w}"`, `height="${o.h}"`];
  if (o.rx !== undefined) s.push(`rx="${o.rx}"`);
  if (o.fill !== undefined) s.push(`fill="${o.fill}"`);
  if (o.stroke !== undefined) s.push(`stroke="${o.stroke}"`);
  if (o.strokeWidth !== undefined) s.push(`stroke-width="${o.strokeWidth}"`);
  if (o.opacity !== undefined) s.push(`opacity="${o.opacity}"`);
  return `<rect ${s.join(" ")}></rect>`;
}

export interface TextOpts {
  x: number;
  y: number;
  text: string;
  size?: number;
  fill?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  spacing?: number;
  opacity?: number;
}

export function text(o: TextOpts, monoFont: string, sansFont: string): string {
  const s: string[] = [`x="${o.x}"`, `y="${o.y}"`];
  s.push(`font-family="${o.mono ? monoFont : sansFont}"`);
  s.push(`font-size="${o.size ?? 13}"`);
  s.push(`fill="${o.fill ?? COLORS.text}"`);
  if (o.weight) s.push(`font-weight="${o.weight}"`);
  if (o.anchor) s.push(`text-anchor="${o.anchor}"`);
  if (o.spacing) s.push(`letter-spacing="${o.spacing}"`);
  if (o.opacity !== undefined) s.push(`opacity="${o.opacity}"`);
  return `<text ${s.join(" ")}>${esc(o.text)}</text>`;
}

/**
 * Terminal-window card: dark panel, rounded, mac traffic-light dots, title.
 * Returns the chrome + a body region starting at `bodyY`.
 */
export function terminalCard(
  title: string,
  w: number,
  h: number,
  monoFont: string
): { chrome: string; bodyY: number } {
  const dots = [COLORS.red, COLORS.yellow, COLORS.greenDot];
  const dotR = 4.5;
  const dotY = 14;
  const dotX = (i: number) => 16 + i * 14;
  const chrome =
    rect({ x: 0, y: 0, w, h, rx: 10, fill: COLORS.bg, stroke: COLORS.border, strokeWidth: 1 }) +
    // title bar: rounded top only
    `<path d="M10 0 H${w - 10} A10 10 0 0 1 ${w} 10 V26 H0 V10 A10 10 0 0 1 10 0 Z" fill="${COLORS.panel}"></path>` +
    `<line x1="0" y1="26" x2="${w}" y2="26" stroke="${COLORS.border}" stroke-width="1"></line>` +
    dots.map((c, i) => `<circle cx="${dotX(i)}" cy="${dotY}" r="${dotR}" fill="${c}"></circle>`).join("") +
    text({ x: w / 2, y: dotY + 4, text: title, size: 11, fill: COLORS.faint, mono: true, anchor: "middle" }, monoFont, "-apple-system");
  return { chrome, bodyY: 26 };
}

/** Staggered fade-in animation element for a given start delay (seconds). */
export function fadeIn(delay: number, dur = 0.45): string {
  return `<animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="${dur}s" fill="freeze"></animate>`;
}

export function svgOpen(w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
}

export function svgClose(): string {
  return `</svg>`;
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function fadeWrap(delay: number, inner: string): string {
  return `<g opacity="0">${fadeIn(delay)}${inner}</g>`;
}
