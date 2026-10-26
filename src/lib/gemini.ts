import type { VisionImage } from "@/lib/zai";

/**
 * Gemini engine — per-subject model / thinking / tools configuration.
 *
 * The user's engine assignment:
 *   - HARD handwritten scripts (Sindhi, and custom RTL subjects):
 *       `gemini-3.5-flash` + MEDIUM thinking + code execution
 *   - Urdu, English, Mathematics (and custom LTR subjects):
 *       `gemini-3.5-flash-lite` + HIGH thinking + code execution
 *
 * The engine activates when GEMINI_API_KEY (or GOOGLE_API_KEY) is set.
 * Without a key every call transparently falls back to the Z.ai SDK path,
 * so the app always works (see src/lib/zai.ts).
 *
 * Notes on the API shape used here:
 *   - thinking is controlled with `generationConfig.thinkingConfig.thinkingLevel`
 *     ("low" | "medium" | "high") — the Gemini 3+ style knob;
 *   - `tools: [{ codeExecution: {} }]` lets the model write and run Python,
 *     which helps it sanity-check its own reading (e.g. math evaluation,
 *     character-frequency checks on long words) before answering;
 *   - with tools enabled, structured output (responseSchema) is NOT available,
 *     so callers rely on prompt instructions + the tolerant extractJson().
 */

export type ThinkingLevel = "low" | "medium" | "high";

export type EngineConfig = {
  /** REST model id, e.g. "gemini-3.5-flash" */
  model: string;
  thinkingLevel: ThinkingLevel;
  codeExecution: boolean;
  /** Human-readable engine label for the UI. */
  label: string;
};

/** Model ids are env-overridable (Google renames preview models often). */
const MODEL_HARD = process.env.GEMINI_MODEL_HARD || "gemini-3.5-flash";
const MODEL_DEFAULT = process.env.GEMINI_MODEL_DEFAULT || "gemini-3.5-flash-lite";

const BUILT_IN_SUBJECTS = new Set(["sindhi", "urdu", "english", "mathematics"]);

/**
 * Pick the engine for a subject. "Hard" = handwritten Arabic-script cursive
 * beyond the four built-ins (Sindhi is the named case; custom RTL subjects
 * like Pashto/Punjabi get the same treatment). Urdu deliberately stays on the
 * default engine with HIGH thinking — its dossier + ensemble protocol handle
 * Nastaliq reliability.
 */
export function engineForSubject(
  subject: string,
  direction: "rtl" | "ltr" = "ltr",
): EngineConfig {
  const isHard = subject === "sindhi" || (!BUILT_IN_SUBJECTS.has(subject) && direction === "rtl");
  return isHard
    ? {
        model: MODEL_HARD,
        thinkingLevel: "medium",
        codeExecution: true,
        label: "Gemini 3.5 Flash · medium thinking · code execution",
      }
    : {
        model: MODEL_DEFAULT,
        thinkingLevel: "high",
        codeExecution: true,
        label: "Gemini 3.5 Flash Lite · high thinking · code execution",
      };
}

export function geminiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

/** True when a Gemini key is configured (engine active). */
export function geminiEnabled(): boolean {
  return geminiApiKey().length > 0;
}

const GEMINI_BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

export type GeminiResult = { text: string; model: string };

/**
 * Low-level generateContent call. System prompt carries the subject's research
 * dossier; user parts carry the task text + optional inline images (base64).
 * Only the text parts of the response are concatenated (code-execution parts
 * such as executableCode / executionResult are ignored).
 */
export async function geminiGenerate(opts: {
  system: string;
  user: string;
  images?: VisionImage[];
  engine: EngineConfig;
  timeoutMs?: number;
}): Promise<GeminiResult> {
  const key = geminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const parts: Array<Record<string, unknown>> = [{ text: opts.user }];
  for (const img of opts.images || []) {
    parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } });
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      thinkingConfig: { thinkingLevel: opts.engine.thinkingLevel },
      // thinking tokens count against the output budget — generous cap so a
      // HIGH-thinking pass never truncates the JSON mid-object
      maxOutputTokens: 32768,
    },
  };
  if (opts.engine.codeExecution) {
    body.tools = [{ codeExecution: {} }];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  try {
    const res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(opts.engine.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 404) {
        throw new Error(
          `Gemini model "${opts.engine.model}" not found (404). Check GEMINI_MODEL_HARD / GEMINI_MODEL_DEFAULT. ${errText.slice(0, 200)}`,
        );
      }
      throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      promptFeedback?: { blockReason?: string };
    };
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || [])
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("")
      .trim();
    if (!text) {
      const blocked = data.promptFeedback?.blockReason ? ` (blocked: ${data.promptFeedback.blockReason})` : "";
      throw new Error(`Gemini returned no text${blocked}`);
    }
    return { text, model: opts.engine.model };
  } finally {
    clearTimeout(timer);
  }
}
