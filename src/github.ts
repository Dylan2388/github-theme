import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Calendar, DayCell, MonthLabel, ProfileData, RepoInfo } from "./types";

const UA = "github-theme";
const API = "https://api.github.com";

/** env first, then a github.com / api.github.com entry in ~/.netrc (mode 600). */
export function getToken(): string | undefined {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    const netrc = fs.readFileSync(path.join(os.homedir(), ".netrc"), "utf8");
    for (const line of netrc.split("\n")) {
      const m = line.match(/^machine\s+(?:api\.)?github\.com\s+login\s+\S+\s+password\s+(\S+)/);
      if (m) return m[1];
    }
  } catch {
    /* no .netrc */
  }
  return undefined;
}

export function hasGh(): boolean {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function rest<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = { "User-Agent": UA, Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub REST ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

interface RawRepo {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
}

interface RawUser {
  created_at: string;
}

export async function fetchUser(user: string, token?: string): Promise<RawUser> {
  return rest<RawUser>(`/users/${user}`, token);
}

export async function fetchRepos(user: string, token?: string): Promise<RepoInfo[]> {
  const out: RepoInfo[] = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await rest<RawRepo[]>(`/users/${user}/repos?per_page=100&page=${page}&sort=updated`, token);
    out.push(...batch.map(toRepoInfo));
    if (batch.length < 100) break;
  }
  return out;
}

function toRepoInfo(r: RawRepo): RepoInfo {
  return {
    fullName: r.full_name,
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    fork: r.fork,
    archived: r.archived,
  };
}

// Note: GitHub moved the calendar off `user.contributionCalendar` in 2026;
// it now lives at `user.contributionsCollection.contributionCalendar`, and
// weeks contain `contributionDays` (was `weekdayContributions`).
const CALENDAR_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
  }
}`;

interface GqlCalendar {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: { contributionCount: number; date: string }[] }[];
        };
      };
    };
  };
}

export async function fetchCalendar(user: string, token: string): Promise<Calendar> {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { "User-Agent": UA, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login: user } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as GqlCalendar & { errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`GitHub GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return shapeCalendar(cal.weeks, cal.totalContributions);
}

export function fetchCalendarViaGh(user: string): Calendar {
  const out = execFileSync(
    "gh",
    ["api", "graphql", "-f", `query=${CALENDAR_QUERY}`, "-f", `login=${user}`],
    { encoding: "utf8", timeout: 60000 }
  );
  const json = JSON.parse(out) as GqlCalendar;
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return shapeCalendar(cal.weeks, cal.totalContributions);
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shapeCalendar(
  weeks: { contributionDays: { contributionCount: number; date: string }[] }[],
  totalCount: number
): Calendar {
  const days: DayCell[] = [];
  const countsByDate = new Map<string, number>();
  weeks.forEach((w) => {
    for (const wc of w.contributionDays) {
      countsByDate.set(wc.date, wc.contributionCount);
    }
  });

  // The API returns a rolling ~53-week window. Render exactly that range,
  // Monday-aligned, so the grid matches GitHub's own contribution chart.
  const dates = [...countsByDate.keys()].map(parseDate);
  if (dates.length === 0) throw new Error("contribution calendar returned no days");
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const firstMonday = new Date(minDate);
  firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));

  for (let i = 0; firstMonday.getTime() + i * 86400000 <= maxDate.getTime(); i++) {
    const d = new Date(firstMonday.getTime() + i * 86400000);
    days.push({ date: fmt(d), count: countsByDate.get(fmt(d)) ?? 0, dow: i % 7, week: Math.floor(i / 7) });
  }

  // month labels: label each week column by its Wednesday (middle day), so the
  // first column of a July window reads "Jul" like GitHub does. One label per
  // month, emitted on the week where the month changes.
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekMonth = new Map<number, number>();
  for (const d of days) {
    if (d.dow === 2 && !weekMonth.has(d.week)) weekMonth.set(d.week, Number(d.date.slice(5, 7)));
  }
  const months: MonthLabel[] = [];
  let lastMonth = -1;
  for (const [week, m] of weekMonth) {
    if (m !== lastMonth) {
      months.push({ label: MONTHS[m - 1], week });
      lastMonth = m;
    }
  }

  const counts = days.map((d) => d.count);
  const max = Math.max(1, ...counts);

  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  let current = 0;
  const today = fmt(new Date());
  let idx = days.findIndex((d) => d.date === today);
  if (idx === -1 || days[idx].count === 0) idx -= 1;
  for (let i = idx; i >= 0 && days[i].count > 0; i--) current += 1;

  return { total: totalCount, max, longest, current, days, months };
}

export function selectPinned(config: { pinned: string[] | "auto"; pinnedCount: number }, repos: RepoInfo[]): RepoInfo[] {
  const own = repos.filter((r) => !r.fork && !r.archived);
  if (config.pinned !== "auto") {
    const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
    return config.pinned.map((n) => byName.get(n.toLowerCase())).filter((r): r is RepoInfo => Boolean(r));
  }
  return [...own].sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name)).slice(0, config.pinnedCount);
}

export async function collect(user: string, token: string | undefined): Promise<ProfileData> {
  const [me, repos] = await Promise.all([fetchUser(user, token), fetchRepos(user, token)]);
  let calendar: Calendar;
  if (token) calendar = await fetchCalendar(user, token);
  else if (hasGh()) calendar = fetchCalendarViaGh(user);
  else throw new Error("no GitHub token: set GITHUB_TOKEN (or install + auth `gh`) for a real build");

  const years = Math.max(1, Math.round((Date.now() - new Date(me.created_at).getTime()) / (365.25 * 86400000)));
  const own = repos.filter((r) => !r.fork);
  return {
    calendar,
    repos,
    pinnedRepos: [],
    accountCreated: me.created_at,
    years,
    starsEarned: own.reduce((a, r) => a + r.stars, 0),
    publicRepos: repos.length,
  };
}
