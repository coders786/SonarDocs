"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { useSonar } from "./store";
import { api } from "./types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * BYOK settings — paste your own Gemini API key. The key is kept in this
 * browser's localStorage and sent per request in the `x-gemini-key` header;
 * the server never persists it. Test validates the key AND the model ids
 * with a real one-token call.
 */
export function EngineSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const geminiKey = useSonar((s) => s.geminiKey);
  const setGeminiKey = useSonar((s) => s.setGeminiKey);
  const [draft, setDraft] = useState(geminiKey);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [serverGemini, setServerGemini] = useState<boolean | null>(null);

  // Fresh state per open: the dialog is conditionally mounted ({open && <EngineSettings/>}),
  // so it remounts with draft = geminiKey every time it opens. No render-phase
  // open/prevOpen diff is needed (and it would never fire under this mount pattern).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/engine")
      .then((r) => r.json())
      .then((d: { gemini?: boolean }) => {
        if (!cancelled) setServerGemini(Boolean(d.gemini));
      })
      .catch(() => {
        if (!cancelled) setServerGemini(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, geminiKey]);

  async function test() {
    setTesting(true);
    setResult(null);
    try {
      const r = await api.testEngine(draft.trim() || undefined);
      setResult(
        r.ok
          ? { ok: true, msg: `Key works — model "${r.model}" reachable. Gemini engines are active.` }
          : { ok: false, msg: r.error || "Test failed." },
      );
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Test failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-700" aria-hidden />
            AI Engine Configuration
          </DialogTitle>
          <DialogDescription>
            Gemini is configured on the server via <span className="font-mono text-stone-800">GEMINI_API_KEY</span>.
            The pipeline automatically uses:
            <br />
            <span className="font-medium text-stone-700">· Sindhi → Gemini 3.5 Flash · medium thinking · code execution</span>
            <br />
            <span className="font-medium text-stone-700">· Urdu / English / Math → Gemini 3.5 Flash Lite · high thinking</span>
          </DialogDescription>
        </DialogHeader>

        {serverGemini !== null && (
          <div
            className={`rounded-lg border p-3 text-xs ${
              serverGemini
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                : "border-amber-200 bg-amber-50/70 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {serverGemini ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
              ) : (
                <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />
              )}
              <span>{serverGemini ? "Server Gemini Engine is Active" : "No server key — running on the Z.ai fallback"}</span>
            </div>
            <p className={`mt-1 text-[11px] ${serverGemini ? "text-emerald-800" : "text-amber-800"}`}>
              {serverGemini
                ? "Connected to Google AI Studio. You can test connectivity below or optionally provide a custom override key."
                : "The pipeline still works — python crops each row and the Z.ai engine reads it. Add GEMINI_API_KEY on the server (or paste a key below) to activate the per-subject Gemini engines."}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-600" htmlFor="gemini-key-input">
            Custom override API key (optional)
          </label>
          <Input
            id="gemini-key-input"
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setResult(null);
            }}
            placeholder="AIza… (leave blank to use server key)"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {result && (
          <p
            className={`flex items-start gap-1.5 text-xs leading-relaxed ${result.ok ? "text-emerald-700" : "text-red-700"}`}
            role="status"
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>{result.msg}</span>
          </p>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-stone-500 hover:text-red-700"
            onClick={() => {
              setGeminiKey("");
              setDraft("");
              setResult(null);
            }}
            disabled={!geminiKey && !draft.trim()}
          >
            Clear override
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={test} disabled={testing} className="gap-1.5">
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Test connection
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setGeminiKey(draft.trim());
                onOpenChange(false);
              }}
            >
              {draft.trim() ? "Save override" : "Done"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
