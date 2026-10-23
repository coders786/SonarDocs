import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/session?id=...  → session with pages, lines and documents
 * GET /api/session         → recent sessions
 */
export async function GET(req: NextRequest) {
  try {
    await ensureDb();
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const session = await db.ocrSession.findUnique({
        where: { id },
        include: {
          pages: {
            orderBy: { index: "asc" },
            include: { lines: { orderBy: { order: "asc" } } },
          },
          documents: { orderBy: { updatedAt: "desc" } },
        },
      });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      return NextResponse.json({ session });
    }
    const sessions = await db.ocrSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: { pages: { select: { id: true, status: true, index: true } }, documents: { select: { id: true, title: true, updatedAt: true } } },
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[api/session] failed:", err);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
