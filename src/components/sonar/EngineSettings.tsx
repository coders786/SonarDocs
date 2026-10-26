"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";
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
  const [draft, setDraft] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(geminiKey);
      setResult(null);
    }
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
            AI engine — bring your own key
          </DialogTitle>
          <DialogDescription>
            Paste a Gemini API key (Google AI Studio) to run the pipeline on the per-subject Gemini engines:
            <span className="font-medium text-stone-700"> Sindhi → Gemini 3.5 Flash · medium thinking</span>,
            <span className="font-medium text-stone-700"> Urdu / English / Mathematics → Gemini 3.5 Flash Lite · high thinking</span>{" "}
            — all with code execution (the model crops the page itself in its sandbox). Your key is stored in this
            browser only and sent per request — never saved on the server.
          </DialogDescription>
        </DialogHeader>

        <label className="sr-only" htmlFor="gemini-key-input">
          Gemini API key
        </label>
        <Input
          id="gemini-key-input"
          type="password"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setResult(null);
          }}
          placeholder="AIza…"
          autoComplete="off"
          spellCheck={false}
        />

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

        <p className="text-[11px] leading-relaxed text-stone-500">
          Without a key the pipeline runs on the built-in Z.ai engine (local python cropping). With a key, Gemini
          handles layout + cropping via code execution and all reads.
        </p>

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
            Remove key
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={test} disabled={!draft.trim() || testing} className="gap-1.5">
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Test
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setGeminiKey(draft);
                onOpenChange(false);
              }}
              disabled={!draft.trim()}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
