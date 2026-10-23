import { NextRequest, NextResponse } from "next/server";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { db, ensureDb } from "@/lib/db";
import type { DocBlock } from "@/lib/doc-prompts";
import { getArticle } from "@/lib/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function slugTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "sonar-document"
  );
}

function blockToMarkdown(b: DocBlock): string {
  switch (b.type) {
    case "title":
      return `# ${b.text}`;
    case "subtitle":
      return `*${b.text}*`;
    case "heading":
      return `${"#".repeat(Math.min(6, 1 + (b.level || 2)))} ${b.text}`;
    case "list-item":
      return `- ${b.text}`;
    case "math":
      return b.latex ? `$$${b.latex}$$` : b.text;
    case "quote":
      return `> ${b.text}`;
    case "note":
      return `> **Note:** ${b.text}`;
    case "divider":
      return `---`;
    default:
      return b.text;
  }
}

async function buildDocx(blocks: DocBlock[], title: string, rtl: boolean): Promise<Buffer> {
  const children: Paragraph[] = [];
  const base = rtl ? { bidirectional: true } : {};

  for (const b of blocks) {
    switch (b.type) {
      case "title":
        children.push(
          new Paragraph({
            ...base,
            heading: HeadingLevel.TITLE,
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: b.text, bold: true, size: 56, font: rtl ? "Arial" : undefined })],
          }),
        );
        break;
      case "subtitle":
        children.push(
          new Paragraph({
            ...base,
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: b.text, italics: true, size: 26, color: "666666", font: rtl ? "Arial" : undefined })],
          }),
        );
        break;
      case "heading":
        children.push(
          new Paragraph({
            ...base,
            heading: b.level === 1 ? HeadingLevel.HEADING_1 : b.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
            alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: b.text, bold: true, font: rtl ? "Arial" : undefined })],
          }),
        );
        break;
      case "list-item":
        children.push(
          new Paragraph({
            ...base,
            bullet: { level: 0 },
            children: [new TextRun({ text: b.text, font: rtl ? "Arial" : undefined })],
          }),
        );
        break;
      case "math":
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: b.latex || b.text, font: "Consolas", size: 26 }),
            ],
          }),
        );
        break;
      case "quote":
        children.push(
          new Paragraph({
            ...base,
            indent: { left: 480, right: rtl ? 480 : undefined },
            children: [new TextRun({ text: b.text, italics: true, color: "444444", font: rtl ? "Arial" : undefined })],
          }),
        );
        break;
      case "note":
        children.push(
          new Paragraph({
            ...base,
            children: [
              new TextRun({ text: `Note: ${b.text}`, italics: true, size: 24, color: "8a6d1a", font: rtl ? "Arial" : undefined }),
            ],
          }),
        );
        break;
      case "divider":
        children.push(new Paragraph({ children: [new TextRun({ text: "───────────────────", color: "BBBBBB" })] }));
        break;
      default:
        children.push(
          new Paragraph({
            ...base,
            children: [new TextRun({ text: b.text, font: rtl ? "Arial" : undefined })],
          }),
        );
    }
  }

  const doc = new Document({
    title,
    styles: {
      default: {
        document: { run: { size: 26 } },
      },
    },
    numbering: {
      config: [
        {
          reference: "sonar-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}

/**
 * POST /api/document/export  { id, format: 'docx' | 'md' | 'txt' }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDb();
    const body = await req.json();
    const id = String(body.id || "");
    const format = ["docx", "md", "txt"].includes(body.format) ? body.format : "docx";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const doc = await db.documentProject.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const blocks: DocBlock[] = JSON.parse(doc.blocks);
    const article = await getArticle(doc.subject);
    const rtl = article?.direction === "rtl";
    const base = slugTitle(doc.title);

    if (format === "docx") {
      const buf = await buildDocx(blocks, doc.title, rtl);
      return NextResponse.json({
        filename: `${base}.docx`,
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        base64: buf.toString("base64"),
      });
    }

    if (format === "md") {
      const md = blocks.map(blockToMarkdown).join("\n\n") + "\n";
      return NextResponse.json({
        filename: `${base}.md`,
        mime: "text/markdown",
        base64: Buffer.from(md, "utf-8").toString("base64"),
      });
    }

    const txt =
      blocks
        .map((b) => {
          if (b.type === "title") return b.text.toUpperCase();
          if (b.type === "heading") return `${b.text}\n${"=".repeat(Math.min(60, b.text.length))}`;
          if (b.type === "list-item") return `  • ${b.text}`;
          if (b.type === "math") return b.latex ? `    ${b.latex}` : `    ${b.text}`;
          if (b.type === "note") return `[note] ${b.text}`;
          if (b.type === "divider") return "─".repeat(40);
          return b.text;
        })
        .join("\n\n") + "\n";
    return NextResponse.json({
      filename: `${base}.txt`,
      mime: "text/plain",
      base64: Buffer.from(txt, "utf-8").toString("base64"),
    });
  } catch (err) {
    console.error("[api/document/export] failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
