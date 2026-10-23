import fs from "fs";
import path from "path";

/**
 * Subject registry + research article storage.
 *
 * Research articles are deep-research documents (one per subject) describing
 * how the script is written, its confusion atlas, and the OCR protocol.
 * When the user selects a subject, the article is loaded into the OCR
 * model's system prompt.
 *
 * Storage strategy:
 *  - Seed articles ship as files in /research and are seeded into the DB on
 *    first use (so users can edit them and the edit persists in the sandbox).
 *  - The DB is the primary store; if the DB is unavailable (e.g. on a
 *    serverless host without SQLite), we fall back to reading files +
 *    an in-memory overlay.
 */

export type SubjectMeta = {
  subject: string;
  title: string;
  language: string;
  nativeLabel: string;
  direction: "rtl" | "ltr";
  file?: string;
  icon: string;
  blurb: string;
  custom?: boolean;
};

export const SEED_SUBJECTS: SubjectMeta[] = [
  {
    subject: "sindhi",
    title: "Sindhi Script & Handwriting OCR",
    language: "Sindhi",
    nativeLabel: "سنڌي",
    direction: "rtl",
    file: "sindhi.md",
    icon: "reed",
    blurb:
      "Sindhi-Arabic script: 52+ letters, aspirates, retroflexes, implosives, Nastaliq/Naskh handwriting, dot logic and a full confusion atlas.",
  },
  {
    subject: "urdu",
    title: "Urdu Script & Handwriting OCR",
    language: "Urdu",
    nativeLabel: "اردو",
    direction: "rtl",
    file: "urdu.md",
    icon: "nib",
    blurb:
      "Nastaliq cascades, 38–39 letter inventory, aspirate digraphs, nuqta evidence, word-stacking and diagonal line behaviour.",
  },
  {
    subject: "english",
    title: "English Handwriting & HTR",
    language: "English",
    nativeLabel: "English",
    direction: "ltr",
    file: "english.md",
    icon: "pen",
    blurb:
      "Cursive, print and printscript styles, allographs, the minim problem, letter-confusion atlas and note-taking shorthand.",
  },
  {
    subject: "mathematics",
    title: "Handwritten Mathematics OCR",
    language: "Mathematics",
    nativeLabel: "Math",
    direction: "ltr",
    file: "mathematics.md",
    icon: "sigma",
    blurb:
      "Symbols and regional digit variants, 2-D structures (fractions, radicals, exponents), LaTeX conversion and structural rules.",
  },
];

const RESEARCH_DIR = path.join(process.cwd(), "research");

type ArticleRecord = {
  subject: string;
  title: string;
  language: string;
  nativeLabel: string;
  direction: "rtl" | "ltr";
  content: string;
  isCustom: boolean;
  version: number;
  updatedAt: string;
};

/** In-memory overlay used when the DB is not available (serverless fallback). */
const memArticles = new Map<string, ArticleRecord>();
let dbAvailable: boolean | null = null;

export function researchDirExists(): boolean {
  try {
    return fs.existsSync(RESEARCH_DIR);
  } catch {
    return false;
  }
}

export function readSeedArticle(file: string): string | null {
  try {
    return fs.readFileSync(path.join(RESEARCH_DIR, file), "utf-8");
  } catch {
    return null;
  }
}

async function getDb() {
  try {
    const { db } = await import("@/lib/db");
    return db;
  } catch {
    return null;
  }
}

async function checkDb(): Promise<boolean> {
  if (dbAvailable !== null) return dbAvailable;
  try {
    const db = await getDb();
    if (!db) throw new Error("no db");
    await db.researchArticle.findFirst();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

function seedRecordFromMeta(meta: SubjectMeta, content: string): ArticleRecord {
  return {
    subject: meta.subject,
    title: meta.title,
    language: meta.language,
    nativeLabel: meta.nativeLabel,
    direction: meta.direction,
    content,
    isCustom: !!meta.custom,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureSeeded(): Promise<void> {
  const db = (await checkDb()) ? await getDb() : null;
  for (const meta of SEED_SUBJECTS) {
    if (db) {
      const existing = await db.researchArticle.findUnique({ where: { subject: meta.subject } });
      if (!existing) {
        const content = readSeedArticle(meta.file || "") ?? `# ${meta.title}\n\n(Seed article missing)`;
        await db.researchArticle.create({
          data: {
            subject: meta.subject,
            title: meta.title,
            language: `${meta.language} (${meta.nativeLabel})`,
            direction: meta.direction,
            content,
            isCustom: false,
          },
        });
      }
    } else if (!memArticles.has(meta.subject)) {
      const content = readSeedArticle(meta.file || "");
      if (content) memArticles.set(meta.subject, seedRecordFromMeta(meta, content));
    }
  }
}

export async function listArticles(): Promise<
  Array<
    SubjectMeta & {
      wordCount: number;
      version: number;
      updatedAt: string;
      custom: boolean;
      editable: boolean;
    }
  >
> {
  await ensureSeeded();
  const db = (await checkDb()) ? await getDb() : null;
  const out: Array<
    SubjectMeta & {
      wordCount: number;
      version: number;
      updatedAt: string;
      custom: boolean;
      editable: boolean;
    }
  > = [];

  if (db) {
    const rows = await db.researchArticle.findMany({ orderBy: { createdAt: "asc" } });
    for (const row of rows) {
      const seed = SEED_SUBJECTS.find((s) => s.subject === row.subject);
      out.push({
        subject: row.subject,
        title: row.title,
        language: seed?.language ?? row.language.split(" (")[0],
        nativeLabel: seed?.nativeLabel ?? "",
        direction: (row.direction as "rtl" | "ltr") || "ltr",
        icon: seed?.icon ?? "book",
        blurb: seed?.blurb ?? "Custom research article.",
        wordCount: row.content.split(/\s+/).filter(Boolean).length,
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
        custom: row.isCustom,
        editable: true,
      });
    }
    return out;
  }

  for (const meta of SEED_SUBJECTS) {
    const rec = memArticles.get(meta.subject);
    if (!rec) continue;
    out.push({
      ...meta,
      wordCount: rec.content.split(/\s+/).filter(Boolean).length,
      version: rec.version,
      updatedAt: rec.updatedAt,
      custom: rec.isCustom,
      editable: true,
    });
  }
  for (const rec of memArticles.values()) {
    if (SEED_SUBJECTS.some((s) => s.subject === rec.subject)) continue;
    out.push({
      subject: rec.subject,
      title: rec.title,
      language: rec.language,
      nativeLabel: rec.nativeLabel,
      direction: rec.direction,
      icon: "book",
      blurb: "Custom research article.",
      wordCount: rec.content.split(/\s+/).filter(Boolean).length,
      version: rec.version,
      updatedAt: rec.updatedAt,
      custom: true,
      editable: true,
    });
  }
  return out;
}

export async function getArticle(
  subject: string,
): Promise<
  (SubjectMeta & {
    content: string;
    version: number;
    updatedAt: string;
    wordCount: number;
    custom: boolean;
    editable: boolean;
  }) | null
> {
  await ensureSeeded();
  const db = (await checkDb()) ? await getDb() : null;
  const wordCountOf = (c: string) => c.split(/\s+/).filter(Boolean).length;
  if (db) {
    const row = await db.researchArticle.findUnique({ where: { subject } });
    if (!row) return null;
    const seed = SEED_SUBJECTS.find((s) => s.subject === subject);
    return {
      subject: row.subject,
      title: row.title,
      language: seed?.language ?? row.language.split(" (")[0],
      nativeLabel: seed?.nativeLabel ?? row.language.match(/\(([^)]+)\)/)?.[1] ?? "",
      direction: (row.direction as "rtl" | "ltr") || "ltr",
      icon: seed?.icon ?? "book",
      blurb: seed?.blurb ?? "Custom research article.",
      content: row.content,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      wordCount: wordCountOf(row.content),
      custom: row.isCustom,
      editable: true,
    };
  }
  const rec = memArticles.get(subject);
  if (!rec) return null;
  const seed = SEED_SUBJECTS.find((s) => s.subject === subject);
  return {
    subject: rec.subject,
    title: rec.title,
    language: seed?.language ?? rec.language,
    nativeLabel: seed?.nativeLabel ?? rec.nativeLabel,
    direction: rec.direction,
    icon: seed?.icon ?? "book",
    blurb: seed?.blurb ?? "Custom research article.",
    content: rec.content,
    version: rec.version,
    updatedAt: rec.updatedAt,
    wordCount: wordCountOf(rec.content),
    custom: rec.isCustom,
    editable: true,
  };
}

export async function upsertArticle(input: {
  subject: string;
  title: string;
  language: string;
  direction: "rtl" | "ltr";
  content: string;
  isCustom: boolean;
}): Promise<void> {
  const db = (await checkDb()) ? await getDb() : null;
  if (db) {
    const existing = await db.researchArticle.findUnique({ where: { subject: input.subject } });
    if (existing) {
      await db.researchArticle.update({
        where: { subject: input.subject },
        data: {
          title: input.title,
          language: input.language,
          direction: input.direction,
          content: input.content,
          version: { increment: 1 },
        },
      });
    } else {
      await db.researchArticle.create({
        data: {
          subject: input.subject,
          title: input.title,
          language: input.language,
          direction: input.direction,
          content: input.content,
          isCustom: input.isCustom,
        },
      });
    }
    return;
  }
  const prev = memArticles.get(input.subject);
  memArticles.set(input.subject, {
    subject: input.subject,
    title: input.title,
    language: input.language,
    nativeLabel: "",
    direction: input.direction,
    content: input.content,
    isCustom: input.isCustom,
    version: (prev?.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  });
}
