"use client";

import { create } from "zustand";
import type { BandDecision, DocBlock, OcrLine, PageState, SessionState, SonarDocument, SubjectSummary } from "./types";

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
  reset: () => void;
};

const now = () => new Date().toLocaleTimeString([], { hour12: false });

// dev debugging aid: expose store snapshot (harmless in production)
if (typeof window !== "undefined") {
  (window as unknown as { __sonar?: unknown }).__sonarGetState = () => useSonar.getState();
}

export const useSonar = create<SonarState>((set) => ({
  step: "setup",
  articles: [],
  articlesLoaded: false,
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
