# Sonar Docs

**Research-driven handwritten notes OCR → verified transcription → AI document studio.**

Photograph handwritten notes in **Sindhi, Urdu, English, or Mathematics**. A deep-research dossier for the chosen subject is loaded into the AI's system prompt, python (OpenCV) deskews the page and cuts focused, enhanced crops of every text line, the AI reads each crop line-by-line with the dossier's confusion atlas and script rules, **you check and correct every line**, and then the document AI writes a clean, structured digital document you can edit and export (Word / Markdown / text / print-to-PDF).

```
page photo ──▶ python analyze ──▶ AI layout pass ──▶ python crop & focus ──▶ AI focused OCR
 (upload)      deskew + rows      (dossier in        per-band enhanced       (dossier in system
               + overlay          system prompt)      crops, upscaled         prompt + alternatives)
                                                                          │
                ┌─────────────────────────────────────────────────────────┘
                ▼
        VERIFY (you correct every line) ──▶ DOCUMENT AI (write & format) ──▶ EXPORT
                                          RTL-aware, KaTeX math, blocks    .docx / .md / .txt / PDF
```

## Why it works differently

- **Subject research dossiers** — each subject has a long, source-researched article (script reference, positional letter forms, visual confusion atlas, OCR workflow stages A–F, uncertainty conventions). When you pick a subject, the dossier is injected into the vision model's system prompt and the model is explicitly instructed to apply it.
- **Python crop-and-focus** — OpenCV finds the paper in the photo, deskews it, detects fine text rows, and renders a numbered overlay. After the AI's layout pass, each band is cropped, contrast-enhanced (CLAHE + percentile stretch + unsharp), and upscaled 3–4× before the focused read, so the model sees actual strokes instead of a shrunk page.
- **Deterministic geometry** — python's ink-detected rows define band geometry and reading order; the model contributes semantics (heading / list / equation / ignore). The model's pixel coordinates are never trusted directly.
- **Human verification is mandatory** — the transcription only becomes a document after you approve or correct each line. Confidence badges (high / medium / low / illegible), alternative readings, and the enhanced crop thumbnail are shown per line; a deeper-zoom re-read is one click.
- **Document AI** — builds a structured document (title, headings, paragraphs, lists, quotes, notes, math blocks) from your verified text only. It may fix spacing and structure, never facts. Fully editable block editor with live RTL-aware paper preview (Noto Nastaliq for Urdu, Lateef for Sindhi, KaTeX for math).
- **Storage** — dossiers live in the database (editable in the Research Library, versioned); you can paste your own master prompt to create custom subjects (e.g. Pashto, Punjabi).

## The research dossiers

| Subject | Words | Highlights |
|---|---|---|
| Sindhi | ~2,500 | 52-letter inventory, aspirates/retroflexes/implosives, dot logic, Nastaliq/Naskh handwriting, confusion atlas, stages A–F protocol, `[غير واضح]` / `[لفظ؟]` / `[مطموس]` uncertainty markers |
| Urdu | ~8,500 | Nastaliq diagonal cascades and word stacking, 38–39 letter inventory, aspirate digraphs, final ye/ے stroke geometry, hamza-as-two-dots traps, 15+ confusion groups, sourced from W3C, Zero Zabar, UNC, OCR papers |
| English | ~8,100 | Cursive/print/printscript allographs, school style families (Palmer, Zaner-Bloser, D'Nealian…), the minim problem, letter-confusion atlas, note-taking shorthand, IAM/CER facts |
| Mathematics | ~8,300 | Handwritten symbol & regional digit variants, 2-D structures (fractions, radicals, exponents, matrices), CROHME background, LaTeX output rules, √/✓ and 30+ confusion pairs |

All articles are stored as editable data and are injected verbatim into the OCR system prompts.

## Run locally

```bash
bun install
bun run db:push     # create the SQLite schema
bun run dev         # http://localhost:3000
```

Optional environment (`.env`):

```
DATABASE_URL=file:./db/custom.db
# For deployments where /etc/.z-ai-config does not exist:
ZAI_BASE_URL=
ZAI_API_KEY=
# python override for the OCR image tools (OpenCV + numpy required):
SONAR_PYTHON=/path/to/python3
```

Python image tools (`python-tools/ocr_prep.py`) use OpenCV + numpy. If python is unavailable, the app automatically falls back to `sharp` for crops and lets the AI detect all bands itself.

## Architecture

```
src/app/api/
  research/            GET list / GET one / POST create / PUT edit  (dossier storage)
  ocr/start/           python page analysis (deskew, rows, overlay) + session/page records
  ocr/layout/          VLM layout pass with dossier + reconcileBands() against python rows
  ocr/read/            python crop&focus per band (4 per request) + VLM focused read
  ocr/retry-line/      deeper zoom (5×) re-read of one band
  ocr/review/          save user verification (the mandatory human check)
  session/             session + pages + lines + documents
  document/            document AI (generate / save edits / load)
  document/export/     .docx (RTL-aware, bullet lists, math) / .md / .txt
src/lib/
  subjects.ts          dossier storage: seed files → SQLite, with memory fallback
  ocr-prompts.ts       research-informed system prompts (layout + read passes)
  doc-prompts.ts       document AI prompts (subject-aware, RTL + LaTeX rules)
  imagetools.ts        python-first image ops with sharp fallback
  zai.ts               vision/LLM client: JSON repair, retry-feedback, 429 backoff
python-tools/
  ocr_prep.py          analyze (page region, deskew, CC-cleaned row runs, overlay)
                       + crop (pad, enhance, upscale, ink ratio) + ping
research/              the four seed dossiers (markdown)
src/components/sonar/  4-step wizard UI + Research Library (zustand + shadcn/ui)
```

### Key pipeline decisions

- **VLM JSON is never trusted blind** — the model frequently mangles JSON (shorthand boxes `{"x":1,2,3,4}`, nested `box.box`, LaTeX backslashes breaking string escapes, mixed brackets). Responses are repaired, then retried with feedback, then recovered by a loose band scanner.
- **Reading order is sacred** — bands are ordered by python row geometry top-to-bottom; the document AI receives `[page N, line M]` provenance for every verified line.
- **Math gets dual output** — every math band is transcribed both as faithful Unicode text and as LaTeX (`\frac{12}{2}`, `\sum_{i=1}^{n}`), rendered with KaTeX in the verify and studio screens and exported in `.docx`/`.md`.
- **No silent corrections** — diplomatic transcription is preserved; normalization happens only in the separate document layer; uncertain spans keep their markers as visible notes.

## Deploy to Vercel

```bash
vercel --prod
```

Notes for serverless:
- Set `ZAI_BASE_URL` and `ZAI_API_KEY` env vars (a compatible chat-completions + vision endpoint).
- SQLite is bootstrapped automatically on cold start (`db/bootstrap.sql`); sessions are ephemeral per instance — fine for a demo, use Postgres for persistence.
- Without python, the sharp fallback keeps the pipeline running (AI-driven band detection).

## Quality checks

```bash
bun run lint        # eslint (clean)
bunx tsc --noEmit   # typescript (clean)
```
