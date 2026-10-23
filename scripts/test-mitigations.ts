/** Test binarized crop and giant clean render against the VLM. */
import { visionChat } from "../src/lib/zai";
import fs from "fs";

const SYS = "You are a transcription engine for handwritten Urdu (Nastaliq script).";
const ASK = "Transcribe the Urdu text in this image exactly as written. Output only the transcription, nothing else.";

async function tryOne(name: string, path: string) {
  const b64 = fs.readFileSync(path).toString("base64");
  try {
    const out = await visionChat(SYS, ASK, [{ mime: "image/png", base64: b64 }], { thinking: true });
    console.log(`[${name}] → ${out.trim().slice(0, 200)}`);
  } catch (e) {
    console.log(`[${name}] ERROR: ${e}`);
  }
}

const TRUTH = "صبح کا سورج مشرق سے نکلتا ہے";
console.log("TRUTH:", TRUTH, "\n");

await tryOne("binarized", "/tmp/mit_binarized.png");
await tryOne("giant-clean", "/tmp/mit_giant_clean.png");
process.exit(0);
