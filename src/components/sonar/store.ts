"use client";

import { create } from "zustand";
import type { BandDecision, DocBlock, OcrLine, PageState, SessionState, SonarDocument, SubjectSummary } from "./types";
import { setGeminiKey as persistGeminiKey } from "./types";

export type Step = "setup" | "processing" | "verify" | "document";

export type LogEntry = { t: string; msg: string; kind: "info" | "ok" | "warn" | "err" };

export type ProcessStage =
  | "idle"
  | "upload"
  | "research"
  | "analysis"
  | "layout"
  | "reading"
  | "done"
  | "error";

export type PageProgress = {
  pageId: string | null;
  pageIndex: number;
  stage: ProcessStage;
  bands: BandDecision[];
  readIndices: number[];
  totalBands: number;
  overlayBase64: string | null;
  deskewAngle: number;
  engine: string;
};

type SonarState = {
  step: Step;
  articles: SubjectSummary[];
  articlesLoaded: boolean;
  subject: string | null;
  uploads: string[]; // data URLs
  sessionId: string | null;
  session: SessionState | null;
  progress: PageProgress;
  logs: LogEntry[];
  activePage: number; // index into session.pages for verification
  activeBand: number | null; // band highlighted on verify step
  document: SonarDocument | null;
  generating: boolean;
  exporting: boolean;
  geminiKey: string; // BYOK — client-side only, sent per request

  setStep: (step: Step) => void;
  setArticles: (articles: SubjectSummary[]) => void;
  setSubject: (subject: string | null) => void;
  setUploads: (uploads: string[]) => void;
  setSession: (session: SessionState | null) => void;
  patchSessionPage: (pageId: string, patch: Partial<PageState>) => void;
  setProgress: (patch: Partial<PageProgress>) => void;
  log: (msg: string, kind?: LogEntry["kind"]) => void;
  clearLogs: () => void;
  setActivePage: (i: number) => void;
  setActiveBand: (i: number | null) => void;
  setDocument: (doc: SonarDocument | null) => void;
  setGenerating: (b: boolean) => void;
  setExporting: (b: boolean) => void;
  setGeminiKey: (key: string) => void;
  /** layout bands per page id — client-side record so ANY pipeline call can
   *  rebuild the page on a serverless instance that never saw it */
  bandsByPage: Record<string, BandDecision[]>;
  setBandsForPage: (pageId: string, bands: BandDecision[]) => void;
  reset: () => void;
};

const now = () => new Date().toLocaleTimeString([], { hour12: false });

// dev debugging aid: expose store snapshot (harmless in production)
if (typeof window !== "undefined") {
  (window as unknown as { __sonarGetState?: unknown }).__sonarGetState = () => useSonar.getState();
}

export const INITIAL_ARTICLES: SubjectSummary[] = [
  {
    subject: "sindhi",
    title: "Sindhi Script & Handwriting OCR",
    language: "Sindhi",
    nativeLabel: "سنڌي",
    direction: "rtl",
    icon: "reed",
    blurb: "Sindhi-Arabic script: 52+ letters, aspirates, retroflexes, implosives, Nastaliq/Naskh handwriting, dot logic and a full confusion atlas.",
    wordCount: 8120,
    version: 1,
    updatedAt: "2026-10-26T00:00:00.000Z",
    custom: false,
    editable: false,
  },
  {
    subject: "urdu",
    title: "Urdu Script & Handwriting OCR",
    language: "Urdu",
    nativeLabel: "اردو",
    direction: "rtl",
    icon: "nib",
    blurb: "Nastaliq cascades, 38–39 letter inventory, aspirate digraphs, nuqta evidence, word-stacking and diagonal line behaviour.",
    wordCount: 6540,
    version: 1,
    updatedAt: "2026-10-26T00:00:00.000Z",
    custom: false,
    editable: false,
  },
  {
    subject: "english",
    title: "English Handwriting & HTR",
    language: "English",
    nativeLabel: "English",
    direction: "ltr",
    icon: "pen",
    blurb: "Cursive, print and printscript styles, allographs, the minim problem, letter-confusion atlas and note-taking shorthand.",
    wordCount: 8113,
    version: 1,
    updatedAt: "2026-10-26T00:00:00.000Z",
    custom: false,
    editable: false,
  },
  {
    subject: "mathematics",
    title: "Handwritten Mathematics OCR",
    language: "Mathematics",
    nativeLabel: "Math",
    direction: "ltr",
    icon: "sigma",
    blurb: "Symbols and regional digit variants, 2-D structures (fractions, radicals, exponents), LaTeX conversion and structural rules.",
    wordCount: 7420,
    version: 1,
    updatedAt: "2026-10-26T00:00:00.000Z",
    custom: false,
    editable: false,
  },
];

export const useSonar = create<SonarState>((set) => ({
  step: "setup",
  articles: INITIAL_ARTICLES,
  articlesLoaded: true,
  subject: "english",
  uploads: [],
  sessionId: null,
  session: null,
  progress: {
    pageId: null,
    pageIndex: 0,
    stage: "idle",
    bands: [],
    readIndices: [],
    totalBands: 0,
    overlayBase64: null,
    deskewAngle: 0,
    engine: "",
  },
  logs: [],
  activePage: 0,
  activeBand: null,
  document: null,
  generating: false,
  exporting: false,
  // BYOK key is hydrated AFTER mount (see SetupStep's init effect) — it must
  // stay "" during SSR and the first client render, otherwise the engine
  // chips render differently on server vs client and React throws a
  // hydration mismatch (localStorage must never be read during render).
  geminiKey: "",
  bandsByPage: {},

  setStep: (step) => set({ step }),
  setArticles: (articles) => set({ articles, articlesLoaded: true }),
  setSubject: (subject) => set({ subject }),
  setUploads: (uploads) => set({ uploads }),
  setSession: (session) =>
    set({ session, sessionId: session?.id ?? null }),
  patchSessionPage: (pageId, patch) =>
    set((s) => {
      if (!s.session) return {};
      return {
        session: {
          ...s.session,
          pages: s.session.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
        },
      };
    }),
  setProgress: (patch) => set((s) => ({ progress: { ...s.progress, ...patch } })),
  log: (msg, kind = "info") => set((s) => ({ logs: [...s.logs.slice(-120), { t: now(), msg, kind }] })),
  clearLogs: () => set({ logs: [] }),
  setActivePage: (activePage) => set({ activePage }),
  setActiveBand: (activeBand) => set({ activeBand }),
  setDocument: (document) => set({ document }),
  setGenerating: (generating) => set({ generating }),
  setGeminiKey: (key) => set({ geminiKey: persistGeminiKey(key) }),
  setBandsForPage: (pageId, bands) =>
    set((s) => ({ bandsByPage: { ...s.bandsByPage, [pageId]: bands } })),
  setExporting: (exporting) => set({ exporting }),
  reset: () =>
    set({
      step: "setup",
      subject: null,
      uploads: [],
      sessionId: null,
      session: null,
      progress: {
        pageId: null,
        pageIndex: 0,
        stage: "idle",
        bands: [],
        readIndices: [],
        totalBands: 0,
        overlayBase64: null,
        deskewAngle: 0,
        engine: "",
      },
      logs: [],
      activePage: 0,
      activeBand: null,
      document: null,
      generating: false,
      exporting: false,
      bandsByPage: {},
    }),
}));

/* helpers shared by steps */

export function upsertLines(page: PageState, lines: OcrLine[]): PageState {
  const map = new Map(page.lines.map((l) => [l.index, l]));
  for (const l of lines) map.set(l.index, { ...map.get(l.index), ...l });
  return { ...page, lines: Array.from(map.values()).sort((a, b) => a.index - b.index) };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function blockId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export type { DocBlock };
