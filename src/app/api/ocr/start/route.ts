import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { analyzePage } from "@/lib/imagetools";
import { getArticle } from "@/lib/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ocr/start
 * body: { subject, imageBase64 (data URL), sessionId?, index? }
 *
 * Creates (or extends) an OCR session for the subject, runs the python
 * page analysis (deskew + band candidates + overlay) and stores the page.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const subject = String(body.subject || "").trim();
    const imageBase64 = String(body.imageBase64 || "");
    if (!subject || !imageBase64.startsWith("data:image/")) {
      return NextResponse.json({ error: "subject and imageBase64 (data URL) are required" }, { status: 400 });
    }
    if (imageBase64.length > 14 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large — please use a smaller photo (max ~10MB)." }, { status: 413 });
    }

    const article = await getArticle(subject);
    if (!article) {
      return NextResponse.json({ error: `No research article for subject '${subject}'.` }, { status: 404 });
    }

    // python / sharp analysis
    const analysis = await analyzePage(imageBase64);

    // session
    let sessionId = body.sessionId ? String(body.sessionId) : null;
    if (sessionId) {
      const existing = await db.ocrSession.findUnique({ where: { id: sessionId } });
      if (!existing || existing.subject !== subject) sessionId = null;
    }
    if (!sessionId) {
      const session = await db.ocrSession.create({ data: { subject } });
      sessionId = session.id;
    }

    const index = Number.isFinite(body.index) ? Number(body.index) : 0;
    const bands = JSON.stringify({
      engine: analysis.engine,
      candidates: analysis.bands,
      decisions: null,
      deskewAngle: analysis.deskewAngle,
    });

    const page = await db.ocrPage.create({
      data: {
        sessionId,
        index,
        status: "processing",
        imageBase64: analysis.pageDataUrl,
        overlayBase64: analysis.overlayDataUrl,
        width: analysis.width,
        height: analysis.height,
        bands,
      },
    });

    return NextResponse.json({
      sessionId,
      pageId: page.id,
      index,
      engine: analysis.engine,
      width: analysis.width,
      height: analysis.height,
      deskewAngle: analysis.deskewAngle,
      candidateCount: analysis.bands.length,
      articleWords: article.content.split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    console.error("[api/ocr/start] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start OCR analysis" },
      { status: 500 },
    );
  }
}
