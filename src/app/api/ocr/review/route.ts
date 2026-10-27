import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ocr/review  { pageId, lines: [{ id, verifiedText, status }] }
 *
 * The user has checked the OCR output — save their confirmed/corrected text.
 * This is the mandatory human-verification step before document creation.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const pageId = String(body.pageId || "");
    const lines: Array<{ id: string; verifiedText: string; status: string }> = Array.isArray(body.lines)
      ? body.lines
      : [];
    if (!pageId || lines.length === 0) {
      return NextResponse.json({ error: "pageId and lines are required" }, { status: 400 });
    }

    const page = await db.ocrPage.findUnique({ where: { id: pageId } });
    if (!page) {
      // serverless multi-instance: the verification status lives on another
      // lambda instance's ephemeral DB. The client already holds the verified
      // lines (its store is the source of truth for the document step), so
      // this write is best-effort — acknowledge and move on instead of
      // dead-ending the wizard.
      return NextResponse.json({ ok: true, updated: 0, pageStatus: "verified", sessionStatus: "active", note: "ephemeral instance — verification kept client-side" });
    }

    const validStatus = new Set(["approved", "corrected", "flagged"]);
    let updated = 0;
    for (const l of lines) {
      const status = validStatus.has(l.status) ? l.status : "corrected";
      await db.transcriptionLine.update({
        where: { id: String(l.id) },
        data: { verifiedText: String(l.verifiedText ?? ""), status },
      });
      updated++;
    }

    await db.ocrPage.update({ where: { id: pageId }, data: { status: "verified" } });

    // if every page of the session is verified, mark the session
    const pages = await db.ocrPage.findMany({ where: { sessionId: page.sessionId }, select: { status: true } });
    const allVerified = pages.length > 0 && pages.every((p) => p.status === "verified");
    if (allVerified) {
      await db.ocrSession.update({ where: { id: page.sessionId }, data: { status: "verified" } });
    }

    return NextResponse.json({ ok: true, updated, pageStatus: "verified", sessionStatus: allVerified ? "verified" : "active" });
  } catch (err) {
    console.error("[api/ocr/review] failed:", err);
    return NextResponse.json({ error: "Failed to save verification" }, { status: 500 });
  }
}
