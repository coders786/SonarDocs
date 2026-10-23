"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Feather,
  FileText,
  ImagePlus,
  Languages,
  Sigma,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useSonar } from "./store";
import { api, fileToDownscaledDataUrl, type SubjectSummary } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

export default function SetupStep() {
  const articles = useSonar((s) => s.articles);
  const subject = useSonar((s) => s.subject);
  const setSubject = useSonar((s) => s.setSubject);
  const uploads = useSonar((s) => s.uploads);
  const setUploads = useSonar((s) => s.setUploads);
  const setStep = useSonar((s) => s.setStep);
  const clearLogs = useSonar((s) => s.clearLogs);
  const log = useSonar((s) => s.log);

  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Array<{ id: string; subject: string; status: string; updatedAt: string; pages: Array<{ id: string; status: string }> }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .listSessions()
      .then((r) => setRecent(r.sessions.slice(0, 4)))
      .catch(() => setRecent([]));
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
                onClick={() => setSubject(a.subject)}
                aria-pressed={active}
                className={`group relative flex h-full flex-col rounded-2xl border p-4 text-left transition-all ${
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
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-amber-800">
                    {a.wordCount.toLocaleString()} words of research
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          2 · Add handwritten page photos
        </h2>
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
          className={`dropzone flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 p-8 text-center ${
            dragging ? "drag" : ""
          }`}
        >
          {busy ? (
            <p className="text-sm text-stone-500">Processing images…</p>
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-amber-700" aria-hidden />
              <p className="text-sm font-medium text-stone-700">
                Drop page photos here, paste from clipboard, or click to browse
              </p>
              <p className="text-xs text-stone-400">JPG / PNG / WebP · up to 8 pages · phone photos work fine</p>
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
                { }
                <img
                  src={u}
                  alt={`Page ${i + 1} preview`}
                  className="h-24 w-20 rounded-lg border border-stone-200 object-cover shadow-sm"
                />
                <span className="absolute bottom-1 left-1 rounded bg-stone-900/70 px-1.5 text-[10px] font-medium text-white">
                  {i + 1}
                </span>
                <button
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
                  window.location.href = `/?session=${s.id}`;
                }}
                className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-amber-300 hover:text-amber-900"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                {s.subject} · {s.pages.length} page{s.pages.length === 1 ? "" : "s"} · {s.status}
                <span className="text-stone-400">
                  {new Date(s.updatedAt).toLocaleDateString()}
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
          Dossier ready: “{selected.title}” — {selected.wordCount.toLocaleString()} words, v{selected.version}. It
          will be injected into the OCR system prompt.
        </p>
      )}
    </div>
  );
}
