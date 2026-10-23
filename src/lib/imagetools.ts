import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Image preparation for the OCR pipeline.
 *
 * Primary engine: the python/OpenCV tool at python-tools/ocr_prep.py —
 * it deskews the page, detects candidate text-line bands, renders a numbered
 * overlay, and produces enhanced, upscaled crops so the vision model can
 * focus on actual strokes.
 *
 * Fallback engine: sharp (used when python is unavailable, e.g. on
 * serverless hosts). It still handles downscale, crops, enhancement and
 * thumbnails — only the automatic band detection is skipped (the layout
 * model detects bands by itself in that case).
 */

const PY_SCRIPT = path.join(process.cwd(), "python-tools", "ocr_prep.py");
const PY_CANDIDATES = [
  process.env.SONAR_PYTHON,
  "/home/z/.venv/bin/python3",
  "python3",
  "python",
].filter(Boolean) as string[];

let resolvedPython: string | null = null;
let pythonChecked = false;

export function tmpRoot(): string {
  const root = process.env.VERCEL ? "/tmp/sonar" : path.join(process.cwd(), ".sonar-tmp");
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch {
    /* ignore */
  }
  return root;
}

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function tryResolvePython(): string | null {
  for (const py of PY_CANDIDATES) {
    try {
      const res = spawnSync(py, [PY_SCRIPT, "ping"], { encoding: "utf-8", timeout: 20000 });
      if (res.status === 0 && res.stdout) {
        const parsed = JSON.parse(res.stdout.trim().split("\n").pop() || "{}");
        if (parsed.ok) return py;
      }
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

export function getPython(): string | null {
  if (!pythonChecked) {
    resolvedPython = tryResolvePython();
    pythonChecked = true;
  }
  return resolvedPython;
}

export type BandBox = { x: number; y: number; w: number; h: number };

export type AnalyzeResult = {
  engine: string;
  width: number;
  height: number;
  deskewAngle: number;
  bands: Array<BandBox & { ink: number }>;
  pageDataUrl: string;
  overlayDataUrl: string | null;
};

export type CropResult = {
  engine: string;
  imageDataUrl: string;
  thumbDataUrl: string;
  width: number;
  height: number;
  upscale: number;
  inkRatio: number;
};

function fileToDataUrl(file: string, mime: string): string | null {
  try {
    return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Parse a data URL into { mime, buffer }. */
export function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!m) throw new Error("Invalid image data URL");
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

/**
 * Page analysis: deskew + downscale + candidate band detection + overlay.
 */
export async function analyzePage(dataUrl: string): Promise<AnalyzeResult> {
  const { mime, buffer } = parseDataUrl(dataUrl);
  const dir = ensureDir(path.join(tmpRoot(), `analyze-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const input = path.join(dir, "input" + (mime.includes("png") ? ".png" : ".jpg"));
  fs.writeFileSync(input, buffer);

  const py = getPython();
  if (py) {
    try {
      const res = spawnSync(
        py,
        [PY_SCRIPT, "analyze", "--input", input, "--outdir", dir],
        { encoding: "utf-8", timeout: 90000, maxBuffer: 64 * 1024 * 1024 },
      );
      if (res.status === 0 && res.stdout) {
        const parsed = JSON.parse(res.stdout.trim().split("\n").pop() || "{}");
        if (parsed.ok) {
          const pageDataUrl = fileToDataUrl(parsed.pagePath, "image/jpeg") || dataUrl;
          const overlayDataUrl = parsed.overlayPath ? fileToDataUrl(parsed.overlayPath, "image/jpeg") : null;
          return {
            engine: "python-opencv",
            width: parsed.width,
            height: parsed.height,
            deskewAngle: parsed.deskewAngle,
            bands: parsed.bands || [],
            pageDataUrl,
            overlayDataUrl,
          };
        }
      }
    } catch {
      /* fall through to sharp */
    }
  }

  // ---- sharp fallback: downscale only; the layout model finds the bands.
  const img = sharp(buffer, { failOn: "none" });
  const meta = await img.metadata();
  const w = meta.width || 1000;
  const scale = Math.min(1, 1600 / w);
  const outBuf = await sharp(buffer)
    .rotate()
    .resize({ width: Math.round(w * scale) })
    .jpeg({ quality: 85 })
    .toBuffer();
  const outMeta = await sharp(outBuf).metadata();
  return {
    engine: "sharp",
    width: outMeta.width || 1600,
    height: outMeta.height || 1200,
    deskewAngle: 0,
    bands: [],
    pageDataUrl: `data:image/jpeg;base64,${outBuf.toString("base64")}`,
    overlayDataUrl: null,
  };
}

/**
 * Crop + focus: extract a text band, upscale and enhance it.
 */
export async function cropBand(
  pageDataUrl: string,
  box: BandBox,
  index: number,
  opts: { scale?: number; pad?: number } = {},
): Promise<CropResult> {
  const { buffer } = parseDataUrl(pageDataUrl);
  const scale = opts.scale ?? 3;
  const pad = opts.pad ?? 10;
  const py = getPython();

  if (py) {
    const dir = ensureDir(path.join(tmpRoot(), `crops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
    const input = path.join(dir, "page.jpg");
    fs.writeFileSync(input, buffer);
    try {
      const res = spawnSync(
        py,
        [
          PY_SCRIPT, "crop",
          "--input", input,
          "--outdir", dir,
          "--x", String(Math.round(box.x)),
          "--y", String(Math.round(box.y)),
          "--w", String(Math.round(box.w)),
          "--h", String(Math.round(box.h)),
          "--index", String(index),
          "--scale", String(scale),
          "--pad", String(pad),
        ],
        { encoding: "utf-8", timeout: 60000, maxBuffer: 64 * 1024 * 1024 },
      );
      if (res.status === 0 && res.stdout) {
        const parsed = JSON.parse(res.stdout.trim().split("\n").pop() || "{}");
        if (parsed.ok && parsed.thumbBase64) {
          const cropBuf = fs.readFileSync(parsed.path);
          return {
            engine: "python-opencv",
            imageDataUrl: `data:image/png;base64,${cropBuf.toString("base64")}`,
            thumbDataUrl: `data:image/jpeg;base64,${parsed.thumbBase64}`,
            width: parsed.width,
            height: parsed.height,
            upscale: parsed.upscale,
            inkRatio: typeof parsed.inkRatio === "number" ? parsed.inkRatio : -1,
          };
        }
      }
    } catch {
      /* fall through to sharp */
    }
  }

  // ---- sharp fallback
  const meta = await sharp(buffer).metadata();
  const iw = meta.width || 1600;
  const ih = meta.height || 1200;
  const x0 = Math.max(0, Math.round(box.x - pad));
  const y0 = Math.max(0, Math.round(box.y - pad));
  const x1 = Math.min(iw, Math.round(box.x + box.w + pad));
  const y1 = Math.min(ih, Math.round(box.y + box.h + pad));
  const cw = Math.max(4, x1 - x0);
  const ch = Math.max(4, y1 - y0);
  const up = Math.min(scale, 1600 / Math.max(cw, ch));
  const outBuf = await sharp(buffer)
    .extract({ left: x0, top: y0, width: cw, height: ch })
    .resize({ width: Math.round(cw * up) })
    .sharpen({ sigma: 1.2 })
    .normalise()
    .png({ compressionLevel: 6 })
    .toBuffer();
  const thumbBuf = await sharp(outBuf)
    .resize({ width: Math.min(640, Math.round(cw * up)) })
    .jpeg({ quality: 78 })
    .toBuffer();
  // estimate ink ratio from the thumbnail (sharp path)
  const { data, info } = await sharp(thumbBuf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let i = 0; i < data.length; i++) if (data[i] < 128) dark++;
  return {
    engine: "sharp",
    imageDataUrl: `data:image/png;base64,${outBuf.toString("base64")}`,
    thumbDataUrl: `data:image/jpeg;base64,${thumbBuf.toString("base64")}`,
    width: Math.round(cw * up),
    height: Math.round(ch * up),
    upscale: Math.round(up * 100) / 100,
    inkRatio: dark / Math.max(1, info.width * info.height),
  };
}
