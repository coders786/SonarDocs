# Decision Log

This log records every architectural, UX, and mechanical decision made during development.

## 2026-10-21: SonarDocs Full Architecture & Implementation
- **Decision**: Renamed application to **SonarDocs** per explicit user instruction across `metadata.json`, `app/layout.tsx`, and `app/manifest.ts`.
  - *Reason*: Direct user naming command.
- **Decision**: Prohibited all emojis across the entire application codebase, UI components, and logs; implemented custom modernized SVG icon set in `lib/icons.tsx`.
  - *Reason*: Direct user mandate for zero emojis and sleek, modernized custom SVG icons.
- **Decision**: Client-side canvas compression in `lib/image-compressor.ts` downscales captured photos to <=1600px.
  - *Reason*: Optimizes upload speeds for low-end Android devices on 3G network conditions in Sindh, Pakistan.
- **Decision**: Built server-side DOCX generator `lib/docx-generator.ts` with bidirectional paragraph formatting, Arabic-script font mapping (`Noto Nastaliq Urdu`, `Noto Naskh Arabic`, `Arial`), and clean hierarchical examination layouts.
  - *Reason*: Delivers authentic, editable Word document replicas honoring Urdu and Sindhi RTL requirements.
- **Decision**: Implemented natural-language in-chat edit route `/api/jobs/[id]/edit` that directly mutates stored JSON transcription and re-renders DOCX without re-executing OCR.
  - *Reason*: Enables instant corrections (e.g., "Q3 ke marks 10 karo") in seconds without re-running heavy multimodal vision pipelines.
- **Decision**: Real-time Server-Sent Events (SSE) streaming endpoint `/api/jobs/[id]/stream` for live pipeline feedback.
  - *Reason*: Keeps teachers informed through friendly, short status phrases without page reloads.
- **Decision**: Added Gemini function calling for `ask_clarifying_questions` before paper creation.
  - *Reason*: Narrows down specifics (exam board layout, numeral formats ۱، ۲، ۳ vs 1, 2, 3, total marks allocation) before document composition.
- **Decision**: Added `compose_doc` and `manipulate_doc` functions and direct execution endpoints (`/api/jobs/compose`, `/api/jobs/[id]/manipulate`).
  - *Reason*: Gives teachers programmatic and interactive document manipulation (reordering sections, converting numerals, injecting answer lines, adjusting marks) with live DOCX re-rendering.
- **Decision**: Implemented language-difficulty smart model routing in `config/ai.ts` and `lib/gemini.ts`:
  - English: routes to `gemini-3.1-flash-lite` with minimal thinking (lowest cost, fast OCR).
  - Urdu: routes to `gemini-3.8-flash` with low/medium thinking for cascading Nastaliq ligatures.
  - Sindhi: routes to `gemini-3.8-flash` with `ThinkingLevel.MEDIUM` and built-in Python sandbox code execution (`codeExecution: {}`) to crop, zoom in, and verify delicate 4-dot variations (ٽ, ٺ, ٿ, ڄ, ڃ, ٻ, ڳ, ڱ, ڏ, ڻ).
- **Decision**: Auto-chosen research articles (`sindhi-paleography.md`, `urdu-nastaliq.md`, `english-exam-standards.md`) dynamically selected by answered language to prevent token waste on irrelevant scripts.
- **Decision**: Integrated explicit Gemini API Prompt Caching using `ai.caches.create` and the `config.cachedContent` parameter in `lib/gemini.ts`.
  - When calling `ai.models.generateContent`, the server registers/retrieves the cached prompt resource for the auto-chosen research pack and passes `config: { cachedContent: cachedResourceName }`, achieving official Gemini prompt cache reuse and tracking `response.usageMetadata.cachedContentTokenCount`.

## 2026-10-23: Pre-coded Pakistani Curriculum Engine & Direct Google Docs Integration
- **Decision**: Implemented pre-coded authentic Pakistani examination question banks in `lib/curriculum-generator.ts` covering all 10 subjects (Physics, Chemistry, Biology, Mathematics, Computer Science, English Compulsory, Urdu Lazmi, Sindhi Lazmi, Pakistan Studies, Islamiat Compulsory) and all 10 classes (Class 1 to Class 10 / Primary, Middle, Secondary).
  - *Reason*: Eliminates AI latency and non-deterministic hallucination for standard curriculum exam creation; papers compile in under 50ms without exhausting AI rate limits.
- **Decision**: Added intelligent curriculum matcher `matchCurriculumFromText` and standard 4-step sequential interrogation wizard payload generator `getCurriculumInterrogatePayload`.
  - *Reason*: Allows the chatbot to present pre-coded options directly in a 1-by-1 sequential wizard (Subject -> Class -> Board -> Marks & Time) when user asks for a paper.
- **Decision**: Integrated direct Google Docs creation and formatting via Google Docs REST API v1 (`/v1/documents` and `batchUpdate`) in `lib/google-docs.ts`.
  - *Reason*: Writes formatted headers, sections, MCQs with aligned options, and short/long question marks directly into the teacher's real Google Drive/Docs with an immediate "Open in Google Docs" link.
- **Decision**: Added pre-coded Pakistani Curriculum quick switcher tabs ("10 Subjects", "Class 1-10", "Edits") to `components/ChatInputBar.tsx`.
  - *Reason*: Provides immediate 1-tap paper generation without requiring manual typing.

