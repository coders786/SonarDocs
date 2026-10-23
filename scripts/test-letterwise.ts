/** Last attempt: letter-by-letter decoding prompt vs language-prior completion. */
import { visionChat } from "../src/lib/zai";
import fs from "fs";

const b64 = fs.readFileSync("/tmp/mit_giant_clean.png").toString("base64");

const SYS = `You read handwritten Urdu in Nastaliq script. You are FORBIDDEN from guessing words from context or producing fluent phrases. Your only method: scan the ink stroke by stroke, letter by letter, and report what strokes you see. If you cannot identify a letter with certainty, write [?] for it.`;

const ASK = `Transcribe the text in this image using this STRICT procedure:
1. Move from right to left.
2. For each connected component (word), list the letters you can identify with their dots (e.g. "ب: dot below + tooth", "س: three teeth, no dots").
3. Only then write the assembled word.
4. Join words with spaces.
Output only the final transcription line after the word 'RESULT:'.

Do NOT produce a fluent Urdu sentence from imagination. A wrong-but-fluent answer is a total failure; an honest letter-by-letter attempt is success.`;

const out = await visionChat(SYS, ASK, [{ mime: "image/png", base64: b64 }], { thinking: true });
console.log(out.trim());
console.log("\nTRUTH: صبح کا سورج مشرق سے نکلتا ہے");
process.exit(0);
