"use client";

/** Shared types for the Sonar Docs frontend. */

export type SubjectSummary = {
  subject: string;
  title: string;
  language: string;
  nativeLabel: string;
  direction: "rtl" | "ltr";
  icon: string;
  blurb: string;
  wordCount: number;
  version: number;
  updatedAt: string;
  custom: boolean;
  editable: boolean;
};

export type Article = SubjectSummary & { content: string };

export type BandDecision = {
  index: number;
  box: { x: number; y: number; w: number; h: number };
  kind: string;
  preliminary: string;
  needsZoom: boolean;
  reason: string;
};

export type AltReading = { text: string; note?: string };

export type OcrLine = {
  id: string;
  index: number;
  kind: string;
  text: string;
  latex: string | null;
  confidence: "high" | "medium" | "low" | "illegible" | string;
  alternatives: AltReading[];
  notes: string | null;
  cropBase64: string | null;
  status: string;
  verifiedText?: string | null;
  bbox?: { x: number; y: number; w: number; h: number } | null;
};

export type PageState = {
  id: string;
  index: number;
  status: string;
  imageBase64: string;
  overlayBase64: string | null;
  width: number | null;
  height: number | null;
  lines: OcrLine[];
};

export type SessionState = {
  id: string;
  subject: string;
  status: string;
  pages: PageState[];
  documents: Array<{ id: string; title: string; updatedAt: string }>;
};

export type DocBlock = {
  id: string;
  type: "title" | "subtitle" | "heading" | "paragraph" | "list-item" | "math" | "quote" | "note" | "divider";
  text: string;
  latex?: string;
  level?: number;
};

export type DocType = "transcript" | "formatted-notes" | "essay" | "study-sheet";

export type SonarDocument = {
  id: string;
  title: string;
  docType: DocType | string;
  subject: string;
  blocks: DocBlock[];
};

/* ---------------- API client ---------------- */

/** Map the raw Prisma session shape to the frontend shapes. */
function mapSession(raw: {
  id: string;
  subject: string;
  status: string;
  pages?: Array<{
    id: string;
    index: number;
    status: string;
    imageBase64: string;
    overlayBase64: string | null;
    width: number | null;
    height: number | null;
    lines?: Array<Record<string, unknown>>;
  }>;
  documents?: Array<Record<string, unknown>>;
}): SessionState {
  return {
    id: raw.id,
    subject: raw.subject,
    status: raw.status,
    pages: (raw.pages || []).map((p) => ({
      id: p.id,
      index: p.index,
      status: p.status,
      imageBase64: p.imageBase64,
      overlayBase64: p.overlayBase64,
      width: p.width,
      height: p.height,
      lines: (p.lines || [])
        .map((l) => ({
          id: l.id as string,
          index: l.order as number,
          kind: l.kind as string,
          text: l.text as string,
          latex: (l.latex as string | null) ?? null,
          confidence: l.confidence as string,
          alternatives: safeJsonArray(l.alternatives as string | AltReading[] | null),
          notes: (l.notes as string | null) ?? null,
          cropBase64: (l.cropBase64 as string | null) ?? null,
          bbox: safeJson(l.bbox as string | null) as OcrLine["bbox"],
          status: l.status as string,
          verifiedText: (l.verifiedText as string | null) ?? null,
        }))
        .sort((a, b) => a.index - b.index),
    })),
    documents: (raw.documents || []) as SessionState["documents"],
  };
}

function safeJson(s: string | null): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Accept either a JSON string (DB shape) or an already-parsed array (API shape). */
function safeJsonArray(s: string | AltReading[] | null): AltReading[] {
  if (Array.isArray(s)) return s as AltReading[];
  const v = safeJson(s);
  return Array.isArray(v) ? (v as AltReading[]) : [];
}

/* ---------------- BYOK: user's own Gemini key ---------------- */

/**
 * BYOK (bring your own key). The Gemini key lives in the browser's
 * localStorage only — it is sent per-request in the `x-gemini-key` header and
 * is never persisted server-side. When present it overrides the server's
 * env key for every AI call.
 */
const GEMINI_KEY_STORAGE = "sonar.gemini-key";
let geminiKey = "";

export function initGeminiKey(): string {
  if (typeof window !== "undefined") {
    try {
      geminiKey = window.localStorage.getItem(GEMINI_KEY_STORAGE) || "";
    } catch {
      geminiKey = "";
    }
  }
  return geminiKey;
}

export function getGeminiKey(): string {
  return geminiKey;
}

export function setGeminiKey(key: string): string {
  geminiKey = String(key || "").trim();
  if (typeof window !== "undefined") {
    try {
      if (geminiKey) window.localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey);
      else window.localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch {
      /* storage unavailable */
    }
  }
  return geminiKey;
}

function authHeaders(): Record<string, string> {
  initGeminiKey();
  return geminiKey ? { "x-gemini-key": geminiKey } : {};
}

/**
 * True for failures that are usually transient infrastructure, not the app:
 * the preview gateway answering 502/503/504 (upstream busy or briefly cut),
 * or the fetch itself rejecting (network blip). One quiet retry absorbs
 * these without user-visible errors.
 */
function isTransientFailure(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    // network blip / gateway cut — one retry before giving up
    await new Promise((r) => setTimeout(r, 900));
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
  }
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* empty body (e.g. raw gateway error page) */
  }
  if (!res.ok && isTransientFailure(res.status)) {
    await new Promise((r) => setTimeout(r, 900));
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    try {
      data = await res.json();
    } catch {
      /* keep {} */
    }
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const doFetch = () =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
  let res: Response;
  try {
    res = await doFetch();
  } catch {
    await new Promise((r) => setTimeout(r, 900));
    res = await doFetch();
  }
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok && isTransientFailure(res.status)) {
    await new Promise((r) => setTimeout(r, 900));
    res = await doFetch();
    try {
      data = await res.json();
    } catch {
      /* keep {} */
    }
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  /** Validate a Gemini key (defaults to the stored one) with a one-token ping. */
  testEngine: (key?: string): Promise<{ ok: boolean; error?: string; model: string }> => {
    initGeminiKey();
    const k = (key || geminiKey).trim();
    return fetch("/api/engine/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(k ? { "x-gemini-key": k } : {}) },
      body: "{}",
    }).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; model?: string };
      if (!res.ok && !data.error) return { ok: false, error: `Request failed (${res.status})`, model: "" };
      return { ok: !!data.ok, error: data.error, model: data.model || "" };
    });
  },
  listArticles: () => get<{ articles: SubjectSummary[] }>("/api/research"),
  getArticle: (subject: string) => get<{ article: Article }>(`/api/research?subject=${encodeURIComponent(subject)}`),
  saveArticle: (payload: { subject: string; title: string; content: string }) =>
    put<{ article: Article }>("/api/research", payload),
  createArticle: (payload: { title: string; language: string; direction: "rtl" | "ltr"; content: string }) =>
    post<{ article: Article }>("/api/research", payload),

  ocrStart: (payload: { subject: string; imageBase64: string; sessionId?: string; index: number }) =>
    post<{
      sessionId: string;
      pageId: string;
      index: number;
      engine: string;
      width: number;
      height: number;
      deskewAngle: number;
      candidateCount: number;
      articleWords: number;
    }>("/api/ocr/start", payload),
  ocrLayout: (payload: { pageId: string }) =>
    post<{ engine: string; bands: BandDecision[]; articleWords: number }>("/api/ocr/layout", payload),
  ocrRead: (payload: { pageId: string; indices: number[] }) =>
    post<{ lines: OcrLine[] }>("/api/ocr/read", payload),
  ocrRetryLine: (payload: { lineId: string }) => post<{ line: OcrLine }>("/api/ocr/retry-line", payload),
  ocrReview: (payload: { pageId: string; lines: Array<{ id: string; verifiedText: string; status: string }> }) =>
    post<{ ok: boolean; sessionStatus: string }>("/api/ocr/review", payload),

  getSession: async (id: string) => {
    const r = await get<{ session: Parameters<typeof mapSession>[0] }>(`/api/session?id=${id}`);
    return { session: mapSession(r.session) };
  },
  listSessions: () =>
    get<{
      sessions: Array<{
        id: string;
        subject: string;
        status: string;
        updatedAt: string;
        pages: Array<{ id: string; status: string }>;
        documents: Array<{ id: string; title: string }>;
      }>;
    }>("/api/session"),

  generateDocument: (payload: { sessionId: string; docType: DocType; title?: string; instructions?: string }) =>
    post<{ document: SonarDocument }>("/api/document", payload),
  getDocument: (id: string) => get<{ document: SonarDocument }>(`/api/document?id=${id}`),
  saveDocument: (payload: { id: string; title: string; blocks: DocBlock[] }) =>
    put<{ document: SonarDocument }>("/api/document", payload),
  exportDocument: (payload: { id: string; format: "docx" | "md" | "txt" }) =>
    post<{ filename: string; mime: string; base64: string }>("/api/document/export", payload),
};

/* ---------------- client image helpers ---------------- */

/** Downscale an uploaded image to a data URL with max dimension `max`. */
export async function fileToDownscaledDataUrl(file: File, max = 2200, quality = 0.88): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale >= 1 && dataUrl.length < 4.5 * 1024 * 1024) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Trigger a browser download for a base64 file payload. */
export function downloadBase64(filename: string, mime: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function confidenceStyle(conf: string): { label: string; cls: string; dot: string } {
  switch (conf) {
    case "high":
      return { label: "High", cls: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" };
    case "medium":
      return { label: "Medium", cls: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" };
    case "low":
      return { label: "Low", cls: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-500" };
    default:
      return { label: "Illegible", cls: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" };
  }
}
