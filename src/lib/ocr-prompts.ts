import type { SubjectMeta } from "@/lib/subjects";

/**
 * OCR prompt construction.
 *
 * The user's core requirement: when a subject is selected, its research
 * article is loaded into the AI's system prompt, and the AI is explicitly
 * told to use that article to perform the handwriting OCR.
 */

export type SubjectInfo = Pick<SubjectMeta, "subject" | "language" | "nativeLabel" | "direction">;

function subjectLine(s: SubjectInfo): string {
  return `Subject: ${s.language}${s.nativeLabel ? ` (${s.nativeLabel})` : ""} — script direction: ${s.direction === "rtl" ? "right-to-left" : "left-to-right"}.`;
}

const RESEARCH_HEADER = `You are Sonar OCR, a specialist handwriting-recognition engine. You have been trained by the following deep-research dossier on this exact subject. You MUST apply its letter tables, positional-form rules, dot/nuqta evidence rules, visual confusion atlas, disambiguation workflow (Stages A–F) and quality-control rules to every reading below. When the article and your general knowledge disagree, the article wins.`;

const RESEARCH_FOOTER = `--- END OF RESEARCH DOSSIER ---
The dossier above is your primary reference. Use its confusion atlas whenever two readings are visually close, use its positional-form tables to check joining behaviour, and use its linguistic rules only AFTER examining the visual evidence.`;

/** System prompt for the layout pass (Stage A + B). */
export function buildLayoutSystemPrompt(article: string, subject: SubjectInfo): string {
  return `${RESEARCH_HEADER}

${subjectLine(subject)}

# RESEARCH DOSSIER — ${subject.language} HANDWRITING & OCR

${article}

${RESEARCH_FOOTER}

# YOUR TASK IN THIS PASS: LAYOUT & LINE DETECTION (Stages A and B of the dossier workflow)

You are given a photograph/scan of ONE handwritten page. ${
    subject.direction === "rtl"
      ? "The text is written right-to-left; lines read from the right edge toward the left."
      : "The text reads left-to-right."
  } Apply the dossier's Stage A (image inspection) and Stage B (layout and line detection) guidance:
- Separate genuine text bands from diagrams, margins, stains, ruling lines and decorations.
- Preserve the true top-to-bottom order of text lines.
- Never merge adjacent lines and never split a single word into multiple bands.
- Note headings vs body text vs list items where the layout makes it clear.
${
  subject.subject === "urdu" || subject.subject === "sindhi"
    ? "- Beware Nastaliq-style diagonal stacking: a single line cascades from upper-right to lower-left; vertical gaps between stacked words of the SAME line are NOT new lines."
    : ""
}
${
  subject.subject === "mathematics"
    ? "- Equations may span two visual rows (fractions, radicals, summation limits). A fraction with numerator and denominator is ONE band, not two."
    : ""
}

Respond with ONLY a JSON object (no markdown, no prose) shaped exactly like:

{"bands":[{"box":{"x":0,"y":0,"w":0,"h":0},"kind":"text|heading|list|math|ignore","preliminary":"","needsZoom":false,"reason":""}]}

CRITICAL FORMAT RULES for "box": it MUST be a JSON object with EXACTLY the four named integer keys "x", "y", "w", "h" — like {"box":{"x":54,"y":176,"w":680,"h":40}}. NEVER write bare comma-separated numbers ({"x":54,176,680,40} is INVALID) and never use an array. Double-check every box has all four keys before answering.

Rules for the JSON:
- "box" uses integer pixel coordinates in the coordinate space of the image you are shown (origin top-left, x right, y down). Each box must tightly enclose one full text band with a little margin.
- Order the bands top-to-bottom as they must be read.
- "kind": "heading" for titles/section heads, "list" for bulleted/numbered items, "math" for equations (mathematics subject), "ignore" for non-text regions (figures, stains, page edges, ruled lines without writing).
- "preliminary": your best quick reading of the band (it will be re-read from a zoomed crop later, so keep it short; empty string if unreadable at this scale).
- "needsZoom": true when the band is small, dense, or visually ambiguous enough that a zoomed crop is essential.
- "reason": one short sentence of layout evidence for tricky decisions (may be empty).
- If the image contains no handwriting at all, return {"bands":[]}.`;
}

/** System prompt for the focused read pass (Stages C–F). */
export function buildReadSystemPrompt(article: string, subject: SubjectInfo): string {
  return `${RESEARCH_HEADER}

${subjectLine(subject)}

# RESEARCH DOSSIER — ${subject.language} HANDWRITING & OCR

${article}

${RESEARCH_FOOTER}

# YOUR TASK IN THIS PASS: FOCUSED HANDWRITING OCR (Stages C, D, E and F of the dossier workflow)

You are shown zoomed, contrast-enhanced crops of individual text bands from one handwritten ${
    subject.language
  } page. Each image in this message is one band, presented in order and labelled. For EACH band, apply the dossier:
- Stage C (character-level analysis): read in the correct direction (${
    subject.direction === "rtl" ? "right-to-left" : "left-to-right"
  }); use positional forms and joining behaviour; check every dot/nuqta/crossbar before deciding a letter.
- Stage D (linguistic disambiguation): only AFTER visual analysis, weigh vocabulary, morphology and context — visual evidence stays primary.
- Stage E (independent reassessment): if a band is ambiguous, form a second independent reading and compare before deciding.
- Stage F (confidence): judge each band honestly.

Transcribe DIPLOMATICALLY — what is actually written, including the writer's spelling, abbreviations and crossed-out words. Never silently correct, never invent text, never guess beyond the visible strokes. Use the dossier's uncertainty markers inside the transcription when needed (${
    subject.subject === "sindhi" || subject.subject === "urdu"
      ? "`[غير واضح]` unreadable span, `[لفظ؟]` tentative reading, `[مطموس]` obscured text"
      : subject.subject === "mathematics"
        ? "`[?]` unreadable symbol, `[symbol?]` tentative reading, `[obscured]` obscured span"
        : "`[unreadable]` unreadable span, `[word?]` tentative reading, `[obscured]` obscured text"
  }).

Respond with ONLY a JSON object (no markdown, no prose) shaped exactly like:

{"readings":[{"index":0,"kind":"text|heading|list|math|ignore","text":"","latex":"","confidence":"high|medium|low|illegible","alternatives":[{"text":"","note":""}],"notes":""}]}

Rules for the JSON:
- One entry per crop image, in the same order, "index" matches the band index you are given.
- "text": the diplomatic transcription (empty string only if truly nothing legible).
${
  subject.subject === "mathematics"
    ? `- "latex": a faithful LaTeX rendering of the SAME band (e.g. "\\\\frac{a}{b}", "x^{2}+1", "\\\\sum_{i=1}^{n} i"), preserving the writer's actual math (do not fix errors); empty string for non-math bands. IMPORTANT: inside JSON strings every LaTeX backslash must be escaped — write "\\\\frac" (four chars in your output) so it decodes to "\\frac".`
    : `- "latex": empty string (not used for this subject).`
}
- "confidence": "high" = shapes and context agree; "medium" = likely but a detail is uncertain; "low" = multiple readings plausible; "illegible" = image does not support a defensible reading.
- "alternatives": plausible rival readings with a short visual reason (empty array if none).
- "notes": one short sentence of stroke/dot evidence for low-confidence calls (may be empty).
- Preserve the writer's language exactly. Do NOT translate. Do NOT normalise spelling.`;
}

/** User prompt for the layout pass. */
export function buildLayoutUserPrompt(subject: SubjectInfo, candidateCount: number): string {
  return `Handwritten ${subject.language} page for layout analysis.${
    candidateCount > 0
      ? ` A python/OpenCV preprocessor has already drawn numbered green boxes over ${candidateCount} candidate text bands on the image (labels sit at each band's top-left). Validate, correct, merge or extend them: keep boxes that truly contain text, fix boxes that cut through a line, add missed bands, and mark non-text boxes as "ignore".`
      : " Detect every text band yourself."
  } Return the JSON bands array as specified.`;
}

/** User prompt for the read pass. */
export function buildReadUserPrompt(
  subject: SubjectInfo,
  batch: Array<{ index: number; preliminary?: string; kind?: string }>,
  context: string,
): string {
  const listing = batch
    .map(
      (b) =>
        `- Band ${b.index}${b.kind && b.kind !== "text" ? ` (layout says: ${b.kind})` : ""}`,
    )
    .join("\n");
  return `Read each of the ${batch.length} zoomed crop image(s) below. The crops are given in this order:

${listing}

${context ? `For continuity, the previously transcribed band(s) read:\n${context}\n` : ""}Apply the research dossier (confusion atlas, positional forms, dot evidence) to every letter. Trust ONLY the ink you actually see in each crop — never invent or borrow text from context. Return the JSON readings array as specified — one entry per crop, and each entry MUST carry the correct "index" of its band (the number given above), regardless of entry order.`;
}
