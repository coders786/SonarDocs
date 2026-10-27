"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  Feather,
  FileText,
  ImagePlus,
  Languages,
  Sigma,
  Sparkles,
  Trash2,
  Type,
  X,
  Zap,
} from "lucide-react";
import { useSonar } from "./store";
import { api, fileToDownscaledDataUrl, initGeminiKey, type SubjectSummary } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CameraGuideDialog } from "./CameraGuideDialog";
import { SAMPLE_PAGES } from "@/lib/sample-pages";

function SubjectIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "reed":
      return <Feather className={className} aria-hidden />;
    case "nib":
      return <Languages className={className} aria-hidden />;
    case "pen":
      return <Type className={className} aria-hidden />;
    case "sigma":
      return <Sigma className={className} aria-hidden />;
    default:
      return <BookOpen className={className} aria-hidden />;
  }
}

type EngineSubjectConf = { subject: string; model: string; thinkingLevel: string; codeExecution: boolean; label: string };
type EngineInfo = { gemini: boolean; subjects: EngineSubjectConf[] };

/**
 * Deterministic formatters — `toLocaleString()`/`toLocaleDateString()` use
 * the runtime's locale, which differs between the Node server and the user's
 * browser (React hydration bullet #4: "Date formatting in a user's locale
 * which doesn't match the server"). Fixed-locale + fixed-timezone Intl
 * formatters render byte-identical strings on both sides.
 */
const FMT_INT = new Intl.NumberFormat("en-US");
const FMT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const fmtInt = (n: number) => FMT_INT.format(n);
export const fmtDate = (iso: string) => FMT_DATE.format(new Date(iso));

/**
 * Compact chip text for a subject's engine assignment (mirrors server rule
 * for custom subjects). BYOK: when the user stored their own key the Gemini
 * engines are active client-side even if the server has no env key.
 */
function engineChip(a: SubjectSummary, info: EngineInfo | null, byokKey: string): { text: string; active: boolean } | null {
  if (byokKey) {
    const conf = info?.subjects.find((s) => s.subject === a.subject);
    const [model, thinking] = (conf ? conf.label : a.direction === "rtl" ? "Gemini 3.5 Flash · medium thinking · code execution" : "Gemini 3.5 Flash Lite · high thinking").split("·").map((p) => p.trim());
    return { text: `Gemini (your key) · ${model.replace(/^Gemini /i, "")} · ${(thinking || "").replace(" thinking", "")} · code exec`, active: true };
  }
  if (!info) return null;
  if (!info.gemini) return { text: "Z.ai fallback · add GEMINI_API_KEY", active: false };
  const conf = info.subjects.find((s) => s.subject === a.subject);
  if (conf) {
    const [model, thinking] = conf.label.split("·").map((p) => p.trim());
    return { text: `${model} · ${(thinking || "").replace(" thinking", "")} · code exec`, active: true };
  }
  // custom subject — same rule as engineForSubject(): custom RTL = hard engine
  return a.direction === "rtl"
    ? { text: "Gemini 3.5 Flash · medium · code exec", active: true }
    : { text: "Gemini 3.5 Flash Lite · high · code exec", active: true };
}

export default function SetupStep() {
  const articles = useSonar((s) => s.articles);
  const subject = useSonar((s) => s.subject);
  const setSubject = useSonar((s) => s.setSubject);
  const byokKey = useSonar((s) => s.geminiKey);
  const uploads = useSonar((s) => s.uploads);
  const setUploads = useSonar((s) => s.setUploads);
  const setStep = useSonar((s) => s.setStep);
  const setSession = useSonar((s) => s.setSession);
  const setActivePage = useSonar((s) => s.setActivePage);
  const setDocument = useSonar((s) => s.setDocument);
  const clearLogs = useSonar((s) => s.clearLogs);
  const log = useSonar((s) => s.log);

  const loadRecent = async (sessionId: string) => {
    try {
      const { session } = await api.getSession(sessionId);
      if (!session.pages.length) return;
      setSession(session);
      setSubject(session.subject);
      const firstUnverified = session.pages.findIndex((p) => p.status !== "verified");
      if (session.documents.length > 0) {
        try {
          const { document } = await api.getDocument(session.documents[0].id);
          setDocument(document);
        } catch {
          /* ignore */
        }
        setStep("document");
      } else if (firstUnverified !== -1) {
        setActivePage(firstUnverified);
        setStep("verify");
      } else {
        setStep("verify");
      }
    } catch (err) {
      console.error("Failed to load session", err);
    }
  };

  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraGuideOpen, setCameraGuideOpen] = useState(false);
  const [engine, setEngine] = useState<EngineInfo | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; subject: string; status: string; updatedAt: string; pages: Array<{ id: string; status: string }> }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // BYOK key lives in localStorage — load it strictly AFTER hydration.
    // Reading it during render/store-creation made the engine chips differ
    // between server HTML and first client render (hydration mismatch).
    const stored = initGeminiKey();
    if (stored && stored !== useSonar.getState().geminiKey) {
      useSonar.setState({ geminiKey: stored });
    }
    api
      .listSessions()
      .then((r) => setRecent(r.sessions.slice(0, 4)))
      .catch(() => setRecent([]));
    fetch("/api/engine")
      .then((r) => r.json())
      .then((d: EngineInfo) => setEngine(d))
      .catch(() => setEngine(null));
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) return;
      setBusy(true);
      try {
        const dataUrls: string[] = [];
        for (const f of imgs.slice(0, 8)) {
          try {
            dataUrls.push(await fileToDownscaledDataUrl(f));
          } catch {
            log(`Could not read ${f.name}`, "warn");
          }
        }
        setUploads([...uploads, ...dataUrls].slice(0, 8));
      } finally {
        setBusy(false);
      }
    },
    [uploads, setUploads, log],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  // paste support
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) void addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const selected: SubjectSummary | undefined = articles.find((a) => a.subject === subject);

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Turn handwritten notes into clean documents
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Pick a subject — its deep-research dossier (script reference, confusion atlas, OCR protocol) is loaded
          into the AI&apos;s system prompt. Python deskews the page and cuts focused crops; the AI reads them
          line by line; <strong className="text-stone-800">you check every line</strong>; then the document AI
          writes the final document.
        </p>
      </section>

      {/* subjects */}
      <section aria-label="Select a subject">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          1 · Select subject (loads its research dossier)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((a) => {
            const active = a.subject === subject;
            return (
              <button
                key={a.subject}
                type="button"
                onClick={() => {
                  setSubject(a.subject);
                  const matched = SAMPLE_PAGES.find((s) => s.subject === a.subject);
                  if (matched && uploads.length === 0) {
                    setUploads([matched.dataUrl]);
                    log(`Loaded ${a.language} sample page automatically.`, "ok");
                  }
                }}
                aria-pressed={active}
                className={`group relative flex h-full flex-col rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  active
                    ? "border-amber-600 bg-amber-50/80 shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
                    : "border-stone-200 bg-white/80 hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ${
                      active ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-600 group-hover:bg-amber-100 group-hover:text-amber-800"
                    }`}
                  >
                    <SubjectIcon icon={a.icon} className="h-5 w-5" />
                  </span>
                  {active && (
                    <span className="rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      loaded
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-base font-semibold text-stone-900">{a.language}</span>
                  {a.nativeLabel && (
                    <span
                      className={`text-lg ${a.direction === "rtl" ? (a.subject === "urdu" ? "font-urdu" : "font-sindhi") : ""} text-stone-500`}
                      dir={a.direction === "rtl" ? "rtl" : "ltr"}
                    >
                      {a.nativeLabel}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-stone-500">{a.blurb}</p>
                {(() => {
                  const chip = engineChip(a, engine, byokKey);
                  if (!chip) return null;
                  return (
                    <div
                      className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                        chip.active
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-stone-500"
                      }`}
                      title={`OCR + document AI engine for this subject${chip.active ? "" : " — open Engine settings to add your Gemini key, or set GEMINI_API_KEY in .env"}`}
                    >
                      <Zap className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{chip.text}</span>
                    </div>
                  );
})()}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-amber-800">
                    {fmtInt(a.wordCount)} words of research
                  </span>
                  <Badge variant="outline" className="border-stone-200 text-[10px] text-stone-500">
                    {a.direction === "rtl" ? "RTL" : "LTR"}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* dropzone */}
      <section aria-label="Upload handwritten pages">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            2 · Add handwritten page photos
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCameraGuideOpen(true)}
            className="gap-2 border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-medium shadow-xs"
          >
            <Camera className="h-4 w-4 text-amber-700" />
            <span>Camera Photo Guide</span>
          </Button>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload images: drag and drop, paste, or click to browse"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`dropzone flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 p-8 text-center border-2 border-dashed border-stone-200 hover:border-amber-400 transition-colors ${
            dragging ? "drag border-amber-500 bg-amber-50/50" : ""
          }`}
        >
          {busy ? (
            <p className="text-sm text-stone-500">Processing images…</p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Camera className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                  <ImagePlus className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">
                  Drop page photos here, paste from clipboard, or click to browse
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  JPG / PNG / WebP · up to 8 pages · camera photos work great
                </p>
              </div>

              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCameraGuideOpen(true);
                  }}
                  className="gap-1.5 bg-amber-700 text-white hover:bg-amber-800 shadow-sm"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Take Photo & Camera Guide
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="gap-1.5 border-stone-300 bg-white hover:bg-stone-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Browse Files
                </Button>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {uploads.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {uploads.map((u, i) => (
              <div key={i} className="group relative">
                <img
                  src={u}
                  alt={`Page ${i + 1} preview`}
                  className="h-24 w-20 rounded-lg border border-stone-200 object-cover shadow-sm"
                />
                <span className="absolute bottom-1 left-1 rounded bg-stone-900/70 px-1.5 text-[10px] font-medium text-white">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setUploads(uploads.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 hidden h-6 w-6 place-items-center rounded-full bg-red-600 text-white shadow group-hover:grid"
                  aria-label={`Remove page ${i + 1}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sample Pages section */}
        <div className="mt-6 border-t border-stone-200/80 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-700" />
              <span>Or Try a Sample Handwritten Page (1-Click Demo)</span>
            </h3>
            <span className="text-[11px] text-stone-500">Instant test · no upload needed</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {SAMPLE_PAGES.map((sample) => {
              const isSelected = subject === sample.subject && uploads.includes(sample.dataUrl);
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    setSubject(sample.subject);
                    setUploads([sample.dataUrl]);
                    log(`Loaded 1-click sample: ${sample.title} (${sample.subject})`, "ok");
                  }}
                  className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? "border-amber-600 bg-amber-50/90 shadow-sm ring-1 ring-amber-500"
                      : "border-stone-200 bg-white/90 hover:border-amber-400 hover:bg-amber-50/40"
                  }`}
                >
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                    <img
                      src={sample.dataUrl}
                      alt={sample.title}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute inset-0 grid place-items-center bg-amber-900/40 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold capitalize text-stone-900">{sample.subject}</span>
                      {isSelected && (
                        <span className="rounded bg-amber-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs font-medium text-stone-700">{sample.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-stone-500">{sample.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* recent sessions */}
      {recent.length > 0 && (
        <section aria-label="Recent sessions">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Resume recent work</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  loadRecent(s.id);
                }}
                className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-amber-300 hover:text-amber-900"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                {s.subject} · {s.pages.length} page{s.pages.length === 1 ? "" : "s"} · {s.status}
                <span className="text-stone-400">
                  {fmtDate(s.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* start */}
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!subject || uploads.length === 0}
          onClick={() => {
            clearLogs();
            setStep("processing");
          }}
          className="gap-2 bg-amber-700 px-6 text-white hover:bg-amber-800 disabled:opacity-40"
        >
          Start research-driven OCR
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {selected && (
        <p className="text-center text-xs text-stone-400">
          <Trash2 className="mr-1 inline h-3 w-3" aria-hidden />
          Dossier ready: “{selected.title}” — {fmtInt(selected.wordCount)} words, v{selected.version}. It
          will be injected into the OCR system prompt.
        </p>
      )}

      {cameraGuideOpen && <CameraGuideDialog open={cameraGuideOpen} onOpenChange={setCameraGuideOpen} />}
    </div>
  );
}
