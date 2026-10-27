import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { cropBand } from "@/lib/imagetools";
import { buildReadSystemPrompt, buildReadUserPrompt, type SubjectInfo } from "@/lib/ocr-prompts";
import { getArticle } from "@/lib/subjects";
import { AiConfigError, visionJson } from "@/lib/zai";
import { byokFromRequest } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ocr/retry-line  { lineId }
 *
 * Re-reads a single band with a deeper zoom (scale 5, wider padding) and a
 * fresh model pass. The previous reading is kept as an alternative.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const lineId = String(body.lineId || "");
    if (!lineId) return NextResponse.json({ error: "lineId is required" }, { status: 400 });

    const line = await db.transcriptionLine.findUnique({ where: { id: lineId }, include: { page: { include: { session: true } } } });
    if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404 });
    const byok = byokFromRequest(req);

    const article = await getArticle(line.page.session.subject);
    if (!article) return NextResponse.json({ error: "Research article missing" }, { status: 404 });

    const subject: SubjectInfo = {
      subject: article.subject,
      language: article.language,
      nativeLabel: article.nativeLabel,
      direction: article.direction,
    };

    const bbox = line.bbox ? JSON.parse(line.bbox) : null;
    if (!bbox) return NextResponse.json({ error: "Line has no crop box — run layout analysis again." }, { status: 400 });

    const crop = await cropBand(line.page.imageBase64, bbox, line.order, { scale: 5, pad: 20 });

    const system = buildReadSystemPrompt(article.content, subject);
    const user = buildReadUserPrompt(subject, [{ index: line.order, preliminary: "", kind: line.kind }], `Previous reading of this same band was: « ${line.text} ». Re-read it independently from the deeper zoom and correct it if the strokes support a different reading.`);

    const mime = crop.imageDataUrl.slice(5, crop.imageDataUrl.indexOf(";"));
    const parsed = await visionJson<{ readings?: Array<{ text?: string; latex?: string; confidence?: string; notes?: string; alternatives?: Array<{ text: string; note?: string }> }> }>(
      system,
      user,
      [{ mime, base64: crop.imageDataUrl.split(",")[1] || "" }],
      { subject: subject.subject, direction: subject.direction, apiKey: byok, retries: 1, timeoutMs: 40_000, deadlineMs: 45_000 },
    );
    const r = parsed.readings?.[0] || {};

    const oldAlternatives = line.alternatives ? JSON.parse(line.alternatives) : [];
    const newAlternatives = [
      ...oldAlternatives,
      ...(line.text && line.text !== (r.text || "").trim() ? [{ text: line.text, note: "previous reading" }] : []),
      ...(Array.isArray(r.alternatives) ? r.alternatives.slice(0, 3).map((a: { text: string; note?: string }) => ({ text: String(a.text || ""), note: String(a.note || "") })) : []),
    ].slice(0, 5);

    const validConf = new Set(["high", "medium", "low", "illegible"]);
    const updated = await db.transcriptionLine.update({
      where: { id: lineId },
      data: {
        text: String(r.text ?? line.text).trim(),
        latex: subject.subject === "mathematics" ? String(r.latex || line.latex || "").trim() : line.latex,
        confidence: validConf.has(r.confidence || "") ? (r.confidence as string) : line.confidence,
        alternatives: JSON.stringify(newAlternatives),
        notes: String(r.notes || line.notes || "").slice(0, 600),
        cropBase64: crop.thumbDataUrl,
        status: "pending",
        verifiedText: null,
      },
    });

    return NextResponse.json({
      line: {
        id: updated.id,
        index: updated.order,
        kind: updated.kind,
        text: updated.text,
        latex: updated.latex,
        confidence: updated.confidence,
        alternatives: newAlternatives,
        notes: updated.notes,
        cropBase64: updated.cropBase64,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error("[api/ocr/retry-line] failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Retry failed" }, { status: 500 });
  }
}
