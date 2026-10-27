import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { db, ensureDb } from "@/lib/db";
import { AiConfigError, extractJson, visionChat, visionJson, LONG_HOST } from "@/lib/zai";
import { byokFromRequest, engineForSubject, geminiEnabled, sandboxAnalyzePage } from "@/lib/gemini";
import { buildLayoutSystemPrompt, buildLayoutUserPrompt, type SubjectInfo } from "@/lib/ocr-prompts";
import { getArticle } from "@/lib/subjects";
import { findPageOrRebuild } from "@/lib/pipeline-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Budgets so this request ALWAYS answers inside the preview gateway's
 * patience (the gateway 502s the browser when a request runs too long —
 * the "layout took 2.3 minutes → Request failed (502)" bug). On Vercel
 * there is no gateway and functions run up to 300s, so budgets breathe:
 * the code-execution sandbox legitimately needs 60-120s to upload the
 * page, write and run its OpenCV code.
 */
const LAYOUT_DEADLINE_MS = LONG_HOST ? 210_000 : 50_000; // whole model phase must finish inside this
const LAYOUT_ATTEMPT_MS = LONG_HOST ? 100_000 : 35_000; // one model call at most this long
const SANDBOX_TIMEOUT_MS = LONG_HOST ? 160_000 : 45_000; // gemini code-execution page analysis

/**
 * Layout only needs band GEOMETRY + semantics — not fine glyph detail.
 * Sending the full-size page made each vision call 2-3× slower; a 1100px
 * JPEG answers far faster and every band box is later snapped onto
 * python's precise rows anyway.
 */
async function downscaleForLayout(dataUrl: string): Promise<{ mime: string; base64: string }> {
  try {
    const base64 = dataUrl.split(",")[1] || "";
    const buf = Buffer.from(base64, "base64");
    const out = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: 1100, withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer();
    return { mime: "image/jpeg", base64: out.toString("base64") };
  } catch {
    // never let a decode hiccup break the pipeline — fall back to the original
    const image = dataUrl;
    return { mime: image.includes("image/png") ? "image/png" : "image/jpeg", base64: image.split(",")[1] || "" };
  }
}

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
 * Prompt for the Gemini code-execution sandbox: the model itself writes and
 * runs the page analysis + cropping code (OpenCV in Google's sandbox) and
 * hands back measured band geometry (JSON) plus every crop as an output
 * image. This replaces the local python scripts when a Gemini key is active.
 */
const SANDBOX_ANALYSIS_PROMPT = `Analyze the attached page image by writing Python and running it in your code execution sandbox.
The image file is available in your sandbox — discover its path (os.listdir / glob) and open it with cv2.imdecode or PIL.

Run code that does exactly this:
1. Load the image; convert to grayscale for measurements.
2. Estimate and correct skew with a projection-profile search over -6..6 degrees.
3. Binarize with adaptive thresholding (ink = white), then REMOVE long horizontal ruling/table lines (morphological opening with a wide horizontal kernel, then subtract).
4. Detect every text-line ROW: horizontal ink projection on the cleaned mask; smooth; merge small gaps. Aim for individual visual lines; for connected Arabic/Nastaliq diagonal stacking, keep whole words together and never over-split mid-word.
5. For each row, in strict top-to-bottom reading order i = 0,1,2,...:
   - measure the tight bounding box (x, y, w, h) in pixels of the deskewed image;
   - crop with ~12px padding, enhance (CLAHE + percentile contrast stretch + unsharp), upscale ~2.5x (cap width 1400px);
   - save it with cv2.imwrite as band_<i>.png.
6. Finally respond with ONLY this JSON object (no code fences, no prose):
   {"pageWidth": <int>, "pageHeight": <int>, "deskewAngle": <float>, "bands": [{"index": <int>, "box": {"x": <int>, "y": <int>, "w": <int>, "h": <int>}, "kind": "text"|"heading"|"math"|"ignore"}]}
   bands MUST be in the same top-to-bottom order as the saved band_<i>.png files and bands[i].index MUST equal i.

Do NOT transcribe or read any text — geometry and crops only.`;

type SandboxBand = { index: number; box: { x: number; y: number; w: number; h: number }; kind: string };

/** Parse + validate the sandbox analysis JSON and pair bands with returned crops. */
function parseSandboxAnalysis(
  raw: string,
  crops: Array<{ mime: string; base64: string }>,
  pageW: number,
  pageH: number,
): { bands: SandboxBand[]; crops: Array<{ mime: string; base64: string }> } | null {
  let parsed: {
    pageWidth?: number;
    pageHeight?: number;
    bands?: Array<{ index?: number; box?: { x?: number; y?: number; w?: number; h?: number }; kind?: string }>;
  };
  try {
    parsed = extractJson<typeof parsed>(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.bands) || parsed.bands.length === 0 || parsed.bands.length > 80) return null;
  const bands: SandboxBand[] = [];
  for (const b of parsed.bands) {
    const bx = Number(b?.box?.x), by = Number(b?.box?.y), bw = Number(b?.box?.w), bh = Number(b?.box?.h);
    if (![bx, by, bw, bh].every((v) => Number.isFinite(v))) continue;
    if (bw < 8 || bh < 6) continue;
    const x = Math.max(0, Math.min(pageW - 8, Math.round(bx)));
    const y = Math.max(0, Math.min(pageH - 8, Math.round(by)));
    const w = Math.max(8, Math.min(pageW - x, Math.round(bw)));
    const h = Math.max(6, Math.min(pageH - y, Math.round(bh)));
    const kind = ["text", "heading", "list", "math", "ignore"].includes(String(b?.kind)) ? String(b?.kind) : "text";
    bands.push({ index: bands.length, box: { x, y, w, h }, kind });
  }
  if (bands.length === 0) return null;
  // pair crops by production order; only trust them when the count matches
  const paired = crops.length === bands.length ? crops : [];
  return { bands, crops: paired };
}

/**
 * POST /api/ocr/layout  { pageId }
 *
 * Pass 1 — layout. Two engines:
 *
 * A) GEMINI SANDBOX (when a Gemini key is active, BYOK or env): the page is
 *    uploaded to Google and the model runs OpenCV code in its code-execution
 *    sandbox — deskew, ruling-line removal, row detection, per-line enhanced
 *    crops. It returns measured band boxes (JSON) and the crops themselves
 *    as output images. Deterministic geometry from real pixel measurements,
 *    computed by the model's own code rather than our local scripts.
 *
 * B) LOCAL PYTHON + VLM PASS (fallback, and for non-Gemini setups): python
 *    candidates from the analyze step + the VLM layout pass reconciled onto
 *    python's precise rows (deterministic geometry, model contributes
 *    semantics only).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const pageId = String(body.pageId || "");
    if (!pageId) return NextResponse.json({ error: "pageId is required" }, { status: 400 });

    // serverless: the page may live on a different lambda instance's /tmp
    // SQLite — rebuild it from the client-supplied context when missing
    const page = await findPageOrRebuild(body.context);
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

    const byok = byokFromRequest(req);

    const bandsData = page.bands ? JSON.parse(page.bands) : { candidates: [], engine: "none", decisions: null };
    const candidateCount = Array.isArray(bandsData.candidates) ? bandsData.candidates.length : 0;

    // ---- engine A: Gemini code-execution sandbox analysis + cropping ------
    let sandboxFailed = false;
    if (geminiEnabled(byok)) {
      const img = page.imageBase64 || page.overlayBase64 || "";
      const mime = img.slice(5, img.indexOf(";")) || "image/jpeg";
      const base64 = img.split(",")[1] || "";
      if (base64) {
        try {
          const engine = engineForSubject(subject.subject, subject.direction);
          const sandbox = await sandboxAnalyzePage({
            system: "You are a precise document-image analysis engine. You write and run Python (OpenCV/numpy) in your code sandbox and follow the output format exactly.",
            user: SANDBOX_ANALYSIS_PROMPT,
            pageBase64: base64,
            pageMime: mime,
            engine,
            apiKey: byok,
            // the sandbox writes + runs code, which takes real time — on the
            // sandbox preview it must NOT eat the whole gateway budget
            // (otherwise the fallback below never gets to answer and the
            // browser gets a 502); on Vercel it gets the room it needs
            timeoutMs: SANDBOX_TIMEOUT_MS,
          });
          const pageW = page.width || 1600;
          const pageH = page.height || 1200;
          const parsedSandbox = parseSandboxAnalysis(sandbox.text, sandbox.crops, pageW, pageH);
          if (parsedSandbox) {
            const decisions = parsedSandbox.bands.map((b) => ({
              index: b.index,
              box: b.box,
              kind: b.kind,
              preliminary: "",
              needsZoom: b.box.h < 22,
              reason: "gemini code-execution sandbox (measured)",
            }));
            const sandboxCrops = parsedSandbox.crops.map((c, i) => ({
              order: decisions[i].index,
              dataUrl: `data:${c.mime};base64,${c.base64}`,
            }));
            const updatedBands = JSON.stringify({
              ...(bandsData || {}),
              decisions,
              engine: "gemini-code-exec",
              deskewAngle: (() => {
                try {
                  const j = extractJson<{ deskewAngle?: number }>(sandbox.text);
                  return Number(j.deskewAngle) || 0;
                } catch {
                  return 0;
                }
              })(),
            });
            await db.ocrPage.update({
              where: { id: pageId },
              data: { bands: updatedBands, sandboxCrops: sandboxCrops.length ? JSON.stringify(sandboxCrops) : null, status: "processing" },
            });
            await db.transcriptionLine.deleteMany({ where: { pageId } });
            return NextResponse.json({
              engine: "gemini-code-exec",
              bands: decisions,
              sandboxCrops: sandboxCrops.length,
              articleWords: article.content.split(/\s+/).filter(Boolean).length,
            });
          }
          console.warn("[api/ocr/layout] sandbox analysis returned no usable bands — falling back to local pipeline");
          sandboxFailed = true;
        } catch (err) {
          if (err instanceof AiConfigError) throw err;
          console.warn("[api/ocr/layout] sandbox analysis failed — falling back to local pipeline:", err instanceof Error ? err.message : err);
          sandboxFailed = true;
        }
      }
    }

    // When the Gemini sandbox already burned ~45s and python has candidate
    // rows, do NOT fire another slow VLM call — that combination is exactly
    // how this request used to exceed the gateway timeout (502). Python rows
    // are precise geometry; the verify step provides the human semantics.
    if (sandboxFailed && candidateCount > 0) {
      const decisions: Array<BandDecision & { index: number }> = bandsData.candidates.map(
        (c: { x: number; y: number; w: number; h: number }, i: number) => ({
          box: clampBox(c, page.width || 1600, page.height || 1200),
          kind: "text",
          preliminary: "",
          needsZoom: true,
          reason: "python rows (sandbox unavailable)",
          index: i,
        }),
      );
      const updatedBands = JSON.stringify({ ...bandsData, decisions });
      await db.ocrPage.update({ where: { id: pageId }, data: { bands: updatedBands } });
      await db.transcriptionLine.deleteMany({ where: { pageId } });
      return NextResponse.json({
        engine: bandsData.engine || "none",
        bands: decisions,
        articleWords: article.content.split(/\s+/).filter(Boolean).length,
      });
    }

    const image = page.overlayBase64 || page.imageBase64;
    const modelImage = await downscaleForLayout(image);

    const system = buildLayoutSystemPrompt(article.content, subject);
    const user = buildLayoutUserPrompt(subject, candidateCount);
    const modelPhaseStartedAt = Date.now();

    let rawBands: unknown = null;
    try {
      const parsed = await visionJson<{ bands?: unknown }>(system, user, [modelImage], {
        subject: subject.subject,
        direction: subject.direction,
        apiKey: byok,
        retries: 1,
        timeoutMs: LAYOUT_ATTEMPT_MS,
        deadlineMs: LAYOUT_DEADLINE_MS,
        // layout only labels bands — geometry comes from python/sharp. Code
        // execution is NOT needed and attaching it makes the call 5-10×
        // slower (the model starts writing+running code).
        engineOverride: { codeExecution: false },
      });
      rawBands = parsed.bands;
    } catch (err) {
      if (err instanceof AiConfigError) throw err;
      console.error("[api/ocr/layout] JSON path failed:", err instanceof Error ? err.message : err);
      // One more raw call parsed by the loose band scanner — but ONLY when
      // python found no candidate rows (otherwise python's rows are already
      // the authoritative geometry and a second slow model call would just
      // push the request past the gateway timeout → 502 for the user).
      if (candidateCount === 0) {
        const left = LAYOUT_DEADLINE_MS - (Date.now() - modelPhaseStartedAt);
        if (left < 6_000) throw new Error("Layout model too slow — please try again.");
        try {
          const raw = await visionChat(system, user, [modelImage], {
            subject: subject.subject,
            direction: subject.direction,
            apiKey: byok,
            timeoutMs: left,
          });
          const loose = parseBandsLoose(raw);
          if (loose.length > 0) {
            rawBands = loose;
          } else {
            throw new Error("no bands detected");
          }
        } catch (secondErr) {
          console.error("[api/ocr/layout] loose scan failed:", secondErr);
          throw new Error("The layout model failed to return a usable response. Please try again.");
        }
      }
      // with candidates present: fall through — python rows become the bands below
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
