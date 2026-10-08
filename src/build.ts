import * as fs from "node:fs";
import * as path from "node:path";
import { collect, getToken, selectPinned } from "./github";
import { ProfileConfig, ProfileData, RepoInfo, Skill } from "./types";
import { renderContributions } from "./svg/contributions";
import { renderStats } from "./svg/stats";
import { renderStack } from "./svg/stack";
import { renderPinned } from "./svg/pinned";
import { renderTyping } from "./svg/typing";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "profile", "public");
const ASSETS = path.join(OUT, "assets");

interface Args {
  demo: boolean;
  preview: boolean;
  out: string;
  baseUrl?: string;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { demo: false, preview: false, out: OUT };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--demo") a.demo = true;
    else if (arg === "--preview") a.preview = true;
    else if (arg === "--out") a.out = path.resolve(argv[++i]);
    else if (arg === "--base-url") a.baseUrl = argv[++i];
  }
  return a;
}

/** Rolling 53-week window start (matches the API's rolling contribution calendar). */
function windowStart(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 52 * 7);
  start.setHours(0, 0, 0, 0);
  return start;
}

function loadConfig(): ProfileConfig {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "profile", "config.json"), "utf8")) as ProfileConfig;
}

function loadIcons(): Record<string, string> {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "profile", "assets", "icons.json"), "utf8")) as Record<string, string>;
}

function defaultBaseUrl(cfg: ProfileConfig, branch = "main"): string {
  // Assets live in the public profile repo (<user>/<user>), pushed by publish.ts.
  return `https://raw.githubusercontent.com/${cfg.user}/${cfg.user}/${branch}/assets`;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function buildReadme(cfg: ProfileConfig, base: string): string {
  const b = base.replace(/\/$/, "");
  const facts: string[] = [];
  if (cfg.location) facts.push(`📍 ${cfg.location}`);
  if (cfg.org) facts.push(`💼 ${cfg.org}`);
  if (cfg.email) facts.push(`✉️ [${cfg.email}](mailto:${cfg.email})`);

  return `<div align="center">

<img src="${b}/typing.svg" alt="what I'm up to" />

**${cfg.name}** — ${cfg.bio}

${facts.join(" &nbsp;·&nbsp; ")}

<sub>${cfg.status}</sub>

</div>

<br/>

<img src="${b}/stats.svg" width="100%" alt="stats" />
<img src="${b}/stack.svg" width="100%" alt="stack" />
<img src="${b}/pinned.svg" width="100%" alt="pinned repositories" />
<img src="${b}/contributions.svg" width="100%" alt="contributions" />

<p align="center"><sub>${cfg.footer ?? ""}</sub></p>
`;
}

async function buildData(cfg: ProfileConfig, demo: boolean): Promise<ProfileData> {
  if (demo) return demoData(cfg);
  const token = getToken();
  const data = await collect(cfg.user, token);
  data.pinnedRepos = selectPinned(cfg, data.repos);
  return data;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();
  const icons = loadIcons();
  const base = args.baseUrl ?? defaultBaseUrl(cfg);

  console.log(`[build] user=${cfg.user} demo=${args.demo} preview=${args.preview}`);
  const data = await buildData(cfg, args.demo);

  const assets = [
    ["typing.svg", () => renderTyping(cfg.typing)],
    ["stats.svg", () => renderStats(data, icons)],
    ["stack.svg", () => renderStack(cfg.skills)],
    ["pinned.svg", () => renderPinned(data.pinnedRepos, icons)],
    ["contributions.svg", () => renderContributions(data.calendar)],
  ] as const;

  for (const [name, render] of assets) {
    write(path.join(args.out, "assets", name), render());
    console.log(`[build] wrote assets/${name}`);
  }

  const readme = buildReadme(cfg, base);
  write(path.join(args.out, "README.md"), readme);
  console.log(`[build] wrote README.md (${data.publicRepos} repos, ${data.calendar.total} contributions, streak ${data.calendar.current}/${data.calendar.longest})`);

  if (args.preview) {
    await writePreview(args.out, cfg, data);
  }
}

async function writePreview(out: string, cfg: ProfileConfig, data: ProfileData): Promise<void> {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${cfg.name} — profile preview</title>
<style>
  body{margin:0;padding:32px;background:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif}
  .wrap{max-width:900px;margin:0 auto}
  img{display:block;max-width:100%;margin:12px 0}
  .center{text-align:center}
  a{color:#58a6ff}
</style></head>
<body><div class="wrap">
<div class="center">
  <img src="./assets/typing.svg" style="margin:0 auto"/>
  <p><strong>${cfg.name}</strong> — ${cfg.bio}</p>
  <p>${[cfg.location, cfg.org].filter(Boolean).join(" · ")}</p>
  <p><sub>${cfg.status}</sub></p>
</div>
<img src="./assets/stats.svg" style="width:100%"/>
<img src="./assets/stack.svg" style="width:100%"/>
<img src="./assets/pinned.svg" style="width:100%"/>
<img src="./assets/contributions.svg" style="width:100%"/>
<p class="center"><sub>${cfg.footer ?? ""}</sub></p>
</div></body></html>`;
  write(path.join(out, "preview.html"), html);
  console.log(`[build] preview: file://${path.join(out, "preview.html")}`);
}

function demoData(cfg: ProfileConfig): ProfileData {
  const start = windowStart();
  const days: ProfileData["calendar"]["days"] = [];
  const months: ProfileData["calendar"]["months"] = [];
  let seed = 1337;
  const rand = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const first = new Date(start);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const today = new Date();
  let i = 0;
  for (let d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const r = rand();
    let count = 0;
    if (d <= today) {
      if (r < 0.42) count = 0;
      else if (r < 0.62) count = 1;
      else if (r < 0.78) count = 2;
      else if (r < 0.9) count = 4;
      else if (r < 0.97) count = 7;
      else count = 12;
    }
    const week = Math.floor(i / 7);
    days.push({ date: iso, count, dow: i % 7, week });
    i++;
  }
  // month labels by each week's Wednesday (matches the real build path)
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekMonth = new Map<number, number>();
  for (const d of days) {
    if (d.dow === 2 && !weekMonth.has(d.week)) weekMonth.set(d.week, Number(d.date.slice(5, 7)));
  }
  let lastMonth = -1;
  for (const [week, m] of weekMonth) {
    if (m !== lastMonth) {
      months.push({ label: MONTHS[m - 1], week });
      lastMonth = m;
    }
  }
  const counts = days.map((d) => d.count);
  const total = counts.reduce((a, b) => a + b, 0);
  let longest = 0;
  let run = 0;
  for (const c of counts) {
    run = c > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = counts.length - 1; i >= 0 && counts[i] > 0; i--) current++;

  const repos: RepoInfo[] = [
    { fullName: `${cfg.user}/voicemap`, name: "voicemap", description: "Identifying people from small audio fragments", language: "Python", stars: 3, forks: 1, fork: false, archived: false },
    { fullName: `${cfg.user}/whitebox-deeplearning`, name: "whitebox-deeplearning", description: "Interpretable deep learning experiments", language: "Python", stars: 2, forks: 0, fork: false, archived: false },
    { fullName: `${cfg.user}/chatbot-solver`, name: "chatbot-solver", description: "A retrieval-augmented tutor for math problems", language: "TypeScript", stars: 1, forks: 0, fork: false, archived: false },
    { fullName: `${cfg.user}/dotfiles`, name: "dotfiles", description: "This is my personal dotfiles", language: "Shell", stars: 1, forks: 0, fork: false, archived: false },
  ];

  return {
    calendar: { total, max: Math.max(1, ...counts), longest, current, days, months },
    repos,
    pinnedRepos: repos,
    accountCreated: "2018-08-12T11:22:29Z",
    years: 8,
    starsEarned: repos.reduce((a, r) => a + r.stars, 0),
    publicRepos: 11,
  };
}

void main().catch((e: unknown) => {
  console.error(`[build] FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
