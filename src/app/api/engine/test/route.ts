import { NextRequest, NextResponse } from "next/server";
import { byokFromRequest, geminiEnabled, geminiPing } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/engine/test   (header: x-gemini-key — optional, env key fallback)
 *
 * Validates a Gemini key (BYOK or env) with a minimal one-token call:
 * confirms the key authenticates AND that the configured model id resolves.
 * Used by the client's "Test key" button in the settings dialog.
 */
export async function POST(req: NextRequest) {
  const byok = byokFromRequest(req);
  if (!geminiEnabled(byok)) {
    return NextResponse.json(
      { ok: false, error: "No Gemini key provided (send the x-gemini-key header) and none configured on the server." },
      { status: 400 },
    );
  }
  const result = await geminiPing({ apiKey: byok });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
