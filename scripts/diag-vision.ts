/** Diagnose: can the VLM actually SEE the crop? Neutral prompt, no dossier. */
import { visionChat } from "../src/lib/zai";
import fs from "fs";

async function main() {
  const b64 = fs.readFileSync("/tmp/repro_model_image.png").toString("base64");
  console.log("image bytes:", b64.length);

  // Test 1: describe the image (proves transport + vision works)
  const desc = await visionChat(
    "You are a careful image analyst.",
    "Describe this image in English: what script, how many words, what does it literally say? Transcribe EXACTLY what is written, character by character if needed.",
    [{ mime: "image/png", base64: b64 }],
    { thinking: true },
  );
  console.log("\n=== NEUTRAL DESCRIPTION ===\n", desc);

  // Test 2: same crop, no dossier, plain transcription ask
  const t = await visionChat(
    "You are a transcription engine.",
    "Transcribe the handwritten text in this image exactly as written. Output only the transcription.",
    [{ mime: "image/png", base64: b64 }],
    { thinking: true },
  );
  console.log("\n=== PLAIN TRANSCRIPTION ===\n", t);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
