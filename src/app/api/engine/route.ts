import { NextResponse } from "next/server";
import { engineForSubject, geminiEnabled, geminiKeyPool } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/engine
 *
 * Describes the AI engine assignment per subject so the UI can show which
 * model + thinking level + tools each subject runs on. `gemini` is true when
 * a key is configured (BYOK, GEMINI_API_KEYS pool or GEMINI_API_KEY);
 * otherwise every call falls back to the Z.ai SDK. `poolSize` is how many
 * server keys requests roll through (round-robin + 429 failover).
 */
export async function GET() {
  const subjects = ["sindhi", "urdu", "english", "mathematics"].map((s) => {
    const e = engineForSubject(s, s === "sindhi" || s === "urdu" ? "rtl" : "ltr");
    return {
      subject: s,
      model: e.model,
      thinkingLevel: e.thinkingLevel,
      codeExecution: e.codeExecution,
      label: e.label,
    };
  });
  return NextResponse.json({
    gemini: geminiEnabled(),
    poolSize: geminiKeyPool().length,
    fallback: "Z.ai SDK (set GEMINI_API_KEY to activate the Gemini engines)",
    subjects,
  });
}
