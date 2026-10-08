import { Calendar } from "../types";
import { CONTRIB, COLORS, FONT, MONO, WIDTH } from "./theme";
import { esc, rect, svgClose, svgOpen, terminalCard, text } from "./util";

const CELL = 11;
const GAP = 2.5;
const STEP = CELL + GAP; // 13.5
const PAD_L = 34;
const GRID_Y = 72;
const H = 182;

function levelColor(count: number, max: number): string {
  if (count <= 0) return CONTRIB[0];
  const q = Math.min(3, Math.floor((count - 1) / (max / 4)));
  return CONTRIB[1 + q];
}

export function renderContributions(cal: Calendar): string {
  const weeks = cal.days.reduce((m, d) => Math.max(m, d.week), 0) + 1;
  const gridW = weeks * STEP;
  const first = cal.days.find((d) => d.date);
  const last = cal.days[cal.days.length - 1];
  const range =
    first && last
      ? `${monthName(first.date)} ${yearOf(first.date)} \u2192 ${monthName(last.date)} ${yearOf(last.date)}`
      : "";

  let body = "";

  // header line
  body += text(
    { x: 16, y: 50, text: `${cal.total} contributions`, size: 12.5, fill: COLORS.text, mono: true, weight: 600 },
    MONO,
    FONT
  );
  body += text({ x: 16 + textWidth(`${cal.total} contributions`, 12.5) + 10, y: 50, text: `\u00b7 ${range}`, size: 12.5, fill: COLORS.faint, mono: true }, MONO, FONT);

  // legend (right aligned)
  const cells = CONTRIB.map((c, i) => rect({ x: 640 + i * 13, y: 41, w: 10, h: 10, rx: 2, fill: c }));
  body += text({ x: 636, y: 50, text: "less", size: 9, fill: COLORS.faint, anchor: "end" }, FONT, FONT);
  body += cells.join("");
  body += text({ x: 707, y: 50, text: "more", size: 9, fill: COLORS.faint }, FONT, FONT);

  // month labels (already deduped per month; only guard against crowding)
  let lastLabelX = -100;
  for (const m of cal.months) {
    const x = PAD_L + m.week * STEP;
    if (x - lastLabelX < 26) continue;
    body += text({ x, y: GRID_Y - 8, text: m.label, size: 9, fill: COLORS.faint }, FONT, FONT);
    lastLabelX = x;
  }

  // weekday labels (grid is Monday-first: dow 0 = Monday)
  const dowLabels: Record<number, string> = { 0: "Mon", 2: "Wed", 4: "Fri" };
  for (let dow = 0; dow < 7; dow++) {
    if (!dowLabels[dow]) continue;
    body += text({ x: 2, y: GRID_Y + dow * STEP + 9, text: dowLabels[dow], size: 8.5, fill: COLORS.faint }, FONT, FONT);
  }

  // cells
  for (const d of cal.days) {
    if (!d.date) continue;
    const x = PAD_L + d.week * STEP;
    const y = GRID_Y + d.dow * STEP;
    const delay = 0.15 + d.week * 0.014;
    const cell =
      `<g opacity="0">` +
      `<animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.5s" fill="freeze"></animate>` +
      rect({ x, y, w: CELL, h: CELL, rx: 2.5, fill: levelColor(d.count, cal.max) }) +
      `<title>${d.count} contribution${d.count === 1 ? "" : "s"} on ${d.date}</title>` +
      `</g>`;
    body += cell;
  }

  const { chrome } = terminalCard("contributions.sh", WIDTH, H, MONO);
  return svgOpen(WIDTH, H) + chrome + body + svgClose();
}

function monthName(iso: string): string {
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return m[Number(iso.slice(5, 7)) - 1];
}

function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

// rough monospace width estimate
function textWidth(s: string, size: number): number {
  return s.length * size * 0.62;
}

export { esc };
