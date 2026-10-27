"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crop,
  Loader2,
  Ruler,
  ScanSearch,
  Search,
} from "lucide-react";
import { chunk, useSonar, upsertLines } from "./store";
import { api, type PageState } from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAGE_META = {
  analysis: { label: "Python page analysis", icon: Ruler, hint: "deskew · band detection · overlay" },
  layout: { label: "AI layout pass", icon: ScanSearch, hint: "research-informed band decisions" },
  reading: { label: "Focused OCR", icon: Search, hint: "python crops × research dossier" },
  done: { label: "Page complete", icon: CheckCircle2, hint: "" },
} as const;

export default function ProcessingStep() {
  const subject = useSonar((s) => s.subject);
  const uploads = useSonar((s) => s.uploads);
  const setSession = useSonar((s) => s.setSession);
  const patchPage = useSonar((s) => s.patchSessionPage);
  const setProgress = useSonar((s) => s.setProgress);
  const progress = useSonar((s) => s.progress);
  const logs = useSonar((s) => s.logs);
  const log = useSonar((s) => s.log);
  const setStep = useSonar((s) => s.setStep);
  const setActivePage = useSonar((s) => s.setActivePage);

  const [pages, setPages] = useState<PageState[]>([]);
  const [failedBands, setFailedBands] = useState<Record<string, number[]>>({});
  const [fatal, setFatal] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const failedIndexRef = useRef(0);

  /** run one full page: start → layout → read batches */
  const runPage = useCallback(
    async (imageBase64: string, index: number, sid: string | null): Promise<PageState> => {
      setProgress({ pageIndex: index, stage: "analysis", bands: [], readIndices: [], totalBands: 0, overlayBase64: null, pageId: null });
      log(`Page ${index + 1}: uploading & running python page analysis…`);

      const start = await api.ocrStart({ subject: subject!, imageBase64, sessionId: sid ?? undefined, index });
      log(
        `python (${start.engine}): deskewed ${start.deskewAngle}° · ${start.candidateCount} candidate bands · ${start.width}×${start.height}px`,
        "ok",
      );
      log(`research dossier loaded into system prompt (${start.articleWords.toLocaleString()} words)`, "ok");

      const page: PageState = {
        id: start.pageId,
        index: start.index,
        status: "processing",
        imageBase64: "", // filled below
        overlayBase64: null,
        width: start.width,
        height: start.height,
        lines: [],
      };
      setPages((prev) => [...prev.filter((p) => p.id !== page.id), page].sort((a, b) => a.index - b.index));

      // fetch authoritative page record (includes processed image + overlay)
      const sess = await api.getSession(start.sessionId);
      const dbPage = sess.session.pages.find((p) => p.id === start.pageId);
      const pageFull: PageState = {
        ...page,
        imageBase64: dbPage?.imageBase64 || "",
        overlayBase64: dbPage?.overlayBase64 || null,
        lines: [],
      };
      setPages((prev) => prev.map((p) => (p.id === pageFull.id ? pageFull : p)));
      setSession(sess.session);
      setProgress({ pageId: start.pageId, overlayBase64: pageFull.overlayBase64 });

      // ---- layout pass
      setProgress({ stage: "layout" });
      log(`AI layout pass with the ${subject} research dossier…`);
      const layout = await api.ocrLayout({ pageId: start.pageId });
      const readable = layout.bands.filter((b) => b.kind !== "ignore");
      log(
        `layout: ${layout.bands.length} bands (${readable.length} text${layout.bands.length - readable.length > 0 ? `, ${layout.bands.length - readable.length} ignored` : ""})${
          layout.bands.some((b) => b.kind === "heading") ? " · headings detected" : ""
        }`,
        "ok",
      );
      setProgress({ bands: layout.bands, totalBands: readable.length });

      // ---- focused reads: ONE band per vision call (multi-crop calls let
      // the model mix up crop→band attribution, esp. on RTL scripts),
      // two calls in flight at a time
      setProgress({ stage: "reading" });
      const indices = readable.map((b) => b.index);
      const batches = chunk(indices, 1);
      const failed: number[] = [];
      let doneCount = 0;

      const runBatch = async (batch: number[], attempt = 1): Promise<void> => {
        try {
          const res = await api.ocrRead({ pageId: start.pageId, indices: batch });
          setPages((prev) => prev.map((p) => (p.id === start.pageId ? upsertLines(p, res.lines) : p)));
          doneCount += batch.length;
          const highConf = res.lines.filter((l) => l.confidence === "high").length;
          log(
            `read bands ${batch.map((i) => i + 1).join(", ")} — ${highConf}/${batch.length} high confidence`,
            "ok",
          );
          setProgress({ readIndices: Array.from({ length: doneCount }, (_, i) => i) });
        } catch (err) {
          if (attempt < 2) {
            log(`batch ${batch.join(",")} failed (${(err as Error).message}) — retrying…`, "warn");
            await new Promise((r) => setTimeout(r, 1200));
            return runBatch(batch, 2);
          }
          failed.push(...batch);
          log(`bands ${batch.join(", ")} could not be read: ${(err as Error).message}`, "err");
        }
      };

      // pool of 2 concurrent batches
      let cursor = 0;
      const workers = Array.from({ length: Math.min(2, batches.length) }, async () => {
        while (cursor < batches.length) {
          const my = cursor++;
          await runBatch(batches[my]);
        }
      });
      await Promise.all(workers);

      if (failed.length) setFailedBands((prev) => ({ ...prev, [start.pageId]: failed }));

      const finalLines = (await api.getSession(start.sessionId)).session.pages.find((p) => p.id === start.pageId)?.lines || [];
      const done: PageState = { ...pageFull, lines: finalLines, status: "transcribed" };
      setPages((prev) => prev.map((p) => (p.id === done.id ? done : p)));
      setProgress({ stage: "done" });
      return done;
    },
    [subject, log, setProgress, setSession],
  );

  /**
   * The full pipeline, restartable. A failure NEVER dead-ends the UI: the
   * fatal banner exposes "Try again" which resumes from the failed page.
   * Safe to re-run because /api/ocr/start upserts by (sessionId, index).
   */
  const startPipeline = useCallback(
    async (fromIndex: number) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setFatal(null);
      try {
        let sid = useSonar.getState().sessionId;
        for (let i = Math.max(0, fromIndex); i < uploads.length; i++) {
          failedIndexRef.current = i;
          await runPage(uploads[i], i, sid);
          // runPage() stores the session via setSession, so read the id back
          sid = useSonar.getState().sessionId ?? sid;
        }
        log("all pages processed — loading verification…", "ok");
        const fresh = await api.getSession(useSonar.getState().sessionId!);
        setSession(fresh.session);
        setActivePage(0);
        setStep("verify");
      } catch (err) {
        console.error(err);
        setFatal((err as Error).message);
        log(`pipeline stopped: ${(err as Error).message}`, "err");
      } finally {
        runningRef.current = false;
      }
    },
    [uploads, runPage, log, setSession, setActivePage, setStep],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startPipeline(0);
  }, [startPipeline]);

  const retryFailed = useCallback(async () => {
    const sid = useSonar.getState().sessionId;
    if (!sid) return;
    setFinishing(true);
    try {
      const sess = await api.getSession(sid);
      for (const p of sess.session.pages) {
        const failed = failedBands[p.id] || [];
        if (!failed.length) continue;
        const retry = chunk(failed, 1);
        for (const batch of retry) {
          try {
            const res = await api.ocrRead({ pageId: p.id, indices: batch });
            setPages((prev) => prev.map((x) => (x.id === p.id ? upsertLines(x, res.lines) : x)));
          } catch {
            /* keep */
          }
        }
      }
      setFailedBands({});
      const fresh = await api.getSession(sid);
      setSession(fresh.session);
      log("failed bands re-read", "ok");
    } finally {
      setFinishing(false);
    }
  }, [failedBands, setSession, log]);

  const currentPage = pages.find((p) => p.index === progress.pageIndex) || pages[pages.length - 1];
  const crops = (currentPage?.lines.map((l) => l.cropBase64).filter(Boolean) ?? []) as string[];
  const hasFailures = Object.values(failedBands).some((f) => f.length > 0);

  const stageList: Array<{ key: string; label: string; hint: string; icon: typeof Ruler }> = [
    { key: "analysis", ...STAGE_META.analysis, icon: Ruler },
    { key: "layout", ...STAGE_META.layout, icon: ScanSearch },
    { key: "reading", ...STAGE_META.reading, icon: Search },
  ];

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Extracting text — <span className="capitalize text-amber-800">{subject}</span>
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Page {Math.min(progress.pageIndex + 1, uploads.length)} of {uploads.length} · python crop &amp; focus +
            research-guided vision OCR
          </p>
        </div>
        {fatal && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">{fatal}</span>
            <Button size="sm" onClick={() => void startPipeline(failedIndexRef.current)} className="ml-2 shrink-0">
              Try again
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStep("setup")} className="shrink-0">
              Back
            </Button>
          </div>
        )}
      </div>

      {/* stage chips */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stageList.map((st) => {
          const order = ["analysis", "layout", "reading", "done"];
          const cur = order.indexOf(progress.stage);
          const mine = order.indexOf(st.key);
          const active = progress.stage === st.key;
          const done = mine < cur || progress.stage === "done";
          const Icon = st.icon;
          return (
            <div
              key={st.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                active
                  ? "border-amber-500 bg-amber-50"
                  : done
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-stone-200 bg-white/60",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  active ? "bg-amber-700 text-white" : done ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-400",
                )}
              >
                {active ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-800">{st.label}</p>
                <p className="truncate text-xs text-stone-500">{st.hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* overlay / page */}
        <div className="lg:col-span-3 rounded-2xl border border-stone-200 bg-white/80 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <Crop className="h-3.5 w-3.5" aria-hidden /> Band map
            </p>
            {progress.totalBands > 0 && (
              <p className="text-xs text-stone-500">
                {progress.readIndices.length}/{progress.totalBands} bands read
              </p>
            )}
          </div>
          <div className="sonar-scroll max-h-[480px] overflow-y-auto rounded-xl border border-stone-100 bg-stone-50 p-2">
            {currentPage?.imageBase64 ? (
               
              <img
                src={currentPage.overlayBase64 || currentPage.imageBase64}
                alt={`Analyzed page ${progress.pageIndex + 1} with detected text bands`}
                className="mx-auto w-full max-w-full rounded-lg shadow-sm"
              />
            ) : (
              <div className="grid h-64 place-items-center text-stone-400">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            )}
          </div>
          {crops.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Focused crops</p>
              <div className="sonar-scroll flex gap-2 overflow-x-auto pb-1">
                {crops.map((c, i) => (
                   
                  <img
                    key={i}
                    src={c}
                    alt={`Focused crop of band ${i + 1}`}
                    className="h-14 shrink-0 rounded-md border border-stone-200 bg-white object-contain px-1"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* log */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-stone-800 bg-stone-900 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Pipeline log</p>
          <div className="sonar-scroll sonar-log max-h-[420px] flex-1 space-y-0.5 overflow-y-auto text-stone-300">
            {logs.map((l, i) => (
              <p key={i} className="break-words">
                <span className="text-stone-500">{l.t}</span>{" "}
                <span
                  className={
                    l.kind === "ok"
                      ? "text-emerald-400"
                      : l.kind === "warn"
                        ? "text-amber-400"
                        : l.kind === "err"
                          ? "text-red-400"
                          : ""
                  }
                >
                  {l.msg}
                </span>
              </p>
            ))}
            {progress.stage !== "done" && !fatal && (
              <p className="animate-pulse text-amber-400">▍working…</p>
            )}
          </div>
        </div>
      </div>

      {/* footer actions */}
      {hasFailures && !fatal && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-sm text-orange-900">
            Some bands could not be read. You can retry them now or continue and re-read them on the verify step.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={retryFailed} disabled={finishing} className="gap-1.5">
              {finishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Retry failed bands
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                const fresh = await api.getSession(useSonar.getState().sessionId!);
                setSession(fresh.session);
                setActivePage(0);
                setStep("verify");
              }}
              className="gap-1.5 bg-amber-700 hover:bg-amber-800"
            >
              Continue anyway <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
