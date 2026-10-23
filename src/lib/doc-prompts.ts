import type { SubjectInfo } from "@/lib/ocr-prompts";

/**
 * Document creation / writing / formatting AI prompts.
 *
 * Takes the USER-VERIFIED transcription lines and produces a clean,
 * well-structured digital document as JSON blocks. Subject-aware:
 * RTL layout for Sindhi/Urdu, LaTeX blocks for mathematics, etc.
 */

export type DocBlock = {
  id: string;
  type: "title" | "subtitle" | "heading" | "paragraph" | "list-item" | "math" | "quote" | "note" | "divider";
  text: string;
  latex?: string;
  level?: number; // heading level 1-3
};

export type DocType = "transcript" | "formatted-notes" | "essay" | "study-sheet";

export const DOC_TYPES: Array<{ id: DocType; label: string; description: string }> = [
  {
    id: "transcript",
    label: "Clean Transcript",
    description: "Faithful, lightly cleaned transcription — preserves the writer's wording and order, fixes only spacing and line-joining.",
  },
  {
    id: "formatted-notes",
    label: "Formatted Notes",
    description: "Structured notes with a title, headings, paragraphs and lists — ideal for class notes and meeting notes.",
  },
  {
    id: "essay",
    label: "Essay / Prose",
    description: "Flows the content into readable prose paragraphs with a title and introduction — ideal for letters, drafts and essays.",
  },
  {
    id: "study-sheet",
    label: "Study Sheet",
    description: "Condensed revision sheet: key points as bullets, definitions emphasised, formulas set out clearly.",
  },
];

export function buildDocumentSystemPrompt(subject: SubjectInfo): string {
  const rtl = subject.direction === "rtl";
  return `You are Sonar Docs' document engine: an expert ${subject.language} editor, typesetter and document formatter. You receive a VERIFIED transcription of handwritten ${subject.language} pages (a human has already corrected OCR mistakes), plus the requested document type. You produce a beautifully structured digital document.

Hard rules:
1. PRESERVE MEANING — you may fix spacing, punctuation and obvious typos, and restructure for clarity, but you must never add facts, drop content, or change what the writer said. When the writer's spelling is clearly intentional or dialectal, keep it.
2. LANGUAGE — keep the document in the writer's language (${subject.language}). Do not translate unless the user's instructions explicitly ask for a translation.
3. ${rtl ? "RTL — the text is right-to-left; do not reorder words; keep natural " + subject.language + " punctuation and numerals as written." : "LTR layout."}
${
    subject.subject === "mathematics"
      ? "4. MATH — every equation becomes a \"math\" block with BOTH a faithful \"text\" form (unicode, readable inline) and a \"latex\" form (correct LaTeX, e.g. \\\\frac{a}{b}, x^{2}, \\\\sqrt{y}, \\\\sum_{i=1}^{n}). Preserve the writer's actual math — if they made an error, keep the error in the math block and mention the suspicion in a \"note\" block."
      : "4. MATH — if formulas appear, render them as a \"math\" block with \"latex\" filled in."
}
5. UNCERTAINTY — transcription fragments marked with brackets like [word?] / [unreadable] / [غير واضح] / [لفظ؟] are uncertain: keep them visible (as inline parenthetical or a \"note\" block) rather than deleting them.
6. STRUCTURE — infer headings from the handwriting's own structure (underlined lines, numbered sections, larger script). If no headings exist, create minimal ones that faithfully describe sections. Never fabricate content to fill sections.
7. OUTPUT — respond with ONLY a JSON object (no markdown fences, no prose): {"title": "...", "blocks": [...]}.

Block types (use exactly these):
- {"type":"title","text":"..."} — document title (exactly one, first block).
- {"type":"subtitle","text":"..."} — optional subtitle/date line.
- {"type":"heading","text":"...","level":1|2|3} — section heading.
- {"type":"paragraph","text":"..."} — prose paragraph.
- {"type":"list-item","text":"..."} — one bullet item (consecutive list-items stack into one list).
- {"type":"math","text":"unicode form","latex":"LaTeX form"} — one equation.
- {"type":"quote","text":"..."} — a striking sentence quoted from the original.
- {"type":"note","text":"..."} — editorial note (e.g. transcription uncertainty, suspected writer error).
- {"type":"divider","text":""} — thematic break.

Every block needs a unique "id": "b1", "b2", ... Keep paragraphs reasonably short. Do not include markdown syntax inside "text" (plain text only).`;
}

export function buildDocumentUserPrompt(params: {
  subject: SubjectInfo;
  docType: DocType;
  title: string;
  instructions: string;
  lines: Array<{ pageIndex: number; order: number; kind: string; text: string; latex?: string | null; status: string }>;
}): string {
  const { subject, docType, title, instructions, lines } = params;
  const typeBrief: Record<DocType, string> = {
    transcript:
      "CLEAN TRANSCRIPT: preserve the writer's order and wording almost exactly; join broken lines into paragraphs where clearly continuous; add a title (use the page's own heading if present); fix spacing/punctuation only; no restructuring.",
    "formatted-notes":
      "FORMATTED NOTES: create a clear title, group the content into headed sections following the writer's own structure, turn enumerations into list-items, keep paragraphs tight, keep all substantive content.",
    essay:
      "ESSAY / PROSE: flow the content into well-formed paragraphs with a title and (if the content supports it) an introduction and conclusion; smooth transitions between the writer's points without adding new claims.",
    "study-sheet":
      "STUDY SHEET: condense to revision form — title, key definitions as emphasised short paragraphs or quotes, main points as list-items, all formulas as math blocks; keep every formula, name and number.",
  };

  const linesText = lines
    .map(
      (l) =>
        `[page ${l.pageIndex + 1}, line ${l.order + 1}${l.kind !== "text" ? `, ${l.kind}` : ""}${
          l.status === "flagged" ? ", FLAGGED UNREADABLE" : ""
        }] ${l.latex ? `${l.text}  (LaTeX: ${l.latex})` : l.text}`,
    )
    .join("\n");

  return `Document type: ${typeBrief[docType]}

Subject: ${subject.language} (${subject.direction === "rtl" ? "RTL script" : "LTR script"})
${title ? `Suggested title: ${title}` : "Suggest a concise, faithful title."}
${instructions ? `User instructions: ${instructions}` : ""}

VERIFIED TRANSCRIPTION (page/line provenance in brackets; [FLAGGED UNREADABLE] lines were illegible — represent them as notes):

${linesText}

Produce the document as the specified JSON object now.`;
}
