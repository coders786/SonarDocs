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

/**
 * Ensure the SQLite schema exists (used on serverless hosts like Vercel
 * where the database file starts empty in /tmp). On the sandbox the schema
 * is already pushed by `bun run db:push`, so this is a fast no-op probe.
 */
export function ensureDb(): Promise<void> {
  if (!globalForPrisma.__sonarDbReady) {
    globalForPrisma.__sonarDbReady = (async () => {
      try {
        await db.researchArticle.findFirst();
        return;
      } catch {
        // schema missing → bootstrap it from the DDL dump
        try {
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
        } catch (err) {
          console.error("[db] bootstrap failed:", err);
        }
      }
    })();
  }
  return globalForPrisma.__sonarDbReady;
}
