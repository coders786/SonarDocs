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
 * Key resolution (BYOK — bring your own key):
 *   1. the per-request key sent by the browser (`x-gemini-key` header) — the
 *      user's own key, stored client-side only;
 *   2. the server's key pool: GEMINI_API_KEYS (comma/semicolon/newline
 *      separated, ROLLED round-robin per request, with automatic failover to
 *      the next key on 429 quota / 401 / 403), falling back to the single
 *      GEMINI_API_KEY / GOOGLE_API_KEY env var;
 *   3. no key → every call transparently falls back to the Z.ai SDK path
 *      (see src/lib/zai.ts), so the app always works.
 *
 * Notes on the API shape used here:
 *   - thinking is controlled with `generationConfig.thinkingConfig.thinkingLevel`
 *     ("low" | "medium" | "high") — the Gemini 3+ style knob;
 *   - `tools: [{ codeExecution: {} }]` lets the model write and run Python in
 *     Google's sandbox — used both for self-checking readings AND (in
 *     sandboxAnalyzePage) for the page analysis + line cropping itself;
 *   - with tools enabled, structured output (responseSchema) is NOT available,
 *     so callers rely on prompt instructions + the tolerant extractJson();
 *   - files saved by the sandbox code come back as inlineData image parts in
 *     the response — that is how the model hands us its crops.
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

/** Validate a BYOK key from the browser (shape check only, no network). */
export function sanitizeByokKey(raw: string | null | undefined): string {
  const k = String(raw || "").trim();
  if (!k || k.length > 300 || /[\r\n]/.test(k)) return "";
  return k;
}

/** Extract the BYOK key from a Next request header. */
export function byokFromRequest(req: { headers: { get(name: string): string | null } }): string {
  return sanitizeByokKey(req.headers.get("x-gemini-key"));
}

import fs from "fs";
import path from "path";

function readKeyFromFile(): string {
  try {
    for (const name of [".env.local", ".env"]) {
      const p = path.join(process.cwd(), name);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        const match = content.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match && match[1] && !match[1].startsWith("MY_")) {
          return match[1].trim();
        }
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

/**
 * The server's Gemini key pool.
 *
 * GEMINI_API_KEYS holds one or more keys (new AI Studio "AQ.*" keys and
 * classic "AIza…" keys both work as-is) separated by comma / semicolon /
 * newline. Requests ROLL through the pool round-robin — spreading quota and
 * absorbing per-key 429s — and a key that answers 429/401/403 is skipped for
 * the following calls. Falls back to the single GEMINI_API_KEY env var.
 */
export function geminiKeyPool(): string[] {
  const raw = process.env.GEMINI_API_KEYS || "";
  const keys = raw
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 20 && !k.startsWith("MY_"));
  if (keys.length) return keys;
  const single = envGeminiKey();
  return single ? [single] : [];
}

let poolCursor = 0;

/**
 * Pick the key for one Gemini operation: BYOK wins; otherwise take the next
 * key in the rotation (advancing the cursor so concurrent requests spread
 * across the pool).
 */
export function pickGeminiKey(byokKey?: string): string {
  const byok = sanitizeByokKey(byokKey);
  if (byok) return byok;
  const pool = geminiKeyPool();
  if (!pool.length) return "";
  const key = pool[poolCursor % pool.length];
  poolCursor++;
  return key;
}

export function envGeminiKey(): string {
  const envVal = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (envVal && !envVal.startsWith("MY_") && envVal.length > 20) {
    return envVal;
  }
  const fromFile = readKeyFromFile();
  if (fromFile) {
    process.env.GEMINI_API_KEY = fromFile;
    return fromFile;
  }
  return envVal;
}

/** True when a Gemini key is available (BYOK or any pool key) — engine active. */
export function geminiEnabled(byokKey?: string): boolean {
  return (sanitizeByokKey(byokKey) || geminiKeyPool()[0] || "").length > 0;
}

const GEMINI_BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_UPLOAD_BASE = process.env.GEMINI_UPLOAD_BASE || "https://generativelanguage.googleapis.com/upload/v1beta";

export type GeminiResult = {
  text: string;
  /** Images the sandbox code saved (crops etc.), in the order they were produced. */
  images: VisionImage[];
  model: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};

/**
 * Low-level generateContent call. System prompt carries the subject's research
 * dossier; user parts carry the task text + optional inline images (base64).
 * Returns the text parts concatenated plus every inline image the sandbox
 * produced (code-execution output files), in production order.
 */
export async function geminiGenerate(opts: {
  system: string;
  user: string;
  images?: VisionImage[];
  engine: EngineConfig;
  timeoutMs?: number;
  apiKey?: string;
  /** extra parts (e.g. fileData references to uploaded files) appended after the user text */
  extraParts?: Array<Record<string, unknown>>;
}): Promise<GeminiResult> {
  // BYOK pins one key; otherwise roll through the pool with failover on
  // quota/auth failures (429 RESOURCE_EXHAUSTED, 401, 403).
  const pinned = sanitizeByokKey(opts.apiKey);
  const pool = pinned ? [pinned] : geminiKeyPool();
  if (!pool.length) throw new Error("GEMINI_API_KEY is not configured (no BYOK key and no env key)");

  const parts: Array<Record<string, unknown>> = [{ text: opts.user }];
  for (const img of opts.images || []) {
    parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } });
  }
  for (const p of opts.extraParts || []) parts.push(p);

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

  let lastError: Error = new Error("Gemini call did not run");
  for (let attempt = 0; attempt < pool.length; attempt++) {
    // start each attempt at the rotation cursor so concurrent requests spread
    const key = pool[(poolCursor + attempt) % pool.length];
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
        const err = new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
        if ((res.status === 429 || res.status === 401 || res.status === 403) && attempt < pool.length - 1) {
          console.warn(`[gemini] key #${(poolCursor + attempt) % pool.length + 1} rejected (${res.status}) — rolling to the next key`);
          lastError = err;
          continue; // fail over to the next key in the pool
        }
        throw err;
      }

      poolCursor = (poolCursor + attempt + 1) % Math.max(1, pool.length);
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
        promptFeedback?: { blockReason?: string };
      };
      const partsOut = data.candidates?.[0]?.content?.parts || [];
      const text = partsOut
        .map((p) => (typeof p.text === "string" ? p.text : ""))
        .join("")
        .trim();
      const images: VisionImage[] = [];
      for (const p of partsOut) {
        if (p.inlineData?.data) {
          images.push({
            mime: p.inlineData.mimeType || "image/png",
            base64: p.inlineData.data,
          });
        }
      }
      if (!text && images.length === 0) {
        const blocked = data.promptFeedback?.blockReason ? ` (blocked: ${data.promptFeedback.blockReason})` : "";
        throw new Error(`Gemini returned no content${blocked}`);
      }
      return { text, images, model: opts.engine.model };
    } catch (err) {
      // 429/401/403 with remaining pool → try the next key; everything else throws
      const msg = err instanceof Error ? err.message : String(err);
      if (/Gemini API (429|401|403):/.test(msg) && attempt < pool.length - 1) {
        lastError = err instanceof Error ? err : new Error(msg);
        continue;
      }
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ */
/* File API upload — gives the code-execution sandbox access to a page */
/* ------------------------------------------------------------------ */

type UploadedFile = { uri: string; name: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Upload an image via the resumable File API so the sandbox code can open it.
 * Returns the file URI to be used in a `fileData` part.
 */
export async function uploadToGemini(opts: {
  dataBase64: string;
  mime: string;
  apiKey?: string;
  displayName?: string;
  timeoutMs?: number;
}): Promise<UploadedFile> {
  const key = sanitizeByokKey(opts.apiKey) || envGeminiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured (no BYOK key and no env key)");
  const bytes = Buffer.from(opts.dataBase64, "base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    // step 1: start the resumable session
    const start = await fetch(`${GEMINI_UPLOAD_BASE}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.length),
        "X-Goog-Upload-Header-Content-Type": opts.mime,
      },
      body: JSON.stringify({ file: { displayName: opts.displayName || "sonar-page" } }),
      signal: controller.signal,
    });
    if (!start.ok) throw new Error(`Gemini file upload start failed ${start.status}: ${(await start.text().catch(() => "")).slice(0, 200)}`);
    const uploadUrl = start.headers.get("x-goog-upload-url");
    if (!uploadUrl) throw new Error("Gemini file upload did not return an upload URL");

    // step 2: PUT the bytes and finalize
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(bytes.length),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(bytes),
      signal: controller.signal,
    });
    if (!up.ok) throw new Error(`Gemini file upload failed ${up.status}`);
    const meta = (await up.json().catch(() => ({}))) as {
      file?: { uri?: string; name?: string; state?: string };
    };
    if (!meta.file?.uri) throw new Error("Gemini file upload returned no file uri");

    // step 3: images are usually ACTIVE immediately; poll briefly otherwise
    for (let i = 0; i < 10 && meta.file.state === "PROCESSING"; i++) {
      await sleep(500);
      const check = await fetch(`${GEMINI_BASE}/${meta.file.name}`, { headers: { "x-goog-api-key": key } });
      if (!check.ok) break;
      const j = (await check.json()) as { state?: string; uri?: string };
      meta.file.state = j.state;
      if (j.uri) meta.file.uri = j.uri;
    }
    if (meta.file.state === "FAILED") throw new Error("Gemini file processing failed");
    return { uri: meta.file.uri, name: meta.file.name || "" };
  } finally {
    clearTimeout(timer);
  }
}

export type SandboxAnalysis = {
  text: string;
  /** Sandbox-saved images (crops) in production order. */
  crops: VisionImage[];
  model: string;
};

/**
 * Run a page image through the Gemini code-execution sandbox: the model loads
 * the uploaded file with OpenCV/PIL inside Google's sandbox, deskews it,
 * detects the text-line bands, crops + enhances + upscales each band, saves
 * every crop (they come back to us as inline images) and reports the band
 * geometry as JSON text. This is the model doing the cropping with real code
 * instead of our local python scripts.
 */
export async function sandboxAnalyzePage(opts: {
  system: string;
  user: string;
  pageBase64: string;
  pageMime: string;
  engine: EngineConfig;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<SandboxAnalysis> {
  // ONE key must own both the file upload and the generateContent call (a
  // file uploaded under key A is not visible to key B), so pin the rotation
  // cursor once per sandbox run.
  const pinned = pickGeminiKey(opts.apiKey);
  const file = await uploadToGemini({
    dataBase64: opts.pageBase64,
    mime: opts.pageMime,
    apiKey: pinned,
    displayName: "sonar-page",
  });
  const res = await geminiGenerate({
    system: opts.system,
    user: opts.user,
    engine: opts.engine,
    apiKey: pinned,
    timeoutMs: opts.timeoutMs ?? 180_000,
    extraParts: [{ fileData: { fileUri: file.uri, mimeType: opts.pageMime } }],
  });
  return { text: res.text, crops: res.images, model: res.model };
}

/** Minimal one-token call used by the BYOK "Test key" button. */
export async function geminiPing(opts: { apiKey?: string; model?: string }): Promise<{ ok: boolean; error?: string; model: string }> {
  const model = opts.model || process.env.GEMINI_MODEL_DEFAULT || "gemini-3.5-flash-lite";
  try {
    const res = await geminiGenerate({
      system: "You are a connectivity probe.",
      user: "Reply with exactly: OK",
      engine: { model, thinkingLevel: "low", codeExecution: false, label: "ping" },
      apiKey: opts.apiKey,
      timeoutMs: 30_000,
    });
    if (!/ok/i.test(res.text.slice(0, 64))) {
      return { ok: true, model }; // reachable + authenticated; wording may vary
    }
    return { ok: true, model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), model };
  }
}
