import { db, ensureDb } from "@/lib/db";
import { analyzePage } from "@/lib/imagetools";

/**
 * Cross-instance pipeline state for Vercel.
 *
 * Every serverless lambda instance bootstraps its OWN ephemeral SQLite in
 * /tmp, and Vercel's load balancer routes consecutive requests to different
 * warm instances — so a page created by /api/ocr/start on instance A can be
 * invisible to /api/ocr/layout one second later on instance B.
 *
 * Fix: the client (which holds everything anyway — it uploaded the image and
 * received every pipeline response) sends a `context` object with each
 * pipeline call. When a route lands on an instance where the page row is
 * missing, it REBUILDS the row from that context using the SAME explicit ids
 * — so the rebuild is idempotent and every instance converges on identical
 * rows. Nothing is lost: geometry is re-derived deterministically (the sharp
 * analyzer is pure), and the layout decisions come straight from the client.
 */
export type PipelineContext = {
  /** stable session id (from /api/ocr/start) */
  sessionId?: string;
  /** stable page id (from /api/ocr/start) */
  pageId: string;
  /** page index within the session */
  index?: number;
  /** subject slug — selects the research dossier + engine */
  subject: string;
  /** the ORIGINAL uploaded image (data URL) — re-analyzed on rebuild */
  imageBase64?: string;
  /** layout decisions (from the layout response) — exact-fidelity rebuild */
  bands?: Array<{
    index: number;
    box: { x: number; y: number; w: number; h: number };
    kind: string;
    preliminary?: string;
    needsZoom?: boolean;
    reason?: string;
  }>;
  width?: number;
  height?: number;
};

type PageWithSession = Awaited<ReturnType<typeof findPageIncluded>>;

async function findPageIncluded(pageId: string) {
  return db.ocrPage.findUnique({ where: { id: pageId }, include: { session: true } });
}

/**
 * Find the page row; when this instance's DB doesn't know it (serverless
 * multi-instance), rebuild session + page from the client-supplied context
 * with STABLE explicit ids. Returns null when neither is possible (no
 * context) — callers turn that into their usual 404.
 */
export async function findPageOrRebuild(ctx: PipelineContext | null | undefined): Promise<PageWithSession | null> {
  const direct = await findPageIncluded(ctx?.pageId || "");
  if (direct) return direct;
  if (!ctx || !ctx.subject || !ctx.imageBase64 || !ctx.imageBase64.startsWith("data:image/")) return null;

  await ensureDb();

  // session: find-or-create with the client's stable id
  let session = ctx.sessionId ? await db.ocrSession.findUnique({ where: { id: ctx.sessionId } }) : null;
  if (!session) {
    try {
      session = await db.ocrSession.create({
        data: { ...(ctx.sessionId ? { id: ctx.sessionId } : {}), subject: ctx.subject, status: "processing" },
      });
    } catch {
      // concurrent rebuild on another request won the create race
      session = ctx.sessionId ? await db.ocrSession.findUnique({ where: { id: ctx.sessionId } }) : null;
    }
  }
  if (!session) return null;

  // deterministic local re-analysis (sharp on serverless) → candidates,
  // deskewed page image, overlay, dimensions
  const analysis = await analyzePage(ctx.imageBase64);

  const bands = JSON.stringify({
    engine: analysis.engine,
    candidates: analysis.bands,
    decisions: Array.isArray(ctx.bands) && ctx.bands.length ? ctx.bands : null,
    deskewAngle: analysis.deskewAngle,
  });

  try {
    return await db.ocrPage.create({
      data: {
        id: ctx.pageId, // stable id → idempotent across instances
        sessionId: session.id,
        index: ctx.index ?? 0,
        status: "processing",
        imageBase64: analysis.pageDataUrl,
        overlayBase64: analysis.overlayDataUrl,
        width: ctx.width ?? analysis.width,
        height: ctx.height ?? analysis.height,
        bands,
      },
      include: { session: true },
    });
  } catch {
    // lost a create race (or the row appeared meanwhile) → re-fetch
    return findPageIncluded(ctx.pageId);
  }
}
