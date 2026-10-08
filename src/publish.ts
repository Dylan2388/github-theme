import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getToken } from "./github";

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "profile", "public");

function sh(cmd: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): string {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", env: env ?? process.env });
}

async function ensureRepo(user: string, repo: string, token: string): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${user}/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "github-theme", Accept: "application/vnd.github+json" },
  });
  if (res.ok) return;
  if (res.status !== 404) throw new Error(`repo lookup failed: ${res.status}`);
  const create = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "github-theme", Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ name: repo, auto_init: false, private: false, description: `${repo} profile` }),
  });
  if (!create.ok && create.status !== 422) {
    const body = (await create.text()).slice(0, 200);
    if (create.status === 403) {
      throw new Error(
        `repo create blocked (403): this token cannot create user repos (fine-grained PATs never can). ` +
          `Either (a) create the empty public repo ${user}/${repo} at https://github.com/${user}/${repo}/create and re-run, ` +
          `or (b) use a classic PAT with the 'repo' scope. Body: ${body}`
      );
    }
    throw new Error(`repo create failed: ${create.status} ${body}`);
  }
  console.log(`[publish] created ${user}/${repo}`);
}

async function main(): Promise<void> {
  const token = getToken() ?? "";
  if (!token) throw new Error("set GITHUB_TOKEN (needs `repo` scope) to publish");

  // 1. build with real data into profile/public
  sh("node", [path.join(ROOT, "node_modules", ".bin", "tsx"), path.join(ROOT, "src", "build.ts")], ROOT);

  // 2. push README.md + assets to <user>/<user>
  const user = process.env.GITHUB_USER || "Dylan2388";
  const repo = user;
  await ensureRepo(user, repo, token);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "profile-"));
  const remote = `https://x-access-token:${token}@github.com/${user}/${repo}.git`;
  try {
    sh("git", ["clone", "--depth", "1", remote, tmp]);
  } catch {
    sh("git", ["init"], tmp);
    sh("git", ["remote", "add", "origin", remote], tmp);
    sh("git", ["checkout", "-b", "main"], tmp);
  }

  fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });
  fs.copyFileSync(path.join(PUBLIC, "README.md"), path.join(tmp, "README.md"));
  for (const f of fs.readdirSync(path.join(PUBLIC, "assets"))) {
    fs.copyFileSync(path.join(PUBLIC, "assets", f), path.join(tmp, "assets", f));
  }

  sh("git", ["config", "user.name", "github-theme"], tmp);
  sh("git", ["config", "user.email", `${user}@users.noreply.github.com`], tmp);
  sh("git", ["add", "-A"], tmp);
  const status = sh("git", ["status", "--porcelain"], tmp).trim();
  if (!status) {
    console.log("[publish] no changes");
    return;
  }
  sh("git", ["commit", "-m", `chore(profile): regenerate ${new Date().toISOString().slice(0, 10)}`], tmp);
  sh("git", ["push", "origin", "HEAD:main"], tmp);
  console.log(`[publish] pushed to github.com/${user}/${repo}`);
}

void main().catch((e: unknown) => {
  console.error(`[publish] FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
