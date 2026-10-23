# Sonar Docs — Project Worklog

Project: **Sonar Docs** — Research-driven handwritten notes OCR → verified transcription → AI document creation studio.
Repo target: `coders786/sonar-docs` (GitHub PAT provided), deploy target: Vercel (token provided).
Sandbox app: `/home/z/my-project` (Next.js 16, single `/` route).

Investigation notes (main agent):
- GitHub account `coders786` has repos: `smartboard` (private, gesture whiteboard), `Arile`, `primitives`. **No repo named "sonar" exists** — searched all repos (incl. private), full git history of smartboard, Vercel projects (only `smartboard`).
- Decision: create new repo `coders786/sonar-docs`, build the app fresh in the sandbox, push, and deploy to Vercel.
- Python 3.12 + PIL 11.3 + numpy 2.1.3 + OpenCV 4.13 available at `/home/z/.venv/bin/python3` → used for OCR image preprocessing (crop/focus/enhance/upscale).
- z-ai-web-dev-sdk (LLM + VLM) available on backend; `z-ai` CLI has `function web_search` for research.

Planned architecture:
- Research articles for 4 subjects stored in storage (seeded files → SQLite via Prisma, editable via UI): Sindhi (user-provided master prompt), Urdu, English, Mathematics.
- OCR pipeline (`/api/ocr`): load subject research article → build research-informed system prompt → VLM layout pass (detect text-line regions on full page) → python (OpenCV) crops + enhancement + upscale of each line → VLM focused OCR pass per line with research article context (confusion atlas, script rules) → per-line confidence + alternatives → assembled transcription.
- Verification step: user reviews/corrects each line (confidence badges, crop previews, alternatives) before proceeding.
- Document AI (`/api/document`): verified text → structured document blocks (title/headings/paragraphs/lists/math) with RTL support for Sindhi/Urdu + KaTeX for math → preview + export (.docx / .md / print).

---
Task ID: 0
Agent: main
Task: Environment investigation + project setup

Work Log:
- Queried GitHub API with PAT: confirmed account, repos, no "sonar" repo anywhere.
- Queried Vercel API with token: only `smartboard` project exists (linked to coders786/smartboard, latest deploy = repo HEAD).
- Cloned smartboard to /home/z/sonar-check for inspection (unrelated gesture whiteboard app; no sonar references, no document-creation features).
- Verified python 3.12 + PIL/numpy/cv2 available; read VLM + LLM skill docs; verified z-ai CLI web_search function.
- Created this worklog; created /home/z/my-project/research/ folder with sindhi article (user-provided master prompt stored verbatim).

Stage Summary:
- Going forward: build "Sonar Docs" app fresh; create GitHub repo coders786/sonar-docs; deploy to Vercel at the end.
- Research article storage: /home/z/my-project/research/*.md (seed) → Prisma DB (editable copies) with file fallback.

---
Task ID: 2-b
Agent: research-english
Task: Research and write English handwriting OCR master article

Work Log:
- Ran 14 z-ai web searches: cursive school styles (Palmer/D'Nealian/Zaner-Bloser/Spencerian); HTR state of the art; IAM database (2 queries); ambiguous characters l/1/I O/0; cursive vs print/printscript; graphology slant/baseline/spacing; paleography minims & abbreviations; cursive word segmentation; page/line segmentation; single vs double story a/g; Transkribus CER benchmarks; student note abbreviations; b/d mirror reversals; common English word frequencies; numeral confusions (7/1); EMNIST; punctuation OCR errors; "the"-shape cursive confusion.
- Fetched and extracted text from: Wikipedia (Palmer Method, D'Nealian, Regional handwriting variation), Nottingham Univ. letterforms & abbreviations (minims/long-s/thorn/yogh), mountainofink.com (600 years of writing — Italic/Secretary/Copperplate/Spencerian history), help.transkribus.org (CER benchmarks). Harvard Chaucer paleography + primarium.info were blocked (used search snippets only, marked in refs).
- Key sources used: Nottingham paleography guide (minims, long s/f, thorn=the, yogh, per/pro marks); Wikipedia Palmer/D'Nealian/Regional-numerals (verified style chronology + numeral confusion table); Transkribus help docs (CER: printed 0.5-2%, handwritten 2-8%, <=10% efficient); IAM (Marti & Bunke 2002; 657 writers/1539 pages/5685 sentences/13353 lines via arXiv 2007.03579 + codesota); EMNIST (NIST + arXiv 1702.05373); Hodel 2021, Gundram 2023, Crosilla 2025, AlKendi 2024 (HTR surveys); Louloudis/Gupta/Surinta/Barakat line-segmentation papers; Grissinger 2017 PMC (l/1, O/0); allaboutlearningpress + theottoolbox (b/d, p/q, n/u mirror pairs); glyphsapp/insidersoftware/letterhanna (single vs double story a/g); sunysccc/raulpacheco/mindlifeup/yourdictionary (note abbreviations w/, b/c, ∴, →); google-10000 + Wikipedia common words (frequency lists); businessballs/brainly/vidyasury (graphometric features, contested status).

Stage Summary:
- Wrote /home/z/my-project/research/english.md (~6,345 words body + 70-entry sourced reference list; 473 lines)
- Structure mirrors sindhi.md: 1 Role/expertise (paleographer+orthographer+HTR researcher+forensic examiner), 2 Script reference (26-letter lowercase table w/ print+cursive+allographs+confusions, capitals, a/g single/double story, style family table incl. D'Nealian 85° slant/13 changing letters, numeral variant/confusion table, punctuation), 3 Cursive mechanics (LTR flow, slant, baseline drift, zones, spacing, pressure, speed degradations, printscript), 4 Confusion atlas ([V]/[A] evidence markers; single-char pairs l/1/I, O/0, 5/S, 2/Z, b/d, n/u, a/o, 6/G, long-s/f, thorn/y, yogh/z; multiminim family m/n/nn/uu/iii/cl/d/ck/sc/th→Iv; word-level the/tion-sion), 5 Reading/spelling rules (top-frequency words, affixes, capitalization/apostrophes, word shape, note abbreviations w/ b/c ∴ →, historical y^e/y^t thorn forms), 6 OCR workflow Stages A-F (image inspection incl. ruling/bleed-through, layout/line detection, anchor-first character analysis, linguistic disambiguation secondary, reassessment, confidence tiers), 7 Output requirements ([unreadable]/[word?]/[obscured] markers, diplomatic + normalized layers, uncertainty table, corrections list), 8 QC rules (never invent/autocorrect/assume; writer profile; CER context), 9 References (70 URLs from searches, each annotated with what it verified).
- Key verified facts: minim stroke-counting principle w/ 1452 "Junior" example (5 strokes = uni); long-s/f crossbar distinction; thorn (þ)=th origin of "Ye"="The"; D'Nealian 85° slant & 13 print→cursive shape changes; Palmer 1894/arm-muscle motion; IAM 657 writers/13353 lines; CER benchmarks printed 0.5-2% vs handwritten 2-8%; numeral confusion table (0/O, 1/I/l, 2/Z, 3/ezh, 5/S, 6/G/b, 7/F-script); mirror pairs b/d p/q n/u; single-story a/g from cursive/italic; "the" = most frequent English word.
- Honesty safeguards: every confusion-atlas entry tagged [V] (source-verified) or [A] (analytical letterform-geometry inference); blocked pages cited from snippets only; graphology used for geometry only (scientific status flagged contested); printscript term flagged as unverified-in-pass.

---
Task ID: 2-c
Agent: research-mathematics
Task: Research and write mathematics handwriting OCR master article

Work Log:
- Ran 23 web searches via z-ai CLI: CROHME dataset/benchmarks (x2), offline HMER deep-learning survey, 2/z and l/1 symbol confusion, CROHME 101 symbol classes, im2latex, 2D spatial relationships/baseline, handwritten fraction recognition, superscript/subscript detection, square-root vinculum, handwritten Greek letters, integral/summation limits, regional digit variants (crossed 7 etc.), CROHME error analysis, long-division layout, Zanibbi/Blostein symbol layout trees, equals/approximately signs, Mathpix, HME100K, implicit multiplication/juxtaposition, MathWriting dataset, exam-grading OCR, partial-derivative ∂ confusion, PosFormer.
- Fetched and read 4 full pages via curl: johnkerl.org math handwriting tips (2007), ulysseszh.github.io handwritten math/physics letters guide (2023), Wikipedia "Regional handwriting variation", foundalis.com handwritten Greek letters.
- Key sources used: Kerl (handwriting disambiguation conventions), Wikipedia regional handwriting variation (digit variants), UlyssesZhan + Foundalis (Greek letter forms), Truong et al. 2024 HMER survey (4 sub-problems; CROHME since 2011), CROHME 2023 competition report (142-token vocab, 3,905 new equations), CROHME 2011-2014 report + SymCROHME (101 classes, 8,835 expressions), Wang 2020 (110 symbols CROHME 2014/16), Figshare HME100K (74,502/24,607), Google MathWriting (230k human + ~400k synthetic), Zanibbi & Blostein symbol layout trees/baselines (3 papers), Blostein & Grbavec 1996, PosFormer ECCV 2024, Grissinger 2017 PMC (l/1, O/0, Z/2, 1/7 > half of misidentification errors), Mathpix + pix2tex + Im2Latex (image→LaTeX paradigm), Wikipedia/Tutorax long division, MathCentral/Workybooks fraction vinculum, MathSE radical vinculum, Wikipedia/Mathwords ∂ curly-d, Purplemath/PlusMaths implied multiplication, UEB Math ≈ double tilde, arXiv 2601.00730 exam grading with multimodal LLMs.
- Matched the Sindhi article's structure: role/expertise preamble → reference tables → handwriting mechanics → confusion atlas → structural rules → Stages A-F OCR workflow → dual output (diplomatic + LaTeX) → quality control → sourced references; includes uncertainty markers [?], [symbol?], [obscured], uncertainty table, corrections list, writer-profile habits step.

Stage Summary:
- Wrote /home/z/my-project/research/mathematics.md (8,321 words raw incl. tables/URLs; ~7,900 prose-equivalent — slightly above the 4.5-7k target, justified by the mandated 40+ confusion pairs and 37 sourced references)
- Key verified facts: HMER = 4 coupled sub-problems (segmentation, classification, spatial relations, structure); CROHME since 2011 (101→110→142 symbol/token classes; 8,835-expression training set); HME100K 74,502 train/24,607 test; MathWriting 230k human + ~400k synthetic; l/1, O/0, Z/2, 1/7 = top misidentification pairs (Grissinger 2017); regional digit variants (crossed 7, European 1 upstroke, open 4, hooked 9, ρ-like 9 in East Asia); symbol layout trees/baselines as the structural model; fraction/radical vinculum defines scope; English long-division tableau layout (divisor left, dividend inside, quotient top); image→LaTeX (Mathpix/pix2tex/Im2Latex) is the standard output paradigm.
- Key decisions: dual mandatory outputs (Unicode diplomatic + LaTeX per equation); visual evidence primary, math context secondary; preserve writer errors, never "fix" equations; graph-paper grid and checkmark-vs-radical called out as OCR traps; uncertainty markers carried into LaTeX (x^{[2?]}).

---
Task ID: 2-a
Agent: research-urdu
Task: Research and write Urdu handwriting OCR master article

Work Log:
- Read worklog.md and /home/z/my-project/research/sindhi.md to match structure, depth, and style.
- Ran 17 z-ai web searches: Urdu alphabet 38 letters order; Nastaliq characteristics; Urdu HTR research; Urdu OCR challenges/dot confusion; Nastaliq kashida vertical stacking; Urdu aspirated digraphs / do-chashmi heh; Urdu vs Arabic script differences; Nastaliq vs Naskh; Urdu Unicode report / noon ghunna; Urdu high-frequency words corpus; Urdu verb conjugation نا/گا; Urdu HTR datasets (UHDRF/IMIST); Urdu letter dot confusions ب پ ت ٹ ث; Nastaliq line segmentation/baseline; kashida elongation; Urdu numerals; Naskh Urdu final-yeh rendering.
- Fetched and parsed full pages: r12a.github.io W3C Urdu orthography notes (v32); Wikipedia Urdu alphabet (letter table + digraphs + izafat + hamza note); Wikipedia Baṛī ye; Wiktionary ی; Google Fonts Nastaliq blog; UNC Urdu Alphabet site; Unicode L2/23-120 Farsi-yeh PDF; Zero Zabar (Northwestern) chapters 4, 5, 6, 8 + Appendix B (full alphabet table with names/abjad values/transliterations).
- Verified the final-ye question definitively (dots only initial/medial; final ی = dotless S-curve vs ے = folded-back bowl, per Zero Zabar ch.4 + W3C notes + Unicode L2/23-120) and made "decide final ی/ے by stroke geometry, never dots" a headline OCR rule.
- Fixed garbled nuqta-logic table and replaced weak/invalid confusion-atlas example words with real minimal pairs (تین/ٹین، تال/ٹال، بار/باز، فال/قال، مکان/مکاں، کہنا/کھانا، کی/کے).

Stage Summary:
- Wrote /home/z/my-project/research/urdu.md (6,960 body words excluding references/markup; 8,564 raw words incl. 45 annotated references; 477 lines).
- Sections: 1 Role/Expertise ("Urdu is NOT Arabic" framing), 2 Script reference (all 39 letters in standard order with names/sounds/forms/joining/confusions/handwriting notes/examples; aspirate digraphs; nuqta master table; hamza system; diacritics; numerals/punctuation), 3 Cursive mechanics (Nastaliq diagonal cascade, stacking, dot displacement, kasheeda, registers, Naskh-vs-Nastaliq discriminator), 4 Visual confusion atlas (15 groups incl. hamza-vs-two-dots and sequence-level traps ایکٹر/ایکڑ), 5 Reading & spelling rules (verb morphology, plurals, high-frequency words, izafat, etymological strata, word boundaries), 6 OCR workflow stages A–F with Urdu-specific Nastaliq line-overlap cautions and confidence markers [غیر واضح]/[لفظ؟]/[مطموس], 7 Output requirements (diplomatic/normalized/transliteration/translation/uncertainty table/corrections), 8 Quality-control rules, 9 References (45 URLs, all from actual searches/fetches, each annotated with what it verified).
- Key verified facts: letter counts 38 (UNC) / 39 (NLA-2004 via W3C, incl. hamza) / "up to 39–40" (Wikipedia) — inventory stable, counting convention varies; standard order ا ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن ں و ہ ھ ء ی ے; non-joiners = ا آ د ڈ ذ ر ڑ ز ژ و ے; 15–18 aspirate digraphs (count context-dependent); no Urdu word begins with ں ھ ڑ ے; ن/ں final distinguished by dot; hamza in Nastaliq resembles two dots (ت/ق pattern); Nastaliq = diagonal cascade upper-right→lower-left, no fixed baseline, overlapping lines, ~20k ligatures, dot displacement; final د rises vs final ر drops (Nastaliq); toothless sīn + miniature-sīn marker; verb suffixes written in full (بننا); future گا separate word (چلیں گے); ergative نے.

---
Task ID: 4-6
Agent: main
Task: Backend + python tools + OCR pipeline + document AI + frontend wizard

Work Log:
- Prisma schema (ResearchArticle, OcrSession, OcrPage, TranscriptionLine @@unique([pageId,order]), DocumentProject) pushed to SQLite; db/bootstrap.sql DDL generated for serverless bootstrap; src/lib/db.ts ensureDb() auto-creates schema on cold hosts.
- python-tools/ocr_prep.py: analyze (deskew via projection-variance search, adaptive-threshold ink, morphological line-band detection, numbered overlay) + crop (pad, CLAHE, percentile stretch, unsharp, upscale, inkRatio on RAW pixels) + ping.
- src/lib/imagetools.ts: python-first with sharp fallback (serverless-safe).
- src/lib/zai.ts: visionChat/textChat + extractJson (fences, trailing commas, shorthand-box repair) + visionJson/textJson with retry-feedback loop.
- src/lib/ocr-prompts.ts: research dossier injected into BOTH passes (layout Stage A/B, read Stage C-F) with per-subject uncertainty markers and strict box-format contract.
- API routes: /api/research (GET/POST/PUT), /api/ocr/start|layout|read|review|retry-line, /api/session, /api/document (POST/PUT/GET), /api/document/export (docx via `docx` lib w/ RTL bidirectional, md, txt).
- KEY FIXES during e2e testing: (1) cv2.imwrite needs dirs → os.makedirs in ocr_prep; (2) VLM absolute-pixel grounding is weak → snapToCandidates(): equal-count order pairing, IoU snapping, y-center distance rescue — python geometry + VLM semantics hybrid; (3) shorthand box JSON repair; (4) inkRatio measured pre-enhancement; (5) empty-crop auto-expansion retry in read route; (6) document title-block reconciliation.
- Frontend: 4-step wizard (SetupStep subject cards + dropzone/paste, ProcessingStep pipeline orchestration with band map + crop strip + terminal log, VerifyStep band-overlay sync + editable lines + alternatives + retry + confidence badges, DocumentStep doc-type picker + block editor + live RTL/KaTeX paper preview + exports), ResearchLibrary sheet (view/edit/create custom subjects), zustand store, session resume via /?session=id.
- Fonts: Inter + Lateef (Sindhi) + Noto Nastaliq Urdu (Urdu); KaTeX CSS; warm paper theme; sticky footer; responsive.
- e2e API test PASSED: 7/7 bands read (6 high, 1 medium), document generated (title/headings/paragraph/math LaTeX/list), docx+md export verified.

Stage Summary:
- Full pipeline working end-to-end via API. Remaining: browser UI verification, README, GitHub push, Vercel deploy.

---
Task ID: 5-6 (hardening iteration)
Agent: main
Task: Make the OCR pipeline robust on real handwriting photos

Work Log:
- Diagnosed real-photo failures step by step with /tmp debug scripts:
  1. Dark background frame around the paper poisoned adaptiveThreshold → added find_page_region() (Otsu bright-region crop) in ocr_prep.py.
  2. Profile-threshold banding missed short continuation rows → replaced with CC-cleaning (fill-ratio/size/ruled-line filters) + LOW-threshold row runs → python now emits fine text ROWS.
  3. VLM box drift (±1 row, shorthand JSON, nested boxes, LaTeX backslash escapes breaking JSON) → extractJson repairs (shorthand/nested boxes, trailing commas, invalid escapes), loose band scanner fallback, 429 rate-limit backoff in visionJson/textJson.
  4. Final deterministic reconcileBands(): every python row = one band (clean geometry, reading order); VLM donates semantics (kind/preliminary) via best-overlap inheritance; model-only bands appended only if they overlap nothing.
  5. inkRatio measured on raw pixels; read route auto-expands empty crops.
- Verified e2e: synthetic English (7/7 high), REAL handwritten English (12 bands, perfect reading order, clean structured document), handwritten math (fractions → \frac LaTeX, study-sheet document).

Stage Summary:
- OCR pipeline now robust on real handwriting photos. Next: browser UI verification, GitHub push, Vercel deploy.
