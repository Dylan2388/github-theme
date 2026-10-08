import { COLORS, MONO, WIDTH } from "../svg/theme";
import { esc, svgClose, svgOpen } from "./util";

const FONT_SIZE = 21;
const CHAR_W = FONT_SIZE * 0.6; // monospace estimate
const PREFIX = "$ ";
const LINE_Y = 74;
const TYPE_STEP = 0.055; // s per char typed
const DELETE_STEP = 0.03;
const HOLD = 1.6;
const PAUSE = 0.35;
const H = 118;
// Extend the clip a few px to the LEFT of the text so the first glyph's left
// edge (its anti-aliased overhang) is never cut off as the clip opens.
const CLIP_PAD = 4;

interface Point {
  t: number;
  w: number;
}

/**
 * Looping typewriter rendered with pure SMIL. Works inside <img>, which is
 * the only animation mechanism GitHub renders in a profile README.
 *
 * Each word gets its own clipPath. Its width timeline spans the FULL cycle
 * but is 0 outside the word's slot, so only the active word is revealed as it
 * types. keyTimes are normalized to [0,1] to match dur=total.
 */
export function renderTyping(words: string[], title = "now"): string {
  const list = words.length ? words : ["hello"];
  const longest = list.reduce((m, w) => Math.max(m, w.length), 0);
  const W = Math.max(WIDTH, PREFIX.length * CHAR_W + longest * CHAR_W + 96);

  const prefixX = 24;
  const textX = prefixX + PREFIX.length * CHAR_W;
  const clipX = textX - CLIP_PAD; // start left of the first glyph's left bearing
  const caretW = 10;
  const caretH = FONT_SIZE + 4;

  // Clip width for "i chars visible" includes the left pad so glyph side
  // bearings are never sliced.
  const wAt = (i: number) => (i <= 0 ? 0 : CLIP_PAD + i * CHAR_W);

  // Build per-word in-slot (t, width) points plus the global caret timeline.
  const slotPoints: Point[][] = [];
  const caretPts: Point[] = [{ t: 0, w: textX }];
  let t = 0;

  for (const word of list) {
    const full = word.length * CHAR_W;
    const pts: Point[] = [];

    // typing
    for (let i = 1; i <= word.length; i++) {
      t += TYPE_STEP;
      pts.push({ t, w: wAt(i) });
      caretPts.push({ t, w: textX + i * CHAR_W });
    }
    // hold (full word + right pad so the last glyph's right bearing shows)
    t += HOLD;
    pts.push({ t, w: full + 2 * CLIP_PAD });
    caretPts.push({ t, w: textX + full });
    // deleting
    for (let i = word.length - 1; i >= 0; i--) {
      t += DELETE_STEP;
      pts.push({ t, w: wAt(i) });
      caretPts.push({ t, w: textX + i * CHAR_W });
    }
    // pause
    t += PAUSE;
    pts.push({ t, w: 0 });
    caretPts.push({ t, w: textX });

    slotPoints.push(pts);
  }

  const total = t;

  // Turn an in-slot list into a full-cycle timeline (0 outside the slot).
  const fullCycle = (pts: Point[]): Point[] => {
    const first = pts[0];
    const last = pts[pts.length - 1];
    const out: Point[] = [{ t: 0, w: 0 }, { t: first.t, w: 0 }, ...pts, { t: last.t, w: 0 }, { t: total, w: 0 }];
    // merge duplicate timestamps (keep the later width)
    const merged: Point[] = [];
    for (const p of out) {
      if (merged.length && merged[merged.length - 1].t === p.t) merged[merged.length - 1] = p;
      else merged.push(p);
    }
    return merged;
  };

  // normalize keyTimes to [0,1], strictly increasing
  const norm = (times: number[]): string => {
    const out: number[] = [];
    for (const raw of times) {
      let v = Math.min(1, Math.max(0, +(raw / total).toFixed(5)));
      if (out.length && v <= out[out.length - 1]) v = Math.min(1, +(out[out.length - 1] + 0.00001).toFixed(5));
      out.push(v);
    }
    return out.join(";");
  };

  const defs = slotPoints
    .map((pts, i) => {
      const fc = fullCycle(pts);
      const kt = norm(fc.map((p) => p.t));
      const vals = fc.map((p) => p.w.toFixed(1)).join(";");
      return `<clipPath id="typing-clip-${i}"><rect x="${clipX}" y="${LINE_Y - FONT_SIZE}" width="0" height="${FONT_SIZE + 8}">` +
        `<animate attributeName="width" calcMode="linear" dur="${total.toFixed(3)}s" repeatCount="indefinite" ` +
        `keyTimes="${kt}" values="${vals}"></animate></rect></clipPath>`;
    })
    .join("");

  const wordsSvg = list
    .map(
      (word, i) =>
        `<g clip-path="url(#typing-clip-${i})"><text x="${textX}" y="${LINE_Y}" font-family="${MONO}" ` +
        `font-size="${FONT_SIZE}" fill="${COLORS.text}">${esc(word)}</text></g>`
    )
    .join("");

  const caretSvg =
    `<rect x="${textX}" y="${LINE_Y - FONT_SIZE + 2}" width="${caretW}" height="${caretH}" fill="${COLORS.accent}">` +
    `<animate attributeName="opacity" calcMode="discrete" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1.05s" repeatCount="indefinite"></animate>` +
    `<animate attributeName="x" calcMode="linear" dur="${total.toFixed(3)}s" repeatCount="indefinite" ` +
    `keyTimes="${norm(caretPts.map((p) => p.t))}" values="${caretPts.map((p) => p.w.toFixed(1)).join(";")}"></animate>` +
    `</rect>`;

  const chrome =
    `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1"></rect>` +
    `<path d="M10 0 H${W - 10} A10 10 0 0 1 ${W} 10 V26 H0 V10 A10 10 0 0 1 10 0 Z" fill="${COLORS.panel}"></path>` +
    `<line x1="0" y1="26" x2="${W}" y2="26" stroke="${COLORS.border}" stroke-width="1"></line>` +
    `<circle cx="16" cy="14" r="4.5" fill="${COLORS.red}"></circle>` +
    `<circle cx="30" cy="14" r="4.5" fill="${COLORS.yellow}"></circle>` +
    `<circle cx="44" cy="14" r="4.5" fill="${COLORS.greenDot}"></circle>` +
    `<text x="${W / 2}" y="18" font-family="${MONO}" font-size="11" fill="${COLORS.faint}" text-anchor="middle">${esc(title)}</text>`;

  const prefix = `<text x="${prefixX}" y="${LINE_Y}" font-family="${MONO}" font-size="${FONT_SIZE}" fill="${COLORS.green}">${esc(PREFIX)}</text>`;

  return svgOpen(W, H) + `<defs>${defs}</defs>` + chrome + prefix + wordsSvg + caretSvg + svgClose();
}
