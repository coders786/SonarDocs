import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __sonarDbReady: Promise<void> | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

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
