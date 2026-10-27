import ZAI from "z-ai-web-dev-sdk";
import { engineForSubject, geminiEnabled, geminiGenerate } from "@/lib/gemini";

/** Re-exported so routes/UI can describe the active engine without importing the module twice. */
export { engineForSubject, geminiEnabled } from "@/lib/gemini";

/**
 * Multi-provider AI gateway.
 *
 * Provider priority:
 *   1. Gemini — active when GEMINI_API_KEY (or GOOGLE_API_KEY) is set. Model,
 *      thinking level and code execution are chosen per subject
 *      (see src/lib/gemini.ts).
 *   2. Z.ai SDK — the always-available fallback. Used directly when Gemini is
 *      not configured, and used to absorb individual Gemini failures
 *      (rate limits, outages) so a running pipeline never breaks.
 */

/** Per-call engine hints threaded from the routes (which know the session subject + BYOK key). */
export type EngineHints = { subject?: string; direction?: "rtl" | "ltr"; apiKey?: string };

/**
 * Race a model promise against a hard deadline.
 *
 * WHY THIS EXISTS: every HTTP request from the browser passes through the
 * preview gateway, which kills connections that stay idle too long and
 * answers the client with a 502 — even though the server eventually
 * finishes. A single vision call on a full page image can take 40-70s, and
 * retry loops used to stack 3-4 of them inside ONE request (the "layout
 * takes 2.3 minutes → Request failed (502)" bug). Every model call must
 * therefore be individually bounded so the enclosing route can still
 * degrade gracefully (e.g. fall back to python candidate bands) and answer
 * in time.
 *
 * The loser of the race keeps running server-side (we cannot abort the SDK
 * call), but the caller returns immediately.
 */
export function raceWithTimeout<T>(p: Promise<T>, ms: number, label = "model call"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** The SDK client instance type (constructor is private, so infer from create()). */
type ZaiClient = Awaited<ReturnType<typeof ZAI.create>>;

let zaiPromise: Promise<ZaiClient> | null = null;

/**
 * Create the SDK client. Configuration priority:
 *  1. ZAI_BASE_URL + ZAI_API_KEY env vars (used on Vercel / self-hosting,
 *     where /etc/.z-ai-config does not exist).
 *  2. The SDK's own config file discovery (sandbox / local dev).
 */
async function createZai(): Promise<ZaiClient> {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (baseUrl && apiKey) {
    // constructor is private in the typings but functional — cast through
    const Ctor = ZAI as unknown as new (config: Record<string, string>) => ZaiClient;
    return new Ctor({ baseUrl, apiKey });
  }
  try {
    return await ZAI.create();
  } catch (err) {
    if (/configuration file/i.test(err instanceof Error ? err.message : String(err))) {
      throw new AiConfigError(
        "AI client is not configured on this host. Set the ZAI_BASE_URL and ZAI_API_KEY environment variables (Project → Settings → Environment Variables), then redeploy. Any chat-completions + vision compatible endpoint works.",
      );
    }
    throw err;
  }
}

export async function getZai(): Promise<ZaiClient> {
  if (!zaiPromise) {
    zaiPromise = createZai();
  }
  return zaiPromise;
}

export type VisionImage = { mime: string; base64: string };

export function imageContentPart(img: VisionImage) {
  return {
    type: "image_url" as const,
    image_url: { url: `data:${img.mime};base64,${img.base64}` },
  };
}

/**
 * Run a vision chat completion. The system prompt carries the subject's full
 * research article; user prompt carries the task; images are passed as
 * base64 data URLs.
 *
 * Gemini first (when configured, subject-matched engine), Z.ai fallback.
 */
export async function visionChat(
  system: string,
  user: string,
  images: VisionImage[],
  opts: { thinking?: boolean; timeoutMs?: number } & EngineHints = {},
): Promise<string> {
  if (geminiEnabled(opts.apiKey)) {
    try {
      const engine = engineForSubject(opts.subject || "", opts.direction || "ltr");
      const res = await raceWithTimeout(
        geminiGenerate({ system, user, images, engine, apiKey: opts.apiKey, timeoutMs: opts.timeoutMs }),
        opts.timeoutMs ?? 120_000,
        "Gemini vision call",
      );
      return res.text;
    } catch (err) {
      console.warn("[ai] Gemini vision call failed — falling back to Z.ai:", err instanceof Error ? err.message : err);
    }
  }
  const zai = await getZai();
  const content: Array<Record<string, unknown>> = [{ type: "text", text: user }];
  for (const img of images) content.push(imageContentPart(img));
  const completion = await raceWithTimeout(
    zai.chat.completions.createVision({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content } as never,
      ],
      thinking: { type: opts.thinking ? "enabled" : "disabled" },
    } as never),
    opts.timeoutMs ?? 90_000,
    "vision model call",
  );
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Empty vision model response");
  return text;
}

/**
 * Plain text chat completion (used by the document AI).
 * Gemini first (when configured, subject-matched engine), Z.ai fallback.
 */
export async function textChat(
  system: string,
  user: string,
  opts: EngineHints & { timeoutMs?: number } = {},
): Promise<string> {
  if (geminiEnabled(opts.apiKey)) {
    try {
      const engine = engineForSubject(opts.subject || "", opts.direction || "ltr");
      const res = await raceWithTimeout(
        geminiGenerate({ system, user, engine, apiKey: opts.apiKey, timeoutMs: opts.timeoutMs }),
        opts.timeoutMs ?? 120_000,
        "Gemini text call",
      );
      return res.text;
    } catch (err) {
      console.warn("[ai] Gemini text call failed — falling back to Z.ai:", err instanceof Error ? err.message : err);
    }
  }
  const zai = await getZai();
  const completion = await raceWithTimeout(
    zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      thinking: { type: "disabled" },
    }),
    opts.timeoutMs ?? 90_000,
    "text model call",
  );
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Empty model response");
  return text;
}

/** Extract the first JSON value from a model response (tolerates fences/prose). */
export function extractJson<T = unknown>(raw: string): T {
  let text = raw.trim();
  // strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  // direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    /* keep going */
  }
  // repair: shorthand boxes — models often emit {"x": 54, 56, 680, 106}
  // (dropping the y/w/h key names) or "box": [54, 56, 680, 106]
  let repaired = text.replace(
    /"box"\s*:\s*\{\s*"x"\s*:\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\}/g,
    '"box":{"x":$1,"y":$2,"w":$3,"h":$4}',
  );
  repaired = repaired.replace(
    /"box"\s*:\s*\[\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g,
    '"box":{"x":$1,"y":$2,"w":$3,"h":$4}',
  );
  // repair: nested boxes — "box":{"box":{...}} → "box":{...}
  for (let i = 0; i < 4; i++) {
    const next = repaired.replace(/"box"\s*:\s*\{\s*"box"\s*:\s*/g, '"box":');
    if (next === repaired) break;
    repaired = next;
  }
  // repair: trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");
  // repair: LaTeX backslashes — "\sqrt{x}" is invalid JSON (only \" \\ \/ \b \f \n \r \t \uXXXX are legal)
  repaired = repaired.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  if (repaired !== text) {
    try {
      return JSON.parse(repaired) as T;
    } catch {
      /* keep going */
    }
  }
  // find first {...} or [...] block
  for (const [open, close] of [
    ["{", "}"],
    ["[", "]"],
  ] as const) {
    const start = text.indexOf(open);
    if (start === -1) continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          const slice = text.slice(start, i + 1);
          try {
            return JSON.parse(slice) as T;
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error(`Could not parse JSON from model response: ${raw.slice(0, 300)}`);
}

/** Error thrown when the AI client itself is not configured (env/missing). */
export class AiConfigError extends Error {}

/** Detect rate-limit errors so callers can back off. */
function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|too many requests|rate limit/i.test(msg);
}

/** Config errors must not be retried — surface them immediately. */
function isConfigError(err: unknown): boolean {
  return err instanceof AiConfigError || /not configured|configuration file/i.test(err instanceof Error ? err.message : String(err));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Options shared by the JSON-forcing wrappers.
 *
 * `timeoutMs` bounds ONE model attempt; `deadlineMs` bounds the WHOLE
 * wrapper (all attempts combined) so callers can guarantee the enclosing
 * HTTP request answers inside the preview gateway's patience.
 */
export type JsonCallOpts = { retries?: number; timeoutMs?: number; deadlineMs?: number } & EngineHints;

/** Remaining budget in ms from `startedAt` until `deadlineMs`, minimum 0. */
function remainingBudget(startedAt: number, deadlineMs?: number): number {
  if (!deadlineMs || !Number.isFinite(deadlineMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, deadlineMs - (Date.now() - startedAt));
}

/**
 * Vision call that must return JSON — retries with feedback when the model
 * emits malformed JSON (a common failure mode with large system prompts) and
 * backs off on rate limits. Hard-bounded by `timeoutMs`/`deadlineMs`.
 */
export async function visionJson<T>(
  system: string,
  user: string,
  images: VisionImage[],
  opts: JsonCallOpts = {},
): Promise<T> {
  const retries = opts.retries ?? 1;
  const startedAt = Date.now();
  let lastError: unknown = null;
  let rateLimited = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const budget = remainingBudget(startedAt, opts.deadlineMs ?? opts.timeoutMs);
    if (attempt > 0 && budget < 4_000) break; // no time for another round-trip
    const attemptTimeout = Math.min(opts.timeoutMs ?? 90_000, budget) || 4_000;
    let raw = "";
    try {
      raw = await visionChat(
        system,
        attempt === 0
          ? user
          : `${user}\n\nIMPORTANT: your previous reply was not parseable (${lastError instanceof Error ? lastError.message.slice(0, 160) : "invalid JSON"}). Respond again with ONLY the valid JSON object, double-checking that every key and value is properly quoted and separated.`,
        images,
        { subject: opts.subject, direction: opts.direction, apiKey: opts.apiKey, timeoutMs: attemptTimeout },
      );
    } catch (err) {
      lastError = err;
      if (isConfigError(err)) throw err; // no point retrying
      if (isRateLimitError(err) && rateLimited < 3) {
        rateLimited++;
        await sleep(15000 * rateLimited);
        attempt--; // retry the same attempt after backing off
        continue;
      }
      continue;
    }
    try {
      return extractJson<T>(raw);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Model did not return valid JSON");
}

/** Text call that must return JSON — same retry behaviour. */
export async function textJson<T>(system: string, user: string, opts: JsonCallOpts = {}): Promise<T> {
  const retries = opts.retries ?? 1;
  const startedAt = Date.now();
  let lastError: unknown = null;
  let rateLimited = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const budget = remainingBudget(startedAt, opts.deadlineMs ?? opts.timeoutMs);
    if (attempt > 0 && budget < 4_000) break; // no time for another round-trip
    const attemptTimeout = Math.min(opts.timeoutMs ?? 90_000, budget) || 4_000;
    let raw = "";
    try {
      raw = await textChat(
        system,
        attempt === 0
          ? user
          : `${user}\n\nIMPORTANT: your previous reply was not parseable (${lastError instanceof Error ? lastError.message.slice(0, 160) : "invalid JSON"}). Respond again with ONLY the valid JSON object.`,
        { subject: opts.subject, direction: opts.direction, apiKey: opts.apiKey, timeoutMs: attemptTimeout },
      );
    } catch (err) {
      lastError = err;
      if (isConfigError(err)) throw err; // no point retrying
      if (isRateLimitError(err) && rateLimited < 3) {
        rateLimited++;
        await sleep(15000 * rateLimited);
        attempt--;
        continue;
      }
      continue;
    }
    try {
      return extractJson<T>(raw);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Model did not return valid JSON");
}
