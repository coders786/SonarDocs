import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import { AiConfigError, visionChat, visionJson } from "@/lib/zai";
import { buildLayoutSystemPrompt, buildLayoutUserPrompt, type SubjectInfo } from "@/lib/ocr-prompts";
import { getArticle } from "@/lib/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type BandDecision = {
  box: { x: number; y: number; w: number; h: number };
  kind: string;
  preliminary: string;
  needsZoom: boolean;
  reason: string;
};

function clampBox(box: BandDecision["box"], w: number, h: number): BandDecision["box"] {
  const x = Math.max(0, Math.min(w - 4, Math.round(box.x || 0)));
  const y = Math.max(0, Math.min(h - 4, Math.round(box.y || 0)));
  const bw = Math.max(8, Math.min(w - x, Math.round(box.w || 0)));
  const bh = Math.max(8, Math.min(h - y, Math.round(box.h || 0)));
  return { x, y, w: bw, h: bh };
}

/** Vertical overlap ratio between a decision box and a python candidate box. */
function vertOverlap(a: BandDecision["box"], b: { x: number; y: number; w: number; h: number }): number {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, bottom - top);
  return inter / Math.max(1, Math.min(a.h, b.h));
}

/**
 * Reconcile the model's semantic layout decisions with python's fine text
 * rows.
 *
 * Python detects precise visual text rows (short continuation rows
 * included) but has no semantics. The model understands what each region is
 * (heading, equation, stain to ignore) but has weak absolute-pixel
 * grounding — its boxes can drift by a full row, so they must never define
 * geometry directly.
 *
 * Deterministic strategy: every python row becomes exactly one band (clean,
 * non-overlapping geometry, reading order). Each row inherits kind from the
 * best-overlapping model decision. Model decisions that overlap no row
 * become extra bands (faint text python missed) unless they would duplicate
 * an existing band. When python found nothing, the model's bands are used
 * as-is.
 *
 * NOTE: the model's "preliminary" quick-reads are deliberately DISCARDED —
 * its box attribution can drift by whole rows (esp. on RTL cursive), so a
 * preliminary often belongs to a different line than the box it arrived
 * with. Feeding it to the read pass anchors the reader on the wrong text.
 */
function reconcileBands(
  decisions: Array<BandDecision & { index: number }>,
  candidates: Array<{ x: number; y: number; w: number; h: number }>,
  width: number,
  height: number,
): Array<BandDecision & { index: number }> {
  if (!candidates.length) return decisions;
  const rows = candidates.map((c) => clampBox(c, width, height));
  const claimed = new Set<number>();

  const out: Array<BandDecision & { index: number }> = rows.map((r) => {
    let best = -1;
    let bestRatio = 0;
    decisions.forEach((d, i) => {
      const top = Math.max(r.y, d.box.y);
      const bottom = Math.min(r.y + r.h, d.box.y + d.box.h);
      const ratio = (bottom - top) / Math.max(1, r.h);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = i;
      }
    });
    if (best !== -1 && bestRatio > 0.35) {
      claimed.add(best);
      const d = decisions[best];
      return { ...d, box: r, preliminary: "", needsZoom: d.needsZoom || r.h < 22 };
    }
    return {
      index: 0,
      box: r,
      kind: "text",
      preliminary: "",
      needsZoom: true,
      reason: "python row",
    };
  });

  // model-only bands: regions the ink detector missed entirely
  decisions.forEach((d, i) => {
    if (claimed.has(i)) return;
    const overlapsExisting = out.some((b) => {
      const top = Math.max(b.box.y, d.box.y);
      const bottom = Math.min(b.box.y + b.box.h, d.box.y + d.box.h);
      return bottom - top > 2; // any overlap → likely a drifted duplicate
    });
    if (overlapsExisting) return;
    out.push({ ...d, preliminary: "", needsZoom: true, reason: `${d.reason ? d.reason + " " : ""}(model-only)`.trim() });
  });

  return out.sort((a, b) => a.box.y - b.box.y);
}

/**
 * Last-resort parser: scan a (possibly malformed) model response for band
 * entries. The vision model frequently mangles JSON punctuation (shorthand
 * boxes, mixed brackets) while still emitting all the data — this scanner
 * recovers it.
 */
function parseBandsLoose(raw: string): BandDecision[] {
  const bands: BandDecision[] = [];
  const boxRe = /"box"\s*:\s*[\[{]\s*"x"?\s*[:]?\s*(-?\d+)\D{1,4}(-?\d+)\D{1,4}(-?\d+)\D{1,4}(-?\d+)/g;
  let m: RegExpExecArray | null;
  const positions: Array<{ box: BandDecision["box"]; end: number }> = [];
  while ((m = boxRe.exec(raw)) !== null) {
    positions.push({
      box: { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) },
      end: m.index + m[0].length,
    });
  }
  for (let i = 0; i < positions.length; i++) {
    const { box, end } = positions[i];
    const chunk = raw.slice(end, i + 1 < positions.length ? positions[i + 1].end - 100 : end + 600);
    const kindMatch = chunk.match(/"kind"\s*:\s*"([^"]+)"/);
    const prelimMatch = chunk.match(/"preliminary"\s*:\s*"([^"]*)"/);
    const zoomMatch = chunk.match(/"needsZoom"\s*:\s*(true|false)/);
    const kind = kindMatch && ["text", "heading", "list", "math", "ignore"].includes(kindMatch[1]) ? kindMatch[1] : "text";
    bands.push({
      box,
      kind,
      preliminary: prelimMatch ? prelimMatch[1] : "",
      needsZoom: zoomMatch ? zoomMatch[1] === "true" : false,
      reason: "",
    });
  }
  return bands;
}

/**
 * POST /api/ocr/layout  { pageId }
 * VLM pass 1: the model sees the (overlay-annotated) page together with the
 * subject's FULL research article in its system prompt, and returns the
 * final text-band decisions (boxes in page pixel coordinates).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const pageId = String(body.pageId || "");
    if (!pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });

    const page = await db.ocrPage.findUnique({ where: { id: pageId }, include: { session: true } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    if (!page.overlayBase64 && !page.imageBase64) {
      return NextResponse.json({ error: "Page has no image stored" }, { status: 400 });
    }

    const article = await getArticle(page.session.subject);
    if (!article) return NextResponse.json({ error: "Research article missing for subject" }, { status: 404 });

    const subject: SubjectInfo = {
      subject: article.subject,
      language: article.language,
      nativeLabel: article.nativeLabel,
      direction: article.direction,
    };

    const bandsData = page.bands ? JSON.parse(page.bands) : { candidates: [], engine: "none", decisions: null };
    const candidateCount = Array.isArray(bandsData.candidates) ? bandsData.candidates.length : 0;

    const image = page.overlayBase64 || page.imageBase64;
    const mime = image.includes("image/png") ? "image/png" : "image/jpeg";
    const base64 = image.split(",")[1] || "";

    const system = buildLayoutSystemPrompt(article.content, subject);
    const user = buildLayoutUserPrompt(subject, candidateCount);

    let rawBands: unknown = null;
    try {
      const parsed = await visionJson<{ bands?: unknown }>(system, user, [{ mime, base64 }], {
        subject: subject.subject,
        direction: subject.direction,
      });
      rawBands = parsed.bands;
    } catch (err) {
      if (err instanceof AiConfigError) throw err;
      console.error("[api/ocr/layout] JSON path failed, using loose scanner:", err);
      // last resort: one more raw call parsed by the loose band scanner
      try {
        const raw = await visionChat(system, user, [{ mime, base64 }], {
          subject: subject.subject,
          direction: subject.direction,
        });
        const loose = parseBandsLoose(raw);
        if (loose.length > 0) {
          rawBands = loose;
        } else if (candidateCount > 0) {
          rawBands = null; // fall back to python candidates below
        } else {
          throw new Error("no bands detected");
        }
      } catch (secondErr) {
        console.error("[api/ocr/layout] loose scan failed:", secondErr);
        throw new Error("The layout model failed to return a usable response. Please try again.");
      }
    }

    const width = page.width || 1600;
    const height = page.height || 1200;

    let decisions: Array<BandDecision & { index: number }> = [];
    const coerce = (b: unknown): BandDecision | null => {
      if (!b || typeof b !== "object") return null;
      const obj = b as Record<string, unknown>;
      let box = obj.box;
      if (Array.isArray(box) && box.length === 4 && box.every((v) => Number.isFinite(Number(v)))) {
        box = { x: Number(box[0]), y: Number(box[1]), w: Number(box[2]), h: Number(box[3]) };
      }
      if (!box || typeof box !== "object" || !Number.isFinite(Number((box as Record<string, unknown>).x))) return null;
      const b2 = box as Record<string, unknown>;
      const kind = String(obj.kind || "text");
      return {
        box: { x: Number(b2.x), y: Number(b2.y ?? 0), w: Number(b2.w ?? 0), h: Number(b2.h ?? 0) },
        kind: ["text", "heading", "list", "math", "ignore"].includes(kind) ? kind : "text",
        preliminary: String(obj.preliminary || ""),
        reason: String(obj.reason || ""),
        needsZoom: !!obj.needsZoom,
      };
    };

    if (Array.isArray(rawBands)) {
      decisions = rawBands
        .map(coerce)
        .filter((b): b is BandDecision => !!b)
        .map((b) => ({ ...b, box: clampBox(b.box, width, height) }))
        .sort((a, b) => a.box.y - b.box.y)
        .map((b, i) => ({ ...b, index: i }));

      // snap the model's semantics onto python's precise geometry
      const candidates = Array.isArray(bandsData.candidates) ? bandsData.candidates : [];
      decisions = reconcileBands(decisions, candidates, width, height);
      decisions = decisions.map((d, i) => ({ ...d, index: i }));
    }

    if (decisions.length === 0) {
      // If the model returned nothing usable but python found candidates,
      // fall back to the python candidate bands so the flow can continue.
      if (candidateCount > 0) {
        decisions = bandsData.candidates.map((c: { x: number; y: number; w: number; h: number }, i: number) => ({
          box: clampBox(c, width, height),
          kind: "text",
          preliminary: "",
          needsZoom: true,
          reason: "fallback to python-detected band",
          index: i,
        }));
      } else {
        return NextResponse.json(
          { error: "The layout model did not detect any text bands. Try a clearer photo." },
          { status: 422 },
        );
      }
    }

    // persist decisions
    const updatedBands = JSON.stringify({ ...bandsData, decisions });
    await db.ocrPage.update({ where: { id: pageId }, data: { bands: updatedBands } });

    // remove previous lines if this is a re-run
    await db.transcriptionLine.deleteMany({ where: { pageId } });

    return NextResponse.json({
      engine: bandsData.engine || "none",
      bands: decisions,
      articleWords: article.content.split(/\s+/).filter(Boolean).length,
    });
  } catch (err) {
    console.error("[api/ocr/layout] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Layout analysis failed" },
      { status: 500 },
    );
  }
}
