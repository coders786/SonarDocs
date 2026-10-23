import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { cropBand } from "@/lib/imagetools";
import { buildReadSystemPrompt, buildReadUserPrompt, type SubjectInfo } from "@/lib/ocr-prompts";
import { getArticle } from "@/lib/subjects";
import { visionJson } from "@/lib/zai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Reading = {
  index: number;
  kind: string;
  text: string;
  latex?: string;
  confidence: string;
  alternatives?: Array<{ text: string; note?: string }>;
  notes?: string;
};

/**
 * POST /api/ocr/read  { pageId, indices: number[] (max 4) }
 *
 * For each requested band index: python crops + enhances + upscales the band
 * from the page, then the VLM reads the crops with the subject's FULL
 * research article in its system prompt. Results are stored as
 * TranscriptionLines.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const pageId = String(body.pageId || "");
    const indices: number[] = Array.isArray(body.indices)
      ? body.indices.map((i: unknown) => Number(i)).filter((n) => Number.isFinite(n))
      : [];
    if (!pageId || indices.length === 0) {
      return NextResponse.json({ error: "pageId and indices are required" }, { status: 400 });
    }
    if (indices.length > 4) {
      return NextResponse.json({ error: "Read at most 4 bands per request." }, { status: 400 });
    }

    const page = await db.ocrPage.findUnique({ where: { id: pageId }, include: { session: true } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    const bandsData = page.bands ? JSON.parse(page.bands) : null;
    const decisions: Array<{
      index: number;
      box: { x: number; y: number; w: number; h: number };
      kind: string;
      preliminary: string;
      needsZoom: boolean;
      reason: string;
    }> = bandsData?.decisions || [];
    if (decisions.length === 0) {
      return NextResponse.json({ error: "Run layout analysis first." }, { status: 409 });
    }

    const article = await getArticle(page.session.subject);
    if (!article) return NextResponse.json({ error: "Research article missing for subject" }, { status: 404 });

    const subject: SubjectInfo = {
      subject: article.subject,
      language: article.language,
      nativeLabel: article.nativeLabel,
      direction: article.direction,
    };

    const batch = indices
      .map((i) => decisions.find((d) => d.index === i))
      .filter((d): d is NonNullable<typeof d> => !!d);
    if (batch.length === 0) {
      return NextResponse.json({ error: "None of the given band indices exist." }, { status: 400 });
    }

    // python (or sharp) crop + focus for each band; when a crop contains
    // (almost) no ink, the box likely misses the writing — expand it
    // vertically and try once more before giving up.
    const pageH = page.height || 1200;
    const crops = await Promise.all(
      batch.map(async (b) => {
        const scale = b.needsZoom ? 4 : 3;
        let crop = await cropBand(page.imageBase64, b.box, b.index, { scale, pad: 14 });
        if (crop.inkRatio >= 0 && crop.inkRatio < 0.0015) {
          const growY = Math.round(b.box.h * 0.6);
          const expanded = {
            x: b.box.x,
            y: Math.max(0, b.box.y - growY),
            w: b.box.w,
            h: Math.min(pageH - Math.max(0, b.box.y - growY), b.box.h + growY * 2),
          };
          const retry = await cropBand(page.imageBase64, expanded, b.index, { scale, pad: 16 });
          if (retry.inkRatio > crop.inkRatio) {
            crop = retry;
            b.box = expanded; // remember the corrected geometry
          }
        }
        return crop;
      }),
    );

    // previously-read lines for continuity context
    const priorLines = await db.transcriptionLine.findMany({
      where: { pageId, order: { lt: Math.min(...batch.map((b) => b.index)) } },
      orderBy: { order: "desc" },
      take: 2,
    });
    const context = priorLines
      .reverse()
      .map((l) => `« ${l.verifiedText || l.text} »`)
      .join("\n");

    const system = buildReadSystemPrompt(article.content, subject);
    const user = buildReadUserPrompt(
      subject,
      batch.map((b) => ({ index: b.index, preliminary: b.preliminary, kind: b.kind })),
      context,
    );

    const images = crops.map((c) => {
      const mime = c.imageDataUrl.slice(5, c.imageDataUrl.indexOf(";"));
      return { mime, base64: c.imageDataUrl.split(",")[1] || "" };
    });

    let readings: Reading[] = [];
    try {
      const parsed = await visionJson<{ readings?: Reading[] }>(system, user, images);
      if (Array.isArray(parsed.readings)) readings = parsed.readings;
    } catch (err) {
      console.error("[api/ocr/read] model failed:", err);
      throw new Error("The OCR model failed to respond for these bands. Please retry them.");
    }

    const validConf = new Set(["high", "medium", "low", "illegible"]);
    const outLines: Array<{
      id: string;
      index: number;
      kind: string;
      text: string;
      latex: string | null;
      confidence: string;
      alternatives: Array<{ text: string; note: string }>;
      notes: string | null;
      cropBase64: string | null;
      status: string;
    }> = [];
    for (let i = 0; i < batch.length; i++) {
      const band = batch[i];
      const r = readings[i] || readings.find((x) => Number(x.index) === band.index);
      const text = String(r?.text ?? "").trim();
      const kind = ["text", "heading", "list", "math", "ignore"].includes(r?.kind || "")
        ? (r?.kind as string)
        : band.kind;
      const confidence = validConf.has(r?.confidence || "") ? (r?.confidence as string) : "medium";
      const latex = subject.subject === "mathematics" ? String(r?.latex || "").trim() : null;
      const alternatives = Array.isArray(r?.alternatives)
        ? r.alternatives.slice(0, 4).map((a) => ({ text: String(a.text || ""), note: String(a.note || "") }))
        : [];
      const notes = String(r?.notes || "").slice(0, 600);
      const crop = crops[i];

      const line = await db.transcriptionLine.upsert({
        where: { pageId_order: { pageId, order: band.index } },
        create: {
          pageId,
          order: band.index,
          kind,
          text,
          latex,
          confidence,
          alternatives: JSON.stringify(alternatives),
          notes,
          bbox: JSON.stringify(band.box),
          cropBase64: crop.thumbDataUrl,
        },
        update: {
          kind,
          text,
          latex,
          confidence,
          alternatives: JSON.stringify(alternatives),
          notes,
          bbox: JSON.stringify(band.box),
          cropBase64: crop.thumbDataUrl,
        },
      });
      outLines.push({
        id: line.id,
        index: band.index,
        kind: line.kind,
        text: line.text,
        latex: line.latex,
        confidence: line.confidence,
        alternatives,
        notes: line.notes,
        cropBase64: line.cropBase64,
        status: line.status,
      });
    }

    await db.ocrPage.update({ where: { id: pageId }, data: { status: "transcribed" } });

    return NextResponse.json({ lines: outLines });
  } catch (err) {
    console.error("[api/ocr/read] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Focused OCR failed" },
      { status: 500 },
    );
  }
}
