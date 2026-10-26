import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/lib/db";
import {
  buildDocumentSystemPrompt,
  buildDocumentUserPrompt,
  type DocBlock,
  type DocType,
} from "@/lib/doc-prompts";
import type { SubjectInfo } from "@/lib/ocr-prompts";
import { getArticle } from "@/lib/subjects";
import { AiConfigError, extractJson, textJson } from "@/lib/zai";
import { byokFromRequest } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BLOCK_TYPES = new Set(["title", "subtitle", "heading", "paragraph", "list-item", "math", "quote", "note", "divider"]);

function normalizeBlocks(raw: unknown): DocBlock[] {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const blocks: DocBlock[] = [];
  let n = 1;
  for (const b of arr) {
    if (!b || typeof b !== "object") continue;
    const obj = b as Record<string, unknown>;
    const type = BLOCK_TYPES.has(String(obj.type)) ? (String(obj.type) as DocBlock["type"]) : "paragraph";
    let text = String(obj.text ?? "");
    if (type !== "divider" && !text.trim()) continue;
    if (type === "title") {
      // only the first title survives
      if (blocks.some((x) => x.type === "title")) continue;
    }
    let id = String(obj.id || `b${n}`);
    while (seen.has(id)) id = `b${n++}`;
    seen.add(id);
    blocks.push({
      id,
      type,
      text: type === "divider" ? "" : text,
      latex: typeof obj.latex === "string" && obj.latex.trim() ? obj.latex.trim() : undefined,
      level: [1, 2, 3].includes(Number(obj.level)) ? Number(obj.level) : type === "heading" ? 2 : undefined,
    });
    n++;
  }
  if (blocks.length && blocks[0].type !== "title") {
    blocks.unshift({ id: "b0", type: "title", text: "Untitled Document" });
  }
  return blocks;
}

/**
 * POST /api/document  { sessionId, docType, title?, instructions? }
 *
 * The document-creation AI: takes the VERIFIED transcription and writes a
 * structured document (blocks JSON).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const docType: DocType = ["transcript", "formatted-notes", "essay", "study-sheet"].includes(body.docType)
      ? body.docType
      : "formatted-notes";
    if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

    const session = await db.ocrSession.findUnique({
      where: { id: sessionId },
      include: { pages: { orderBy: { index: "asc" }, include: { lines: { orderBy: { order: "asc" } } } } },
    });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const allLines = session.pages.flatMap((p) =>
      p.lines
        .filter((l) => l.kind !== "ignore" && (l.verifiedText ?? l.text).trim().length > 0)
        .map((l) => ({
          pageIndex: p.index,
          order: l.order,
          kind: l.kind,
          text: (l.verifiedText ?? l.text).trim(),
          latex: l.latex,
          status: l.status,
        })),
    );
    if (allLines.length === 0) {
      return NextResponse.json({ error: "No verified transcription lines to build a document from." }, { status: 400 });
    }

    const article = await getArticle(session.subject);
    const subject: SubjectInfo = {
      subject: session.subject,
      language: article?.language ?? session.subject,
      nativeLabel: article?.nativeLabel ?? "",
      direction: article?.direction ?? "ltr",
    };

    const system = buildDocumentSystemPrompt(subject);
    const user = buildDocumentUserPrompt({
      subject,
      docType,
      title: String(body.title || "").trim(),
      instructions: String(body.instructions || "").trim(),
      lines: allLines,
    });

    let title = String(body.title || "").trim();
    let blocks: DocBlock[] = [];
    try {
      const parsed = await textJson<{ title?: string; blocks?: unknown }>(system, user, {
        subject: subject.subject,
        direction: subject.direction,
        apiKey: byokFromRequest(req),
      });
      if (!title && parsed.title) title = String(parsed.title).trim();
      blocks = normalizeBlocks(parsed.blocks);
    } catch (err) {
      if (err instanceof AiConfigError) throw err;
      console.error("[api/document] model failed:", err);
      // graceful fallback: a plain transcript document without AI rewriting
      title = title || "Transcript";
      blocks = [
        { id: "b0", type: "title", text: title },
        ...allLines.map((l, i) => ({
          id: `b${i + 1}`,
          type: l.kind === "math" ? ("math" as const) : ("paragraph" as const),
          text: l.text,
          latex: l.latex || undefined,
        })),
      ];
    }

    if (blocks.length === 0) {
      return NextResponse.json({ error: "The document model returned no content. Please retry." }, { status: 502 });
    }
    // reconcile the title block with the document title
    const titleBlock = blocks.find((b) => b.type === "title");
    if (titleBlock) {
      if ((!titleBlock.text.trim() || /^untitled(\s+document)?$/i.test(titleBlock.text.trim())) && title && title !== "Untitled Document") {
        titleBlock.text = title;
      } else if (titleBlock.text.trim() && (!title || title === "Untitled Document")) {
        title = titleBlock.text.trim();
      }
    } else if (title) {
      blocks.unshift({ id: "b-title", type: "title", text: title });
    }
    if (!title) {
      const t = blocks.find((b) => b.type === "title");
      title = t?.text || "Untitled Document";
    }

    const doc = await db.documentProject.create({
      data: {
        sessionId,
        title,
        docType,
        subject: session.subject,
        blocks: JSON.stringify(blocks),
      },
    });

    return NextResponse.json({ document: { id: doc.id, title: doc.title, docType: doc.docType, subject: doc.subject, blocks } });
  } catch (err) {
    console.error("[api/document] POST failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Document generation failed" }, { status: 500 });
  }
}

/** PUT /api/document  { id, title?, blocks } → save user edits */
export async function PUT(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const doc = await db.documentProject.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const blocks = normalizeBlocks(body.blocks);
    const title = String(body.title ?? doc.title).trim() || doc.title;
    const updated = await db.documentProject.update({
      where: { id },
      data: { title, blocks: JSON.stringify(blocks) },
    });
    return NextResponse.json({
      document: { id: updated.id, title: updated.title, docType: updated.docType, subject: updated.subject, blocks },
    });
  } catch (err) {
    console.error("[api/document] PUT failed:", err);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

/** GET /api/document?id=... → load one document */
export async function GET(req: NextRequest) {
  try {
    await ensureDb();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const doc = await db.documentProject.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json({
      document: { id: doc.id, title: doc.title, docType: doc.docType, subject: doc.subject, blocks: JSON.parse(doc.blocks) },
    });
  } catch (err) {
    console.error("[api/document] GET failed:", err);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
