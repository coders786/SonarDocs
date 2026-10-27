import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Serverless SQLite handling.
 *
 * Prisma reads DATABASE_URL when the client is instantiated. Sandboxes and
 * dev machines point it at ./db/custom.db; on serverless hosts (Vercel) the
 * filesystem is read-only except /tmp, so we redirect it there and
 * auto-bootstrap the schema from db/bootstrap.sql (ensureDb below).
 */
function resolveDbUrl(): void {
  const dir = process.env.VERCEL ? "/tmp/sonar" : path.join(process.cwd(), "db");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  const dbPath = path.join(dir, "custom.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
}
resolveDbUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __sonarDbReady: Promise<void> | undefined;
};

let prismaInstance: PrismaClient;
try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
} catch (err) {
  console.warn("[AI Studio] Database not connected — using mock proxy fallback:", err);
  const noOp: any = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
    upsert: async (d: any) => d?.create ?? {},
    count: async () => 0,
  };
  prismaInstance = new Proxy({} as PrismaClient, {
    get: (_, prop) => {
      if (prop === "$executeRawUnsafe") return async () => 0;
      return noOp;
    },
  });
}

export const db = prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

const TABLES = [
  "ResearchArticle",
  "OcrSession",
  "OcrPage",
  "TranscriptionLine",
  "DocumentProject",
] as const;

/**
 * Probe EVERY model (with its newest columns selected) so both missing tables
 * and column drift (a stale db/bootstrap.sql) are detected, not just an empty
 * database. `sandboxCrops` is probed explicitly: it was the column a stale
 * bootstrap once missed on Vercel.
 */
async function probeSchema(): Promise<void> {
  await Promise.all([
    db.researchArticle.findFirst(),
    db.ocrSession.findFirst(),
    db.ocrPage.findFirst({ select: { sandboxCrops: true } }),
    db.transcriptionLine.findFirst(),
    db.documentProject.findFirst(),
  ]);
}

/** Execute db/bootstrap.sql statement by statement, ignoring per-statement
 *  failures (e.g. “already exists”) so the run is idempotent. */
async function runBootstrapDdl(): Promise<void> {
  const sqlPath = path.join(process.cwd(), "db", "bootstrap.sql");
  const ddl = fs.readFileSync(sqlPath, "utf-8");
  const statements = ddl
    .split(/;\s*\n/)
    .map((s) => s.replace(/^--[^\n]*\n/gm, "").trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) {
    try {
      await db.$executeRawUnsafe(stmt);
    } catch {
      /* ignore individual failures (e.g. already exists) */
    }
  }
}

/**
 * Ensure the SQLite schema exists (used on serverless hosts like Vercel
 * where the database file starts empty in /tmp). On the sandbox the schema
 * is already pushed by `bun run db:push`, so this is a fast no-op probe.
 *
 * Drift handling: if the probe fails on a host where the database is
 * EPHEMERAL (Vercel /tmp — every lambda cold-start can rebuild it), the old
 * tables are dropped and the schema re-bootstrapped from the DDL dump. On
 * persistent hosts (dev sandbox) a failed probe only attempts an additive
 * bootstrap and logs a hint to run `bun run db:push` — never drops data.
 */
export function ensureDb(): Promise<void> {
  if (!globalForPrisma.__sonarDbReady) {
    globalForPrisma.__sonarDbReady = (async () => {
      try {
        await probeSchema();
        return;
      } catch (probeErr) {
        const reason = probeErr instanceof Error ? probeErr.message : String(probeErr);
        console.warn("[db] schema probe failed — bootstrapping:", reason.slice(0, 160));
        try {
          if (process.env.VERCEL) {
            // /tmp is ephemeral on serverless: a drifted DB is worthless, drop + rebuild.
            for (const t of TABLES) {
              try {
                await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}"`);
              } catch {
                /* ignore */
              }
            }
          }
          await runBootstrapDdl();
        } catch (err) {
          console.error("[db] bootstrap failed:", err);
        }
      }
    })();
  }
  return globalForPrisma.__sonarDbReady;
}
