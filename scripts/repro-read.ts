/**
 * Reproduce the exact read-pass call for Urdu band 1.
 * Loads the stored page, crops band 1 like the route does, sends the exact
 * prompts to the VLM, and prints the raw response.
 */
import { db, ensureDb } from "../src/lib/db";
import { cropBand } from "../src/lib/imagetools";
import { buildReadSystemPrompt, buildReadUserPrompt } from "../src/lib/ocr-prompts";
import { getArticle } from "../src/lib/subjects";
import { visionChat } from "../src/lib/zai";

async function main() {
  await ensureDb();
  const pageId = "cmvl2h01g00djoby214j8r2j5";
  const page = await db.ocrPage.findUnique({ where: { id: pageId }, include: { session: true } });
  if (!page) throw new Error("page not found");

  const bandsData = page.bands ? JSON.parse(page.bands) : null;
  const decisions = bandsData?.decisions || [];
  const band = decisions.find((d: { index: number }) => d.index === 1);
  console.log("band1 box:", JSON.stringify(band.box), "needsZoom:", band.needsZoom);

  const article = await getArticle(page.session.subject);
  if (!article) throw new Error("no article");
  console.log("article subject:", article.subject, "lang:", article.language, "content chars:", article.content.length);

  const scale = band.needsZoom ? 4 : 3;
  const crop = await cropBand(page.imageBase64, band.box, band.index, { scale, pad: 14 });
  console.log("crop engine:", crop.engine, "size:", crop.width, "x", crop.height, "inkRatio:", crop.inkRatio);
  console.log("model image bytes (b64 len):", crop.imageDataUrl.length);

  const subject = {
    subject: article.subject,
    language: article.language,
    nativeLabel: article.nativeLabel,
    direction: article.direction,
  };
  const system = buildReadSystemPrompt(article.content, subject);
  const user = buildReadUserPrompt(subject, [{ index: 1, preliminary: "", kind: band.kind }], "");

  // save what the model will see
  const fs = await import("fs");
  fs.writeFileSync("/tmp/repro_model_image.png", Buffer.from(crop.imageDataUrl.split(",")[1], "base64"));
  fs.writeFileSync("/tmp/repro_system_prompt.txt", system);
  fs.writeFileSync("/tmp/repro_user_prompt.txt", user);

  console.log("\n--- calling VLM (single band, thinking enabled as in route default?) ---");
  const raw = await visionChat(system, user, [
    { mime: "image/png", base64: crop.imageDataUrl.split(",")[1] || "" },
  ]);
  console.log("RAW MODEL RESPONSE:\n", raw);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
