"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, FilePlus2, Loader2, Pencil, Save, X } from "lucide-react";
import { useSonar } from "./store";
import { api, type Article, type SubjectSummary } from "./types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ResearchLibrary({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const articles = useSonar((s) => s.articles);
  const setArticles = useSonar((s) => s.setArticles);
  const { toast } = useToast();

  const [selected, setSelected] = useState<SubjectSummary | null>(null);
  const activeSelected = selected ?? (articles.length > 0 ? articles[0] : null);
  const [article, setArticle] = useState<Article | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newArticle, setNewArticle] = useState({ title: "", language: "", direction: "ltr" as "ltr" | "rtl", content: "" });

  const loading = Boolean(activeSelected?.subject && (!article || article.subject !== activeSelected.subject));

  useEffect(() => {
    const subj = activeSelected?.subject;
    if (!subj) return;
    let cancelled = false;
    api
      .getArticle(subj)
      .then((r) => {
        if (cancelled) return;
        setArticle(r.article);
        setDraft(r.article.content);
        setEditing(false);
        setCreating(false);
      })
      .catch(() => {
        if (cancelled) return;
        setArticle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSelected?.subject]);

  const save = async () => {
    if (!article) return;
    setSaving(true);
    try {
      const r = await api.saveArticle({ subject: article.subject, title: article.title, content: draft });
      setArticle(r.article);
      setEditing(false);
      const list = await api.listArticles();
      setArticles(list.articles);
      toast({
        title: "Research article saved",
        description: `v${r.article.version} — new OCR runs will use the updated dossier.`,
      });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    setSaving(true);
    try {
      const r = await api.createArticle(newArticle);
      const list = await api.listArticles();
      setArticles(list.articles);
      setCreating(false);
      setNewArticle({ title: "", language: "", direction: "ltr", content: "" });
      setSelected(list.articles.find((a) => a.subject === r.article.subject) || null);
      toast({ title: "Custom subject created", description: `“${r.article.title}” is now selectable on the capture step.` });
    } catch (err) {
      toast({ title: "Could not create article", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-stone-200 px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-stone-900">
            <BookOpenCheck className="h-5 w-5 text-amber-700" aria-hidden />
            Research Library
          </SheetTitle>
          <p className="text-xs leading-relaxed text-stone-500">
            Deep-research dossiers stored in the database. When a subject is selected, its dossier is injected into
            the OCR system prompt and the AI is instructed to apply it. Edits take effect on the next run.
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1">
          {/* subject list */}
          <div className="sonar-scroll w-56 shrink-0 space-y-1 overflow-y-auto border-e border-stone-200 bg-stone-50/60 p-3">
            {articles.map((a) => (
              <button
                key={a.subject}
                onClick={() => setSelected(a)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left transition-colors",
                  activeSelected?.subject === a.subject ? "bg-amber-100 text-amber-950" : "hover:bg-stone-100",
                )}
              >
                <p className="truncate text-sm font-medium">{a.language}</p>
                <p className="truncate text-[11px] text-stone-500">
                  {a.wordCount.toLocaleString()} words · v{a.version}
                </p>
              </button>
            ))}
            <button
              onClick={() => setCreating(true)}
              className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs font-medium text-stone-500 hover:border-amber-400 hover:text-amber-800"
            >
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden /> New custom subject
            </button>
          </div>

          {/* article pane */}
          <div className="sonar-scroll min-w-0 flex-1 overflow-y-auto p-5">
            {creating ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-stone-900">New custom research dossier</h3>
                <p className="text-xs text-stone-500">
                  Paste a research article (like your Sindhi master prompt) for any subject — e.g. Pashto, Punjabi,
                  chemistry formulas. It becomes a selectable subject with its own OCR prompt.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-stone-600" htmlFor="na-title">Title</label>
                    <Input id="na-title" value={newArticle.title} onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })} placeholder="Pashto Handwriting OCR" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600" htmlFor="na-lang">Language label</label>
                    <Input id="na-lang" value={newArticle.language} onChange={(e) => setNewArticle({ ...newArticle, language: e.target.value })} placeholder="Pashto (پښتو)" />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-stone-600">Script direction</span>
                  <div className="mt-1 flex gap-2">
                    {(["ltr", "rtl"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setNewArticle({ ...newArticle, direction: d })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          newArticle.direction === d ? "border-amber-600 bg-amber-50 text-amber-900" : "border-stone-200 text-stone-500",
                        )}
                      >
                        {d === "ltr" ? "Left-to-right" : "Right-to-left"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600" htmlFor="na-content">Research article (markdown)</label>
                  <Textarea
                    id="na-content"
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    rows={14}
                    placeholder="Paste the full master prompt / research article…"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
                  <Button size="sm" onClick={create} disabled={saving} className="bg-amber-700 text-white hover:bg-amber-800">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Create subject
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="grid h-40 place-items-center text-stone-400">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
            ) : article ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{article.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="border-stone-200 text-stone-600">{article.language}</Badge>
                      <Badge variant="outline" className="border-stone-200 text-stone-600">{article.direction === "rtl" ? "RTL" : "LTR"}</Badge>
                      <Badge variant="outline" className="border-stone-200 text-stone-600">v{article.version}</Badge>
                      <span className="text-xs text-stone-400">{article.wordCount.toLocaleString()} words</span>
                    </div>
                  </div>
                  {editing ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="gap-1">
                        <X className="h-3.5 w-3.5" aria-hidden /> Cancel
                      </Button>
                      <Button size="sm" onClick={save} disabled={saving} className="gap-1 bg-amber-700 text-white hover:bg-amber-800">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />} Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit dossier
                    </Button>
                  )}
                </div>

                {editing ? (
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={26}
                    className="font-mono text-xs leading-relaxed"
                    aria-label="Edit research article"
                  />
                ) : (
                  <div className="prose prose-stone max-w-none text-sm">
                    <pre className="sonar-scroll max-h-[62vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-stone-100 bg-white p-4 font-sans text-[13px] leading-relaxed text-stone-700">
                      {article.content}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-500">Select a subject.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
