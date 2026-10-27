import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { cropBand, sandboxCropVariant } from "@/lib/imagetools";
import { buildReadSystemPrompt, buildReadUserPrompt, type SubjectInfo } from "@/lib/ocr-prompts";
import { getArticle } from "@/lib/subjects";
import { AiConfigError, visionJson, LONG_HOST } from "@/lib/zai";
import { byokFromRequest } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Reading = {
  index: number;
  kind: string;
  text: string;
  latex?: string;
  confidence: string;
  alternatives?: Array<{ text: string; note?: string }>;
  notes?: string;
};

type CropVariant = Awaited<ReturnType<typeof cropBand>>;

/**
 * POST /api/ocr/read  { pageId, indices: number[] (max 4) }
 *
 * For each requested band index: python crops + enhances + upscales the band
 * from the page, then the VLM reads the crop with the subject's FULL
 * research article in its system prompt. Results are stored as
 * TranscriptionLines.
 *
 * ENSEMBLE PROTOCOL (RTL subjects): current vision models read Arabic-script
 * cursive (esp. Nastaliq) unreliably — controlled tests show they fabricate
 * fluent text with self-reported "high" confidence even on clean, large
 * renders. Countermeasures, applied only to RTL subjects (urdu, sindhi,
 * custom RTL):
 *   1. every band is read 3× from independent zoom variants of the crop;
 *   2. readings that agree across samples are accepted, but confidence is
 *      capped at "medium" (self-reported "high" is provably unreliable);
 *   3. when samples disagree, confidence is forced to "low" and the rival
 *      readings are surfaced in `alternatives` so the Verify step shows the
 *      human editor every competing hypothesis.
 * LTR subjects (Latin script, math) read reliably and keep the single-sample
 * path.
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

    const byok = byokFromRequest(req);

    // crops produced by the Gemini code-execution sandbox (if this page was
    // laid out with engine A) — used as the primary read sample per band
    const sandboxMap = new Map<number, string>();
    if (page.sandboxCrops) {
      try {
        for (const c of JSON.parse(page.sandboxCrops) as Array<{ order: number; dataUrl: string }>) {
          if (Number.isFinite(c?.order) && typeof c?.dataUrl === "string" && c.dataUrl.startsWith("data:image/")) {
            sandboxMap.set(Number(c.order), c.dataUrl);
          }
        }
      } catch {
        /* malformed — ignore, fall back to local crops */
      }
    }

    const subject: SubjectInfo = {
      subject: article.subject,
      language: article.language,
      nativeLabel: article.nativeLabel,
      direction: article.direction,
    };
    const isRtl = subject.direction === "rtl";

    const system = buildReadSystemPrompt(article.content, subject);
    const pageH = page.height || 1200;
    const BLANK_INK = 0.0015;

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

    // Per-band processing (sequential so multi-band requests don't flood the
    // vision endpoint with sample×band parallel calls).
    for (const index of indices) {
      const band = decisions.find((d) => d.index === index);
      if (!band) continue;

      // ---- crop variants -------------------------------------------------
      // python (or sharp) crop + focus; when a crop contains (almost) no ink
      // the box likely misses the writing — expand vertically and retry once.
      // Blank crops are NEVER sent to the model (blank crops invite
      // hallucination); they are stored as ignored placeholder lines.
      const baseScale = band.needsZoom ? 4 : 3;
      const variantDefs = isRtl
        ? [
            { scale: baseScale, pad: 14 },
            { scale: Math.min(6, baseScale + 1), pad: 24 },
            { scale: baseScale, pad: 14, growY: Math.max(6, Math.round(band.box.h * 0.35)) },
          ]
        : [{ scale: baseScale, pad: 14 }];

      async function cropWith(def: { scale: number; pad: number; growY?: number }): Promise<CropVariant> {
        const box = def.growY
          ? {
              x: band.box.x,
              y: Math.max(0, band.box.y - def.growY),
              w: band.box.w,
              h: Math.min(pageH - Math.max(0, band.box.y - def.growY), band.box.h + def.growY * 2),
            }
          : band.box;
        let crop = await cropBand(page.imageBase64, box, band.index, { scale: def.scale, pad: def.pad });
        if (crop.inkRatio >= 0 && crop.inkRatio < BLANK_INK) {
          const growY = Math.round(band.box.h * 0.6);
          const expanded = {
            x: band.box.x,
            y: Math.max(0, band.box.y - growY),
            w: band.box.w,
            h: Math.min(pageH - Math.max(0, band.box.y - growY), band.box.h + growY * 2),
          };
          const retry = await cropBand(page.imageBase64, expanded, band.index, { scale: def.scale, pad: def.pad + 2 });
          if (retry.inkRatio > crop.inkRatio) crop = retry;
        }
        return crop;
      }

      const sandboxUrl = sandboxMap.get(band.index);
      let crops: CropVariant[];
      if (sandboxUrl) {
        // primary sample = the model's own sandbox crop (already deskewed,
        // enhanced, upscaled by its code); remaining samples stay local
        // independent zooms so the ensemble keeps its independence
        crops = [await sandboxCropVariant(sandboxUrl)];
        for (const d of variantDefs.slice(1)) crops.push(await cropWith(d));
      } else {
        crops = await Promise.all(variantDefs.map((d) => cropWith(d)));
      }
      const primary = crops[0];

      // Blank primary crop → ignored placeholder, no model call at all.
      if (primary.inkRatio >= 0 && primary.inkRatio < BLANK_INK) {
        const line = await db.transcriptionLine.upsert({
          where: { pageId_order: { pageId, order: band.index } },
          create: {
            pageId,
            order: band.index,
            kind: "ignore",
            text: "",
            latex: null,
            confidence: "illegible",
            alternatives: JSON.stringify([]),
            notes: "python found no ink in this region — skipped OCR",
            bbox: JSON.stringify(band.box),
            cropBase64: primary.thumbDataUrl,
          },
          update: {
            kind: "ignore",
            text: "",
            latex: null,
            confidence: "illegible",
            alternatives: JSON.stringify([]),
            notes: "python found no ink in this region — skipped OCR",
            bbox: JSON.stringify(band.box),
            cropBase64: primary.thumbDataUrl,
          },
        });
        outLines.push({
          id: line.id,
          index: band.index,
          kind: line.kind,
          text: line.text,
          latex: line.latex,
          confidence: line.confidence,
          alternatives: [],
          notes: line.notes,
          cropBase64: line.cropBase64,
          status: line.status,
        });
        continue;
      }

      // ---- continuity context (lines already transcribed above this one) --
      const priorLines = await db.transcriptionLine.findMany({
        where: { pageId, order: { lt: band.index } },
        orderBy: { order: "desc" },
        take: 2,
      });
      const context = priorLines
        .reverse()
        .map((l) => `« ${l.verifiedText || l.text} »`)
        .join("\n");

      // ---- vision reads (1 sample for LTR, 3 independent zooms for RTL) ---
      const sampleReadings: Reading[] = [];
      await Promise.all(
        crops.map(async (crop, si) => {
          if (si > 0 && crop.inkRatio >= 0 && crop.inkRatio < BLANK_INK) return; // blank variant
          const user = buildReadUserPrompt(
            subject,
            [{ index: band.index, preliminary: "", kind: band.kind }],
            context,
          );
          const mime = crop.imageDataUrl.slice(5, crop.imageDataUrl.indexOf(";"));
          try {
            const parsed = await visionJson<{ readings?: Reading[] }>(
              system,
              user,
              [{ mime, base64: crop.imageDataUrl.split(",")[1] || "" }],
              {
                subject: subject.subject,
                direction: subject.direction,
                apiKey: byok,
                // hard-bounded so one hung/hallucinating model call cannot
                // hold this request past the preview gateway's patience
                // (which 502s the browser and fails the whole batch)
                retries: 1,
                timeoutMs: LONG_HOST ? 100_000 : 40_000,
                deadlineMs: LONG_HOST ? 110_000 : 45_000,
              },
            );
            const readings = Array.isArray(parsed.readings) ? parsed.readings : [];
            // index-first match with positional fallback (single band per
            // call, so a mis-echoed index still lands on the only band)
            const r =
              readings.find((x) => Number(x?.index) === band.index) ??
              (readings.length === 1 ? readings[0] : undefined);
            if (r) sampleReadings[si] = r;
          } catch (err) {
            if (err instanceof AiConfigError) throw err;
            console.error(`[api/ocr/read] sample ${si} failed for band ${band.index}:`, err);
          }
        }),
      );

      const valid = sampleReadings.filter(Boolean) as Reading[];
      if (valid.length === 0) {
        throw new Error("The OCR model failed to respond for these bands. Please retry them.");
      }

      // ---- consensus -------------------------------------------------------
      const norm = (s: string) => s.replace(/\s+/g, " ").trim();
      const validConf = new Set(["high", "medium", "low", "illegible"]);
      const groups = new Map<string, Reading[]>();
      for (const r of valid) {
        const key = norm(r.text || "");
        groups.set(key, [...(groups.get(key) || []), r]);
      }
      const [bestKey, bestGroup] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      const unanimous = bestGroup.length === valid.length;
      const agreed = bestGroup.length >= 2;

      const chosen = bestGroup[0];
      let confidence = validConf.has(chosen.confidence || "") ? chosen.confidence : "medium";
      if (isRtl) {
        // Calibration: RTL self-reports are unreliable — disagreement forces
        // "low"; even unanimous RTL reads never claim "high" from the model
        // alone (the human Verify step is what raises it).
        if (!agreed) confidence = "low";
        else if (confidence === "high") confidence = unanimous ? "medium" : "medium";
      }

      // Alternatives: model's own + dissenting ensemble texts.
      const alternatives: Array<{ text: string; note: string }> = Array.isArray(chosen.alternatives)
        ? chosen.alternatives.slice(0, 4).map((a) => ({ text: String(a.text || ""), note: String(a.note || "") }))
        : [];
      for (const r of valid) {
        const t = norm(r.text || "");
        if (!t || t === norm(chosen.text || "")) continue;
        if (alternatives.some((a) => norm(a.text) === t)) continue;
        alternatives.push({ text: t, note: "independent zoom sample disagreed" });
      }
      const altCount = Math.min(alternatives.length, 5);

      const ensembleNote =
        valid.length > 1
          ? `ensemble: ${bestGroup.length}/${valid.length} zoom samples agree${
              agreed ? "" : " — verify this line carefully"
            }`
          : "";
      const notes = [String(chosen.notes || "").slice(0, 400), ensembleNote].filter(Boolean).join(" · ").slice(0, 600);

      const kind = ["text", "heading", "list", "math", "ignore"].includes(chosen.kind || "")
        ? (chosen.kind as string)
        : band.kind;
      const latex = subject.subject === "mathematics" ? String(chosen.latex || "").trim() : null;

      const line = await db.transcriptionLine.upsert({
        where: { pageId_order: { pageId, order: band.index } },
        create: {
          pageId,
          order: band.index,
          kind,
          text: String(chosen.text || "").trim(),
          latex,
          confidence,
          alternatives: JSON.stringify(alternatives),
          notes,
          bbox: JSON.stringify(band.box),
          cropBase64: primary.thumbDataUrl,
        },
        update: {
          kind,
          text: String(chosen.text || "").trim(),
          latex,
          confidence,
          alternatives: JSON.stringify(alternatives),
          notes,
          bbox: JSON.stringify(band.box),
          cropBase64: primary.thumbDataUrl,
        },
      });
      outLines.push({
        id: line.id,
        index: band.index,
        kind: line.kind,
        text: line.text,
        latex: line.latex,
        confidence: line.confidence,
        alternatives: alternatives.slice(0, altCount),
        notes: line.notes,
        cropBase64: line.cropBase64,
        status: line.status,
      });
    }

    if (outLines.length === 0) {
      return NextResponse.json({ error: "None of the given band indices exist." }, { status: 400 });
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
