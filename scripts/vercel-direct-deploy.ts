/**
 * vercel-direct-deploy.ts — Deploy this project to Vercel via the REST API
 * (direct upload), bypassing the `vercel` CLI's user lookup. Needed for
 * project-scoped deploy tokens (they can deploy but the CLI chokes on
 * "User not found").
 *
 * Usage:
 *   VERCEL_TOKEN=vcp_... bun scripts/vercel-direct-deploy.ts
 *   # optional:
 *   VERCEL_TEAM=team_xxx        # team id (auto-detected from an existing project if omitted)
 *   VERCEL_PROJECT=sonar-docs   # project name (default: sonar-docs)
 *   VERCEL_TARGET=production    # production | preview
 *
 * The token must have deployment access to the project. If the project does
 * not exist, create it once (UI or API with a token that has create rights).
 */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT || "sonar-docs";
const TARGET = process.env.VERCEL_TARGET === "preview" ? "preview" : "production";
if (!TOKEN) {
  console.error("VERCEL_TOKEN is required");
  process.exit(1);
}

const API = "https://api.vercel.com";

async function api(
  method: string,
  urlPath: string,
  body?: unknown,
  opts: { raw?: boolean; headers?: Record<string, string> } = {},
): Promise<any> {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body !== undefined && !opts.raw ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
    body:
      body === undefined
        ? undefined
        : opts.raw
          ? new Uint8Array(body as Buffer)
          : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* keep raw */
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} → ${res.status}: ${typeof data === "string" ? text.slice(0, 400) : JSON.stringify(data).slice(0, 400)}`);
  }
  return data;
}

/** Collect files to upload: project source respecting .vercelignore + basics. */
function collectFiles(): Array<{ file: string; abs: string }> {
  const ignore = new Set(
    fs
      .readFileSync(".vercelignore", "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  const alwaysIgnore = new Set([
    ".git",
    "node_modules",
    ".next",
    ".vercel",
    ".sonar-tmp",
    "db/custom.db",
    "dev.log",
    "server.log",
  ]);
  const out: Array<{ file: string; abs: string }> = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (alwaysIgnore.has(rel) || ignore.has(rel) || ignore.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
      } else if (entry.isFile()) {
        out.push({ file: rel, abs });
      }
    }
  };
  walk(".", "");
  return out;
}

async function main() {
  // 1. find team id by looking at an existing project this token can see
  let team = process.env.VERCEL_TEAM;
  if (!team) {
    try {
      const projects = await api("GET", "/v9/projects?limit=100");
      const any = projects.projects?.[0];
      team = any?.accountId;
      if (!team) throw new Error("no project visible to derive team id");
      console.log(`detected team: ${team}`);
    } catch (err) {
      throw new Error(`Could not auto-detect VERCEL_TEAM: ${(err as Error).message}`);
    }
  }
  const q = `teamId=${team}`;

  // 2. verify the target project exists
  const proj = await api("GET", `/v9/projects/${PROJECT}?${q}`).catch((err) => {
    throw new Error(
      `Project '${PROJECT}' not found or not accessible (create it in the Vercel dashboard first, or scope your token to it): ${err.message}`,
    );
  });
  console.log(`project: ${proj.name} (${proj.id})`);

  // 3. collect + upload files
  const files = collectFiles();
  console.log(`uploading ${files.length} files…`);
  const manifest: Array<{ file: string; sha: string; size: number }> = [];
  for (const f of files) {
    const content = fs.readFileSync(f.abs);
    const sha = createHash("sha1").update(content).digest("hex");
    manifest.push({ file: f.file, sha, size: content.length });
  }
  // upload in batches of parallel requests (with digest headers, like the CLI)
  const BATCH = 8;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    await Promise.all(
      batch.map((f) => {
        const content = fs.readFileSync(f.abs);
        const sha = createHash("sha1").update(content).digest("hex");
        return api("POST", `/v2/files?${q}`, content, {
          raw: true,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": String(content.length),
            "x-now-digest": sha,
            "x-now-size": String(content.length),
          },
        }).catch((err) => {
          if (!/already|same/i.test(err.message)) throw err;
        });
      }),
    );
    process.stdout.write(`  uploaded ${Math.min(i + BATCH, files.length)}/${files.length}\r`);
  }
  console.log("");

  // 4. create deployment (omit `target` entirely for preview deployments)
  const deployment = await api("POST", `/v13/deployments?${q}&skipAutoDetectionConfirmation=1`, {
    name: PROJECT,
    project: PROJECT,
    ...(TARGET === "production" ? { target: "production" } : {}),
    files: manifest,
    projectSettings: {
      framework: "nextjs",
      installCommand: "bun install",
      buildCommand: "next build",
      devCommand: "next dev",
    },
    meta: { source: "sonar-direct-deploy" },
  });
  console.log(`deployment created: ${deployment.id}`);
  console.log(`url: https://${deployment.url}`);
  console.log("waiting for build…");

  // 5. poll until ready
  const t0 = Date.now();
  while (Date.now() - t0 < 10 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 8000));
    const status = await api("GET", `/v13/deployments/${deployment.id}?${q}`);
    if (status.readyState === "READY") {
      console.log(`\n✅ READY in ${Math.round((Date.now() - t0) / 1000)}s → https://${status.url}`);
      const alias = status.alias?.find((a: any) => a.status === "ACTIVE") || status.alias?.[0];
      if (alias) console.log(`alias: https://${alias.alias ?? alias}`);
      return;
    }
    if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
      console.error(`\n❌ build ${status.readyState}`);
      try {
        const logs = await api("GET", `/v2/deployments/${deployment.id}/events?${q}&limit=50`);
        for (const ev of logs) {
          const line = (ev.text || ev.payload?.text || "").replace(/\u001b\[[0-9;]*m/g, "");
          if (line.trim()) console.error(`  | ${line.slice(0, 200)}`);
        }
      } catch {
        console.error("logs: " + `https://vercel.com/dashboard (deployment ${deployment.id})`);
      }
      process.exit(1);
    }
    process.stdout.write(".");
  }
  console.error("\n⏱ timed out waiting (check the Vercel dashboard)");
  process.exit(1);
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
