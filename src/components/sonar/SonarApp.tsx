"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  FileText,
  Loader2,
  PenLine,
  ScanText,
  Settings2,
  Sparkles,
  Waves,
} from "lucide-react";
import { useSonar } from "./store";
import { api } from "./types";
import SetupStep from "./SetupStep";
import ProcessingStep from "./ProcessingStep";
import VerifyStep from "./VerifyStep";
import DocumentStep from "./DocumentStep";
import ResearchLibrary from "./ResearchLibrary";
import { EngineSettings } from "./EngineSettings";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: "setup", label: "Capture", icon: PenLine },
  { id: "processing", label: "Extract", icon: ScanText },
  { id: "verify", label: "Verify", icon: BookOpenCheck },
  { id: "document", label: "Document", icon: FileText },
] as const;

export default function SonarApp() {
  const step = useSonar((s) => s.step);
  const articlesLoaded = useSonar((s) => s.articlesLoaded);
  const setArticles = useSonar((s) => s.setArticles);
  const setStep = useSonar((s) => s.setStep);
  const setSubject = useSonar((s) => s.setSubject);
  const setSession = useSonar((s) => s.setSession);
  const setActivePage = useSonar((s) => s.setActivePage);
  const setDocument = useSonar((s) => s.setDocument);
  const reset = useSonar((s) => s.reset);
  const geminiKey = useSonar((s) => s.geminiKey);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);

  useEffect(() => {
    if (!articlesLoaded) {
      api
        .listArticles()
        .then((r) => setArticles(r.articles))
        .catch(() => setArticles([]));
    }
  }, [articlesLoaded, setArticles]);

  // resume a session via /?session=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session");
    if (!sid) return;
    api
      .getSession(sid)
      .then(async ({ session }) => {
        if (!session.pages.length) return;
        setSession(session);
        setSubject(session.subject);
        const firstUnverified = session.pages.findIndex((p) => p.status !== "verified");
        if (session.documents.length > 0) {
          try {
            const { document } = await api.getDocument(session.documents[0].id);
            setDocument(document);
          } catch {
            /* fall through to the generator form */
          }
          setStep("document");
        } else if (firstUnverified !== -1) {
          setActivePage(firstUnverified);
          setStep("verify");
        } else {
          setStep("verify");
        }
        window.history.replaceState({}, "", "/");
      })
      .catch(() => {
        window.history.replaceState({}, "", "/");
      });
  }, [setSession, setSubject, setStep, setActivePage, setDocument]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="paper-bg min-h-screen flex flex-col">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#faf8f3]/85 backdrop-blur no-print">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => setStep("setup")}
            aria-label="Sonar Docs home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-700 text-white shadow-sm">
              <Waves className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-tight tracking-tight text-stone-900">
                Sonar Docs
              </span>
              <span className="hidden text-xs text-stone-500 sm:block">
                research-driven handwriting OCR &amp; document studio
              </span>
            </span>
          </button>

          {/* step indicator */}
          <nav aria-label="Progress" className="hidden items-center gap-1 md:flex">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <div key={s.id} className="flex items-center">
                  {i > 0 && <div className={`h-px w-5 ${done ? "bg-amber-600" : "bg-stone-300"}`} aria-hidden />}
                  <button
                    onClick={() => {
                      if (done) setStep(s.id);
                    }}
                    disabled={!done && !active}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-amber-700 text-white"
                        : done
                          ? "text-amber-800 hover:bg-amber-100"
                          : "text-stone-400"
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {s.label}
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEngineOpen(true)}
              className={`relative gap-1.5 border-stone-300 bg-white/70 hover:bg-amber-50 hover:text-amber-900 ${
                geminiKey ? "border-amber-300 text-amber-900" : ""
              }`}
              aria-label="AI engine settings (bring your own Gemini key)"
              title="AI engine settings — bring your own Gemini key"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Engine</span>
              {geminiKey && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-600" aria-hidden />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLibraryOpen(true)}
              className="gap-1.5 border-stone-300 bg-white/70 hover:bg-amber-50 hover:text-amber-900"
            >
              <BookOpenCheck className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Research Library</span>
              <span className="sm:hidden">Library</span>
            </Button>
            {step !== "setup" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Start over? This clears the current session from the screen (verified pages stay in the database).")) {
                    reset();
                  }
                }}
                className="text-stone-500 hover:text-red-700"
              >
                Start over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Main ---------- */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {!articlesLoaded ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-stone-500">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                <p className="text-sm">Loading research library…</p>
              </div>
            ) : (
              <>
                {step === "setup" && <SetupStep />}
                {step === "processing" && <ProcessingStep />}
                {step === "verify" && <VerifyStep />}
                {step === "document" && <DocumentStep />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="mt-auto border-t border-stone-200/80 bg-[#f5f1e8]/80 no-print">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:flex-row sm:px-6">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-700" aria-hidden />
            Sonar Docs — subject research dossiers guide the OCR; you approve every line.
          </p>
          <p>
            Sindhi · Urdu · English · Mathematics
          </p>
        </div>
      </footer>

      <ResearchLibrary open={libraryOpen} onOpenChange={setLibraryOpen} />
      <EngineSettings open={engineOpen} onOpenChange={setEngineOpen} />
    </div>
  );
}
