"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  Eye,
  Flag,
  Heading1,
  ListOrdered,
  Loader2,
  Maximize2,
  RefreshCw,
  Sigma,
} from "lucide-react";
import { useSonar } from "./store";
import { api, confidenceStyle, type OcrLine } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Katex } from "./Katex";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function kindIcon(kind: string) {
  switch (kind) {
    case "heading":
      return { Icon: Heading1, label: "Heading" };
    case "list":
      return { Icon: ListOrdered, label: "List item" };
    case "math":
      return { Icon: Sigma, label: "Equation" };
    default:
      return { Icon: BookOpenCheck, label: "Text" };
  }
}

export default function VerifyStep() {
  const session = useSonar((s) => s.session);
  const subject = useSonar((s) => s.subject);
  const activePage = useSonar((s) => s.activePage);
  const setActivePage = useSonar((s) => s.setActivePage);
  const activeBand = useSonar((s) => s.activeBand);
  const setActiveBand = useSonar((s) => s.setActiveBand);
  const setStep = useSonar((s) => s.setStep);
  const setSession = useSonar((s) => s.setSession);
  const log = useSonar((s) => s.log);
  const { toast } = useToast();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [retrying, setRetrying] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoomCrop, setZoomCrop] = useState<{ src: string; index: number } | null>(null);

  const page = session?.pages[activePage];
  const lines = useMemo(() => page?.lines ?? [], [page]);
  const rtl = session ? ["sindhi", "urdu"].includes(session.subject) : false;
  const isUrdu = session?.subject === "urdu";
  const isSindhi = session?.subject === "sindhi";
  const isMath = session?.subject === "mathematics";

  const valueOf = (l: OcrLine) => edits[l.id] ?? l.verifiedText ?? l.text;
  const statusOf = (l: OcrLine) => statuses[l.id] ?? (l.status === "pending" ? undefined : l.status);

  const summary = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, illegible: 0 };
    for (const l of lines) {
      if (l.confidence in counts) counts[l.confidence as keyof typeof counts]++;
    }
    return counts;
  }, [lines]);

  const setEdit = (l: OcrLine, text: string) => {
    setEdits((e) => ({ ...e, [l.id]: text }));
    const changed = text !== (l.verifiedText ?? l.text);
    if (changed) setStatuses((s) => ({ ...s, [l.id]: "corrected" }));
  };

  const retryLine = async (l: OcrLine) => {
    setRetrying(l.id);
    try {
      const res = await api.ocrRetryLine({ lineId: l.id });
      const fresh = await api.getSession(session!.id);
      setSession(fresh.session);
      setEdits((e) => {
        const next = { ...e };
        delete next[l.id];
        return next;
      });
      setStatuses((s) => {
        const next = { ...s };
        delete next[l.id];
        return next;
      });
      toast({ title: `Band ${l.index + 1} re-read`, description: res.line.text.slice(0, 90) });
    } catch (err) {
      toast({ title: "Re-read failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const approvePage = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const payload = lines.map((l) => ({
        id: l.id,
        verifiedText: valueOf(l),
        status: statusOf(l) === "flagged" ? "flagged" : statusOf(l) === "approved" ? "approved" : "corrected",
      }));
      await api.ocrReview({ pageId: page.id, lines: payload });
      log(`page ${page.index + 1} verified (${payload.length} lines)`, "ok");

      if (activePage < session!.pages.length - 1) {
        setActivePage(activePage + 1);
        toast({ title: `Page ${page.index + 1} verified`, description: "Moving to the next page." });
      } else {
        const fresh = await api.getSession(session!.id);
        setSession(fresh.session);
        setStep("document");
      }
    } catch (err) {
      toast({ title: "Could not save verification", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!session || !page) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-stone-500">
        <p>No session to verify.</p>
        <Button variant="outline" onClick={() => setStep("setup")}>
          Back to capture
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Check the OCR — <span className="text-amber-800">you are the editor</span>
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Subject: <span className="font-medium capitalize">{session.subject}</span> · page {activePage + 1} of{" "}
            {session.pages.length} · fix any line, accept alternatives, or flag unreadable text. Click a band on the
            page to jump to its line.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{summary.high} high</Badge>
          <Badge className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100">{summary.medium} medium</Badge>
          <Badge className="border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-100">{summary.low} low</Badge>
          <Badge className="border-red-300 bg-red-100 text-red-800 hover:bg-red-100">{summary.illegible} illegible</Badge>
        </div>
      </div>

      {/* page tabs */}
      {session.pages.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pages">
          {session.pages.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === activePage}
              onClick={() => setActivePage(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                i === activePage
                  ? "border-amber-600 bg-amber-50 text-amber-900"
                  : p.status === "verified"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-600",
              )}
            >
              {p.status === "verified" && <Check className="h-3 w-3" aria-hidden />}
              Page {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* page image with band boxes */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white/80 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <Eye className="h-3.5 w-3.5" aria-hidden /> Page {activePage + 1} · band map
          </p>
          <div className="sonar-scroll max-h-[70vh] overflow-y-auto rounded-xl border border-stone-100 bg-stone-50 p-2">
            <div className="relative mx-auto w-fit">
              { }
              <img
                src={page.imageBase64}
                alt={`Handwritten page ${activePage + 1}`}
                className="max-w-full rounded-lg shadow-sm"
                draggable={false}
              />
              {lines.map((l) => {
                if (!l.bbox || !page.width || !page.height) return null;
                const left = (l.bbox.x / page.width) * 100;
                const top = (l.bbox.y / page.height) * 100;
                const w = (l.bbox.w / page.width) * 100;
                const h = (l.bbox.h / page.height) * 100;
                const active = activeBand === l.index;
                return (
                  <button
                    key={l.id}
                    aria-label={`Jump to band ${l.index + 1}`}
                    onClick={() => {
                      setActiveBand(l.index);
                      document.getElementById(`line-${l.index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                    className={cn(
                      "absolute rounded-sm border-2 transition-all",
                      active
                        ? "band-active border-amber-600 bg-amber-500/25"
                        : "border-emerald-600/60 bg-emerald-400/10 hover:border-amber-500 hover:bg-amber-400/20",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute -top-0.5 rounded px-1 text-[9px] font-bold leading-3 text-white",
                        active ? "left-1 bg-amber-700" : "left-1 bg-emerald-700/90",
                      )}
                    >
                      {l.index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* line list */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="sonar-scroll max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {lines.map((l) => {
              const conf = confidenceStyle(l.confidence);
              const { Icon, label } = kindIcon(l.kind);
              const st = statusOf(l);
              const val = valueOf(l);
              return (
                <div
                  key={l.id}
                  id={`line-${l.index}`}
                  className={cn(
                    "rounded-2xl border bg-white/90 p-4 transition-shadow",
                    activeBand === l.index
                      ? "border-amber-500 shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
                      : "border-stone-200",
                    st === "approved" && "border-l-4 border-l-emerald-500",
                    st === "flagged" && "border-l-4 border-l-red-400",
                  )}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-stone-900 text-[11px] font-bold text-white">
                      {l.index + 1}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", conf.cls)}>
                      {conf.label}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => setStatuses((s) => ({ ...s, [l.id]: st === "approved" ? "corrected" : "approved" }))}
                        aria-label="Mark as correct"
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-lg border transition-colors",
                          st === "approved"
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-stone-200 text-stone-400 hover:border-emerald-400 hover:text-emerald-600",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        onClick={() => setStatuses((s) => ({ ...s, [l.id]: st === "flagged" ? "corrected" : "flagged" }))}
                        aria-label="Flag as unreadable"
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-lg border transition-colors",
                          st === "flagged"
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-stone-200 text-stone-400 hover:border-red-400 hover:text-red-600",
                        )}
                      >
                        <Flag className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        onClick={() => retryLine(l)}
                        disabled={retrying === l.id}
                        aria-label="Re-read this band with a deeper zoom"
                        title="Re-read with deeper zoom"
                        className="grid h-7 w-7 place-items-center rounded-lg border border-stone-200 text-stone-400 transition-colors hover:border-amber-500 hover:text-amber-700 disabled:opacity-50"
                      >
                        {retrying === l.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </span>
                  </div>

                  <div className="flex gap-3">
                    {l.cropBase64 && (
                      <button
                        onClick={() => setZoomCrop({ src: l.cropBase64!, index: l.index })}
                        className="group relative h-24 w-28 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white"
                        aria-label={`Zoom band ${l.index + 1} crop`}
                      >
                        { }
                        <img src={l.cropBase64} alt={`Crop of band ${l.index + 1}`} className="h-full w-full object-contain" />
                        <span className="absolute inset-0 hidden place-items-center bg-stone-900/40 text-white group-hover:grid">
                          <Maximize2 className="h-4 w-4" aria-hidden />
                        </span>
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <textarea
                        value={val}
                        onChange={(e) => setEdit(l, e.target.value)}
                        onFocus={() => setActiveBand(l.index)}
                        dir={rtl ? "rtl" : "ltr"}
                        aria-label={`Verified text for band ${l.index + 1}`}
                        className={cn(
                          "w-full resize-y rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2 text-sm text-stone-900 shadow-inner outline-none transition-colors focus:border-amber-500 focus:bg-white",
                          rtl && (isUrdu ? "font-urdu text-right text-base" : isSindhi ? "font-sindhi text-right text-base" : "text-right"),
                          isMath && "font-mono",
                        )}
                        rows={Math.min(4, Math.max(2, Math.ceil(val.length / 60)))}
                      />
                      {isMath && l.latex && (
                        <div className="mt-1.5 overflow-x-auto rounded-lg border border-stone-100 bg-white px-3 py-1.5 text-stone-700">
                          <Katex latex={l.latex} display={false} />
                        </div>
                      )}
                      {l.notes && (
                        <p className="mt-1.5 text-xs italic text-stone-500">⚠ {l.notes}</p>
                      )}
                      {l.alternatives.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                            alternatives:
                          </span>
                          {l.alternatives.map((a, i) => (
                            <button
                              key={i}
                              onClick={() => setEdit(l, a.text)}
                              title={a.note || "Apply this alternative reading"}
                              dir={rtl ? "rtl" : "ltr"}
                              className={cn(
                                "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 transition-colors hover:bg-amber-200",
                                rtl && (isUrdu ? "font-urdu" : isSindhi ? "font-sindhi" : ""),
                              )}
                            >
                              {a.text || "∅"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {lines.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/60 p-10 text-center text-stone-500">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                No bands were read for this page. Go back and retry, or start over with a clearer photo.
              </div>
            )}
          </div>

          {/* approve bar */}
          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <p className="hidden text-xs text-stone-500 sm:block">
              Edits are saved when you approve. Flagged lines stay marked in the final document.
            </p>
            <div className="ml-auto flex gap-2">
              {activePage > 0 && (
                <Button variant="outline" onClick={() => setActivePage(activePage - 1)}>
                  Previous page
                </Button>
              )}
              <Button
                onClick={approvePage}
                disabled={saving || lines.length === 0}
                className="gap-2 bg-amber-700 text-white hover:bg-amber-800"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                {activePage < session.pages.length - 1
                  ? "Approve & next page"
                  : "Approve & create document"}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* crop zoom dialog */}
      <Dialog open={!!zoomCrop} onOpenChange={(o) => !o && setZoomCrop(null)}>
        {zoomCrop && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Band {zoomCrop.index + 1} — python focus crop</DialogTitle>
            </DialogHeader>
            <img
              src={zoomCrop.src}
              alt={`Zoomed crop of band ${zoomCrop.index + 1}`}
              className="max-h-[65vh] w-full rounded-lg border border-stone-200 bg-white object-contain"
            />
            <p className="text-xs text-stone-500">
              This is the enhanced crop the AI read (deskewed, contrast-stretched, upscaled). Compare it with your
              correction.
            </p>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
