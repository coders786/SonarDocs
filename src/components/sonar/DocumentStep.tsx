"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileCode2,
  FileDown,
  FileText,
  Heading1,
  Lightbulb,
  ListOrdered,
  Loader2,
  Minus,
  PenLine,
  Plus,
  Printer,
  Quote,
  Sigma,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { blockId, useSonar, type DocBlock } from "./store";
import { api, downloadBase64, type DocType } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Katex } from "./Katex";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPES: Array<{ id: DocType; label: string; desc: string }> = [
  { id: "transcript", label: "Clean Transcript", desc: "Faithful wording, spacing fixed, lines joined into paragraphs." },
  { id: "formatted-notes", label: "Formatted Notes", desc: "Title, headings and lists following the writer's own structure." },
  { id: "essay", label: "Essay / Prose", desc: "Flowing paragraphs — letters, drafts, essays." },
  { id: "study-sheet", label: "Study Sheet", desc: "Condensed revision sheet with formulas and key points." },
];

const BLOCK_TYPES: Array<{ id: DocBlock["type"]; label: string; icon: typeof Type }> = [
  { id: "title", label: "Title", icon: Type },
  { id: "subtitle", label: "Subtitle", icon: Minus },
  { id: "heading", label: "Heading", icon: Heading1 },
  { id: "paragraph", label: "Paragraph", icon: PenLine },
  { id: "list-item", label: "List item", icon: ListOrdered },
  { id: "math", label: "Equation", icon: Sigma },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "note", label: "Editor note", icon: Lightbulb },
  { id: "divider", label: "Divider", icon: Minus },
];

export default function DocumentStep() {
  const session = useSonar((s) => s.session);
  const document = useSonar((s) => s.document);
  const setDocument = useSonar((s) => s.setDocument);
  const generating = useSonar((s) => s.generating);
  const setGenerating = useSonar((s) => s.setGenerating);
  const exporting = useSonar((s) => s.exporting);
  const setExporting = useSonar((s) => s.setExporting);
  const setStep = useSonar((s) => s.setStep);
  const log = useSonar((s) => s.log);
  const { toast } = useToast();

  const [docType, setDocType] = useState<DocType>("formatted-notes");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rtl = session ? ["sindhi", "urdu"].includes(session.subject) : false;
  const isUrdu = session?.subject === "urdu";
  const isSindhi = session?.subject === "sindhi";
  const verifiedCount = useMemo(
    () => session?.pages.reduce((n, p) => n + p.lines.filter((l) => (l.verifiedText ?? l.text).trim()).length, 0) ?? 0,
    [session],
  );

  // auto-save (debounced) whenever blocks/title change
  useEffect(() => {
    if (!document) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveDocument({ id: document.id, title: document.title, blocks: document.blocks });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      } catch {
        /* silent — user can export anyway */
      }
    }, 1400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [document]);

  const generate = async () => {
    if (!session) return;
    setGenerating(true);
    try {
      const res = await api.generateDocument({
        sessionId: session.id,
        docType,
        title: title || undefined,
        instructions: instructions || undefined,
      });
      setDocument(res.document);
      log(`document "${res.document.title}" generated (${res.document.blocks.length} blocks)`, "ok");
      toast({ title: "Document written", description: `${res.document.blocks.length} blocks — edit anything, then export.` });
    } catch (err) {
      toast({ title: "Document generation failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const exportDoc = async (format: "docx" | "md" | "txt") => {
    if (!document) return;
    setExporting(true);
    try {
      const res = await api.exportDocument({ id: document.id, format });
      downloadBase64(res.filename, res.mime, res.base64);
      toast({ title: "Downloaded", description: res.filename });
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const updateBlock = (id: string, patch: Partial<DocBlock>) => {
    if (!document) return;
    setDocument({ ...document, blocks: document.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };
  const removeBlock = (id: string) => {
    if (!document) return;
    setDocument({ ...document, blocks: document.blocks.filter((b) => b.id !== id) });
  };
  const moveBlock = (i: number, dir: -1 | 1) => {
    if (!document) return;
    const blocks = [...document.blocks];
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    setDocument({ ...document, blocks });
  };
  const addBlock = (type: DocBlock["type"]) => {
    if (!document) return;
    setDocument({
      ...document,
      blocks: [
        ...document.blocks,
        { id: blockId(), type, text: "", latex: type === "math" ? "" : undefined, level: type === "heading" ? 2 : undefined },
      ],
    });
  };

  /* ---------- render: generator form ---------- */
  if (!document) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Write the document — <span className="text-amber-800">{verifiedCount} verified lines ready</span>
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            The document AI works only from your verified transcription. Pick a format, optionally give instructions,
            then generate. You can edit every block afterwards.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setDocType(t.id)}
              aria-pressed={docType === t.id}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                docType === t.id
                  ? "border-amber-600 bg-amber-50/80 shadow-[0_0_0_3px_rgba(180,83,9,0.12)]"
                  : "border-stone-200 bg-white/80 hover:border-amber-300",
              )}
            >
              <p className="text-sm font-semibold text-stone-900">{t.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white/80 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="doc-title" className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Document title (optional)
            </label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave empty and the AI will suggest one"
              dir={rtl ? "rtl" : "ltr"}
              className={cn(rtl && "text-right", isUrdu && "font-urdu", isSindhi && "font-sindhi")}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="doc-instructions" className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Instructions for the writing AI (optional)
            </label>
            <Input
              id="doc-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={rtl ? "e.g. سنڌيءَ ۾ رکو، عنوان شامل ڪريو" : "e.g. keep the writer's tone, add a date line"}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep("verify")}>
            Back to verification
          </Button>
          <Button onClick={generate} disabled={generating} className="gap-2 bg-amber-700 px-6 text-white hover:bg-amber-800">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {generating ? "Writing…" : "Write document with AI"}
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- render: studio ---------- */
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Document studio</h1>
          {savedFlash && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden /> saved
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => exportDoc("docx")} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
            Word (.docx)
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportDoc("md")} disabled={exporting} className="gap-1.5">
            <FileCode2 className="h-4 w-4" aria-hidden /> Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportDoc("txt")} disabled={exporting} className="gap-1.5">
            <FileText className="h-4 w-4" aria-hidden /> Plain text
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" aria-hidden /> Print / PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={generate}
            disabled={generating}
            className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            Rewrite
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* -------- editor -------- */}
        <div className="lg:col-span-2 space-y-3 no-print">
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
            <label htmlFor="doc-title-edit" className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Title
            </label>
            <Input
              id="doc-title-edit"
              value={document.title}
              onChange={(e) => setDocument({ ...document, title: e.target.value })}
              dir={rtl ? "rtl" : "ltr"}
              className={cn("mt-1.5 font-semibold", rtl && "text-right", isUrdu && "font-urdu", isSindhi && "font-sindhi")}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-stone-400">{document.blocks.length} blocks</p>
              <div className="flex flex-wrap gap-1">
                <Select onValueChange={(v) => addBlock(v as DocBlock["type"])}>
                  <SelectTrigger className="h-8 w-40 border-dashed text-xs text-stone-500">
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Add block
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="sonar-scroll max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {document.blocks.map((b, i) => (
              <div key={b.id} className="group rounded-xl border border-stone-200 bg-white/90 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Select value={b.type} onValueChange={(v) => updateBlock(b.id, { type: v as DocBlock["type"] })}>
                    <SelectTrigger className="h-7 w-36 border-stone-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {b.type === "heading" && (
                    <Select value={String(b.level || 2)} onValueChange={(v) => updateBlock(b.id, { level: Number(v) })}>
                      <SelectTrigger className="h-7 w-16 border-stone-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" className="text-xs">H1</SelectItem>
                        <SelectItem value="2" className="text-xs">H2</SelectItem>
                        <SelectItem value="3" className="text-xs">H3</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <div className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => moveBlock(i, -1)} aria-label="Move up" className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100">
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button onClick={() => moveBlock(i, 1)} aria-label="Move down" className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-stone-100">
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button onClick={() => removeBlock(b.id)} aria-label="Delete block" className="grid h-6 w-6 place-items-center rounded text-stone-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
                {b.type === "divider" ? (
                  <p className="py-1 text-center text-xs text-stone-400">— divider —</p>
                ) : (
                  <>
                    <Textarea
                      value={b.text}
                      onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                      dir={rtl ? "rtl" : "ltr"}
                      aria-label={`${b.type} text`}
                      rows={b.type === "title" || b.type === "subtitle" || b.type === "heading" ? 2 : 3}
                      className={cn(
                        "resize-y text-sm",
                        rtl && "text-right",
                        (isUrdu && rtl && "font-urdu text-base") || (isSindhi && rtl && "font-sindhi text-base"),
                        b.type === "title" && "text-base font-semibold",
                        b.type === "heading" && "font-semibold",
                      )}
                    />
                    {b.type === "math" && (
                      <div className="mt-1.5 space-y-1.5">
                        <Input
                          value={b.latex || ""}
                          onChange={(e) => updateBlock(b.id, { latex: e.target.value })}
                          placeholder="LaTeX, e.g. \frac{a}{b} + x^{2}"
                          className="font-mono text-xs"
                          aria-label="LaTeX for equation"
                        />
                        <div className="overflow-x-auto rounded-md border border-stone-100 bg-stone-50 px-3 py-1.5">
                          <Katex latex={b.latex || ""} display={false} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* -------- live paper preview -------- */}
        <div className="lg:col-span-3">
          <div className="sonar-scroll max-h-[78vh] overflow-y-auto rounded-2xl border border-stone-200 bg-stone-100/70 p-4">
            <div id="doc-print" className="doc-paper mx-auto max-w-[640px] rounded-xl px-8 py-10 sm:px-12" dir={rtl ? "rtl" : "ltr"}>
              {document.blocks.map((b) => {
                const textCls = cn(
                  isUrdu && "font-urdu",
                  isSindhi && "font-sindhi",
                );
                switch (b.type) {
                  case "title":
                    return (
                      <h1 key={b.id} className={cn("mb-1 text-3xl font-bold leading-snug text-stone-900", textCls)}>
                        {b.text}
                      </h1>
                    );
                  case "subtitle":
                    return (
                      <p key={b.id} className={cn("mb-6 text-sm italic text-stone-500", textCls)}>
                        {b.text}
                      </p>
                    );
                  case "heading":
                    return (
                      <h2
                        key={b.id}
                        className={cn(
                          "mt-6 mb-2 font-bold text-stone-800",
                          b.level === 1 ? "text-2xl" : b.level === 3 ? "text-base" : "text-xl",
                          textCls,
                        )}
                      >
                        {b.text}
                      </h2>
                    );
                  case "paragraph":
                    return (
                      <p key={b.id} className={cn("mb-3 leading-7 text-stone-800", textCls, isUrdu && "leading-[2.4]")}>
                        {b.text}
                      </p>
                    );
                  case "list-item":
                    return (
                      <p key={b.id} className={cn("relative mb-1 ps-5 leading-7 text-stone-800", textCls)}>
                        <span className="absolute start-0 text-amber-700">•</span>
                        {b.text}
                      </p>
                    );
                  case "math":
                    return (
                      <div key={b.id} className="my-4 overflow-x-auto text-center">
                        {b.latex ? <Katex latex={b.latex} /> : <span className="font-mono text-stone-800">{b.text}</span>}
                      </div>
                    );
                  case "quote":
                    return (
                      <blockquote key={b.id} className={cn("my-4 border-s-4 border-amber-300 bg-amber-50/50 ps-4 py-2 text-stone-700 italic", textCls)}>
                        {b.text}
                      </blockquote>
                    );
                  case "note":
                    return (
                      <p key={b.id} className={cn("my-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900", textCls)}>
                        <Lightbulb className="me-1 inline h-3.5 w-3.5" aria-hidden /> {b.text}
                      </p>
                    );
                  case "divider":
                    return <hr key={b.id} className="my-5 border-stone-200" />;
                  default:
                    return null;
                }
              })}
            </div>
          </div>
          <p className="mt-2 flex items-center justify-between px-1 text-[11px] text-stone-400 no-print">
            <span>Live preview · {rtl ? "RTL" : "LTR"} layout · edits auto-save</span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" aria-hidden /> exports keep the same structure
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
