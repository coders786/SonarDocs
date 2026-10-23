import { NextRequest, NextResponse } from "next/server";
import { getArticle, listArticles, upsertArticle } from "@/lib/subjects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** GET /api/research → list; GET /api/research?subject=sindhi → full article */
export async function GET(req: NextRequest) {
  try {
    const subject = req.nextUrl.searchParams.get("subject");
    if (subject) {
      const article = await getArticle(subject);
      if (!article) {
        return NextResponse.json({ error: `No research article for subject '${subject}'` }, { status: 404 });
      }
      return NextResponse.json({ article });
    }
    const articles = await listArticles();
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[api/research] GET failed:", err);
    return NextResponse.json({ error: "Failed to load research articles" }, { status: 500 });
  }
}

/** POST /api/research → create a custom subject article */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const direction = body.direction === "rtl" ? "rtl" : "ltr";
    const language = String(body.language || title).trim();
    if (!title || content.length < 200) {
      return NextResponse.json(
        { error: "A title and a research article of at least 200 characters are required." },
        { status: 400 },
      );
    }
    const subject = slugify(body.subject || title);
    if (!subject) {
      return NextResponse.json({ error: "Could not derive a subject id from the title." }, { status: 400 });
    }
    const existing = await getArticle(subject);
    if (existing) {
      return NextResponse.json({ error: `Subject '${subject}' already exists.` }, { status: 409 });
    }
    await upsertArticle({ subject, title, language, direction, content, isCustom: true });
    const article = await getArticle(subject);
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    console.error("[api/research] POST failed:", err);
    return NextResponse.json({ error: "Failed to create research article" }, { status: 500 });
  }
}

/** PUT /api/research → update an article (edits persist and are used by the OCR prompt) */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const subject = String(body.subject || "").trim();
    if (!subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    const existing = await getArticle(subject);
    if (!existing) {
      return NextResponse.json({ error: `No research article for subject '${subject}'` }, { status: 404 });
    }
    const content = String(body.content ?? existing.content);
    if (content.trim().length < 50) {
      return NextResponse.json({ error: "Article content is too short to be useful for OCR." }, { status: 400 });
    }
    await upsertArticle({
      subject,
      title: String(body.title || existing.title),
      language: String(body.language || existing.language),
      direction: body.direction === "rtl" ? "rtl" : body.direction === "ltr" ? "ltr" : existing.direction,
      content,
      isCustom: false,
    });
    const article = await getArticle(subject);
    return NextResponse.json({ article });
  } catch (err) {
    console.error("[api/research] PUT failed:", err);
    return NextResponse.json({ error: "Failed to update research article" }, { status: 500 });
  }
}
