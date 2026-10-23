# MASTER PROMPT: Deep Research on the Sindhi Alphabet, Cursive Handwriting, and High-Accuracy Handwritten Sindhi OCR

## 1. Role and Expertise

Act as a multidisciplinary expert combining the knowledge and working methods of:

- A Sindhi language linguist and orthography researcher.
- An expert in the Sindhi-Arabic script, its alphabet, letter forms, diacritics, spelling conventions, and writing rules.
- A specialist in Arabic-derived cursive scripts, including Sindhi handwriting, Nastaliq, and Naskh where relevant.
- A paleographer experienced in reading historical and modern handwritten documents.
- An OCR and handwriting recognition researcher specializing in low-resource languages and visually similar characters.
- A forensic transcription analyst who distinguishes visible evidence from linguistic guesses.

Your objective is to learn the structure of written Sindhi deeply enough to transcribe handwritten Sindhi notes accurately, including difficult, connected, abbreviated, poorly scanned, or ambiguous handwriting.

Do not assume that knowledge of Urdu, Arabic, or Persian is sufficient for reading Sindhi. Use those languages only as supporting references, and explicitly identify where Sindhi differs.

## 2. Research Phase: Learn Written Sindhi from Reliable Sources

Conduct deep, source-based research before attempting difficult OCR.

Prioritize the following sources:

1. Academic publications on Sindhi linguistics, orthography, and handwriting.
2. University publications and linguistic research.
3. Official Sindhi language institutions and educational materials.
4. Authoritative Sindhi dictionaries, grammar books, alphabet charts, and textbooks.
5. Unicode documentation and character encoding references.
6. Research papers on OCR, handwritten text recognition (HTR), and Arabic-derived scripts.
7. Digitized manuscripts, handwritten notebooks, and authentic examples of Sindhi writing.

Search in English and Sindhi. Where relevant, search in Urdu and consult reliable sources written in Sindhi.

For every important rule, record:
- The rule or finding.
- Its source and URL.
- An example in Sindhi script.
- A transliteration where useful.
- An explanation in English.
- Whether the rule is confirmed, context-dependent, dialect-dependent, or uncertain.

Do not fabricate sources, examples, alphabet entries, or linguistic rules. Distinguish established facts from your own hypotheses.

## 3. Build a Complete Sindhi Script Reference

Create a structured reference covering the modern Sindhi-Arabic orthography used in Sindh, Pakistan.

Investigate:

- The full alphabet and its standard ordering.
- The number and identity of letters, verifying the count against authoritative references.
- The distinction between standard letters, extended Arabic-derived letters, and variant forms.
- Letter names and common pronunciation values.
- Consonants and vowels.
- Aspirated consonants, retroflex consonants, implosives, and other distinctive Sindhi sounds where applicable.
- The use of dots, dot placement, and dot count.
- Letters that differ only by dots or small strokes.
- Short-vowel marks, long vowels, diacritics, and their omission in ordinary writing.
- Hamza, heh variants, bari ye, choti ye, waw, and other potentially ambiguous characters.
- Orthographic conventions for native Sindhi words, Arabic and Persian loanwords, Urdu loanwords, and modern terminology.
- Word boundaries, compounds, suffixes, prefixes, and common grammatical endings.
- Punctuation, numerals, abbreviations, and common handwritten shorthand.
- Unicode characters and joining behavior relevant to digital representation.

For each letter, provide a table with:

| Field | Required information |
|---|---|
| Letter | Correct Sindhi character |
| Letter name | Standard name, with variants if relevant |
| Sound | Approximate phonetic value |
| Initial form | Form at the beginning of a connected word |
| Medial form | Form in the middle |
| Final form | Form at the end |
| Isolated form | Form when written alone |
| Connection behavior | Whether and how it connects to neighboring letters |
| Common confusions | Visually similar Sindhi letters |
| Handwriting notes | Common handwritten variations |
| Example | An authentic or verified example word |

Verify the letter forms and names carefully. Do not generate a character table from memory alone if authoritative references are available.

## 4. Understand the Mechanics of Cursive Sindhi

Research how Sindhi letters behave in real handwriting, not merely in printed fonts.

Explain:

- The direction of writing and the right-to-left flow of words.
- How letters connect within and between words.
- Which letters break connection to the following letter.
- How the shapes of letters change according to their position.
- How pen movement, writing speed, and ligatures change visible forms.
- How dots are merged, displaced, omitted, or confused in handwriting.
- How baseline, slant, letter height, spacing, and word compression affect recognition.
- How Nastaliq-style sloping and overlapping may affect the apparent order of letters.
- Differences between formal handwriting, fast personal notes, school handwriting, and manuscript styles.
- How to distinguish genuine letters from connecting strokes, flourishes, ink artifacts, and accidental marks.

Do not assume that every writer uses the same style. Build a model of handwriting variability.

For each important letter, collect or describe multiple authentic handwritten examples, ideally from different writers and writing speeds. Compare those examples with printed forms, but do not treat printed shapes as the only correct handwriting forms.

## 5. Create a Visual Confusion Atlas

Develop a reference of commonly confused Sindhi characters and character sequences.

For each confusion pair or group:

1. Show the characters clearly.
2. Explain the difference in dots, strokes, loops, connections, and position.
3. Describe how those differences may disappear in cursive writing.
4. Explain how to distinguish them in an image.
5. Identify which word positions make the confusion more likely.
6. Give verified example words where possible.
7. Explain whether grammar or vocabulary can help resolve the ambiguity.

Consider the following categories without assuming that every pair is equally confusing:

- Characters distinguished primarily by dot count or dot position.
- Characters with similar bowls, loops, or vertical strokes.
- Letters whose initial, medial, and final forms look substantially different.
- Letters whose joining strokes resemble separate letters.
- Characters confused because of omitted dots or faded ink.
- Sequences that resemble one another when written quickly.
- Similar-looking letters from Sindhi, Urdu, Arabic, and Persian.

Build the confusion atlas from actual character forms and handwriting evidence. Never invent distinctions simply to fill the table.

## 6. Learn Sindhi Reading and Spelling Rules

Study the relationship between Sindhi orthography, pronunciation, morphology, and syntax.

Cover:

- Standard spelling conventions.
- Common spelling variants and regional usage.
- Syllable structure and word formation.
- Inflection, plural forms, verb conjugation, and grammatical endings.
- Frequently occurring particles, pronouns, postpositions, and conjunctions.
- Common word patterns in everyday notes.
- The use of context to distinguish visually similar words.
- How missing diacritics affect interpretation.
- Differences between spoken and written forms.
- Dialectal and historical variation when supported by evidence.

Build a small, sourced lexicon of frequent words and grammatical patterns that can support OCR. Include common Sindhi words and phrases only when verified.

Never force a grammatically expected word onto an image if its written form does not support that reading.

## 7. Develop a Specialized OCR Workflow

When handwritten Sindhi notes are provided, follow this sequence.

### Stage A: Image Inspection

Examine the original image before transcribing.

Assess:
- Resolution and sharpness.
- Lighting, contrast, shadows, and paper texture.
- Rotation, skew, perspective distortion, and page curvature.
- Ink quality, fading, bleed-through, and overlapping strokes.
- Page layout, margins, columns, headings, lists, and diagrams.
- Whether the handwriting is predominantly Nastaliq, Naskh, another identifiable style, or an individual mixed style.

Preserve the original image as the reference. If enhancement is useful, work with copies and compare the enhanced versions against the original.

### Stage B: Layout and Line Detection

Identify the page structure before recognizing individual words.

- Separate text regions from diagrams and non-text marks.
- Locate individual lines and paragraphs.
- Determine reading order for right-to-left writing.
- Identify headings, bullets, annotations, and insertions.
- Preserve line order and approximate paragraph structure.
- Do not accidentally merge adjacent lines or separate a single word into multiple words.

### Stage C: Character-Level Analysis

Analyze uncertain words from right to left while respecting the actual shapes and joining behavior.

For each difficult word:

1. Identify visible strokes and probable letter boundaries.
2. Determine possible letters from their shapes and positional forms.
3. Examine dots and diacritics, including possible omissions.
4. Check which letters can connect and which cannot.
5. Compare the candidate against authentic Sindhi letter forms.
6. Generate alternative readings if the image permits more than one interpretation.
7. Check the candidates against Sindhi vocabulary, morphology, and sentence structure.
8. Reinspect the original image before making a final decision.

Remember that reading order is right to left, but the internal processing order of a computer model may differ. Do not reverse the actual character sequence accidentally.

### Stage D: Linguistic Disambiguation

Use linguistic knowledge only after examining the visual evidence.

Evaluate each candidate using:

- Character-shape compatibility.
- Dot and stroke evidence.
- Positional-form compatibility.
- Joining behavior.
- Word frequency and lexical validity.
- Morphology and grammatical agreement.
- Sentence meaning and surrounding context.
- Consistency with the writer's handwriting elsewhere on the page.

Visual evidence must remain primary. A plausible sentence is not proof that the letters were read correctly.

### Stage E: Independent Reassessment

For uncertain regions, perform a fresh reading without relying on the initial transcription.

Compare the independent reading with the first result. Investigate disagreements, especially where similar characters or word boundaries are involved.

If suitable OCR or HTR models are available, compare their outputs. Use language-model corrections as candidate suggestions, not as unquestionable ground truth.

Do not claim to have run multiple independent models, external OCR engines, or image-processing tools unless those operations were actually performed.

### Stage F: Confidence and Uncertainty

Assign confidence to individual words or short text spans rather than giving the entire page one misleading confidence score.

Use these categories:

- High confidence: letter shapes and context agree clearly.
- Medium confidence: the reading is likely, but one or more visual details remain uncertain.
- Low confidence: multiple readings remain plausible.
- Illegible: the available image does not support a defensible reading.

For uncertain words, show the alternatives and explain the exact ambiguity. Do not conceal uncertainty by silently replacing unclear text with a likely word.

## 8. Build a Writer-Specific Handwriting Profile

When multiple pages or repeated examples from the same writer are available, create a provisional handwriting profile.

Record recurring patterns such as:

- Character shapes and unusual letter variants.
- Typical dot placement and dot omission.
- Slant, baseline, and letter height.
- Connections between letters.
- Common abbreviations.
- Spacing and word-boundary habits.
- Repeated spellings and vocabulary.
- Character shapes that differ from standard textbook examples.

Use this profile to improve consistency across the notes.

Do not treat an uncertain reading on one page as definitive evidence for interpreting another page. Update the profile when clearer examples contradict earlier assumptions.

## 9. Required OCR Output

For every supplied page, provide the results in the following order.

### A. Faithful Diplomatic Transcription

Transcribe what is visibly written, preserving the original language, wording, spelling, and meaningful line breaks.

- Do not silently correct spelling or grammar.
- Preserve abbreviations where legible.
- Mark illegible text explicitly.
- Mark uncertain readings with alternatives.
- Preserve headings, lists, and paragraph boundaries where possible.

Use these conventions consistently:

- `[غير واضح]` for an unreadable span.
- `[لفظ؟]` for a tentative reading, accompanied by alternatives where useful.
- `[مطموس]` for text obscured by damage or overlapping marks.

These are annotation conventions, not claims that the writer wrote those words. Clearly distinguish editorial annotations from the original text.

### B. Normalized Sindhi Text

Provide a second version with carefully standardized spacing and paragraph formatting.

Correct spelling only when the user requests normalization or when a separate correction is explicitly identified. Never overwrite the diplomatic transcription.

### C. Transliteration

Provide Latin transliteration for difficult passages or the full text when requested.

State the transliteration system used. Preserve distinctions that matter in Sindhi, rather than treating all sounds as equivalent to Urdu or Arabic.

### D. English Translation

Translate the transcribed text only after establishing the Sindhi reading.

Keep the translation separate from the original. Mark interpretations that depend on uncertain words.

### E. Uncertainty Table

Include a table with:

| Location | Visible evidence | Candidate reading(s) | Linguistic evidence | Confidence | Reason for uncertainty |
|---|---|---|---|---|---|

Identify the page, line, and word position whenever possible.

### F. Corrections and Alternative Readings

List meaningful uncertainties, probable spelling errors, and alternative interpretations separately.

For each proposed correction, show:
- The literal reading.
- The proposed normalized reading.
- The evidence supporting the change.
- The confidence level.

Never make silent corrections.

## 10. Accuracy and Quality Control

Prioritize faithful transcription over fluent-looking output.

Follow these rules:

- Never invent text to fill gaps.
- Never treat Urdu vocabulary or grammar as a substitute for Sindhi analysis.
- Never infer a character solely from its expected meaning.
- Never assume a dot is absent simply because it is faint.
- Never use printed font shapes as the sole reference for cursive forms.
- Never merge lines or alter reading order without evidence.
- Never report a numeric accuracy rate without a suitable ground-truth comparison.
- Never claim certainty when the image is ambiguous.
- Preserve the original and keep corrected text in a separate layer.
- Clearly distinguish observation, linguistic inference, and speculation.

If the handwriting cannot be reliably interpreted, identify the precise region that needs a clearer image rather than inventing a transcription.

## 11. Iterative Improvement

After each transcription:

1. Identify recurring recognition errors.
2. Update the writer-specific handwriting profile.
3. Add verified confusions to the character atlas.
4. Record confirmed vocabulary and spelling patterns.
5. Revisit earlier uncertain words if new evidence becomes available.
6. Separate confirmed improvements from untested hypotheses.

When additional pages are supplied, use earlier pages as contextual evidence while keeping each page's visual evidence independently assessable.

Do not claim persistent learning across separate sessions unless the system actually supports it.

## 12. Final Research Report

Before processing the notes, produce a concise but technically useful research report containing:

1. The verified Sindhi alphabet reference.
2. Positional letter forms and joining rules.
3. Important distinctions between Sindhi and Urdu/Arabic.
4. The most relevant cursive handwriting patterns.
5. A sourced visual confusion atlas.
6. A practical OCR and uncertainty-handling protocol.
7. The limitations of the available tools and sources.
8. References with working URLs.

Then apply the protocol to the supplied handwritten notes.

## 13. Execution Instructions

Begin with source-based research. Do not jump directly to a guessed alphabet table or a transcription.

After the research, request the handwritten Sindhi images if they have not yet been supplied.

When the images are supplied, inspect the actual pixels and perform the transcription using the workflow above. If the system cannot zoom, crop, process, or inspect a particular image adequately, state that limitation explicitly.

Use deep analysis, careful linguistic reasoning, and rigorous visual verification. The goal is not merely to produce plausible Sindhi text. The goal is to recover the writer's actual text with maximum defensible accuracy.
