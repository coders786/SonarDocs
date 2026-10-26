#!/usr/bin/env python3
"""
ocr_prep.py — Sonar Docs python image tools for research-driven handwriting OCR.

Commands
--------
analyze : deskew + downscale a page, detect candidate text-line bands,
          and render a numbered overlay for the AI layout pass.
          outputs: page.jpg, overlay.jpg, result JSON on stdout.
crop    : extract a text band (x,y,w,h) with padding, upscale it, enhance
          contrast (CLAHE + percentile stretch) and lightly sharpen it so the
          vision model can focus on the actual strokes.
          outputs: band_<n>.png, result JSON on stdout.
ping    : health check (prints python/cv2/numpy versions).

All results are printed to stdout as a single JSON object (warnings go to
stderr). Coordinates are in pixels of the OUTPUT (deskewed/resized) page.
"""
import argparse
import base64
import json
import math
import os
import sys

import cv2
import numpy as np

MAX_PAGE_W = 1600          # page image sent to the layout pass
MAX_CROP_DIM = 1600        # cap crop upscaling so payloads stay sane
DEFAULT_SCALE = 3


def eprint(*a):
    print(*a, file=sys.stderr)


# ---------------------------------------------------------------- utilities

def load_rgb(path: str) -> np.ndarray:
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"could not read image: {path}")
    return img


def to_gray(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def binarize_ink(gray: np.ndarray) -> np.ndarray:
    """Return a uint8 image where ink pixels are 255 and paper is 0."""
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    flags = cv2.ADAPTIVE_THRESH_GAUSSIAN_C
    ink = cv2.adaptiveThreshold(blur, 255, flags, cv2.THRESH_BINARY_INV, 31, 15)
    ink = cv2.medianBlur(ink, 3)
    return ink


def estimate_skew(ink: np.ndarray) -> float:
    """Estimate page skew (degrees) from ink-pixel structure.

    Classic projection-profile search: the correct angle maximizes the
    variance of the horizontal projection, because straight text lines
    produce sharp dark/light bands. Two passes:
      1. coarse scan (0.5° steps over ±7°) to land in the right valley;
      2. fine scan (0.05° steps over best±0.75°) to sharpen the estimate.
    """
    h, w = ink.shape
    scale = min(1.0, 1200.0 / max(h, w))
    if scale < 1.0:
        small = cv2.resize(ink, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        small = ink
    if cv2.countNonZero(small) < 200:
        return 0.0

    def score(angle: float) -> float:
        m = cv2.getRotationMatrix2D((small.shape[1] / 2, small.shape[0] / 2), angle, 1.0)
        rot = cv2.warpAffine(small, m, (small.shape[1], small.shape[0]), flags=cv2.INTER_NEAREST,
                             borderValue=0)
        proj = np.sum(rot, axis=1, dtype=np.float64)
        return float(np.var(proj))

    best_angle, best_var = 0.0, -1.0
    for angle in np.arange(-7.0, 7.01, 0.5):          # coarse
        v = score(float(angle))
        if v > best_var:
            best_var, best_angle = v, float(angle)
    for angle in np.arange(best_angle - 0.75, best_angle + 0.751, 0.05):  # fine
        v = score(float(angle))
        if v > best_var:
            best_var, best_angle = v, float(angle)
    return best_angle


def rotate_page(img: np.ndarray, angle: float) -> np.ndarray:
    h, w = img.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))


def remove_ruled_lines(ink: np.ndarray, page_w: int) -> np.ndarray:
    """Remove long horizontal ruling/table lines from the ink mask.

    Notebook pages are ruled; the rules fuse neighbouring text rows into one
    blob and wreck the row profile (and the crops pick up the printed line).
    A wide horizontal morphological opening isolates ink runs longer than
    ~1/3 of the page width — printed rules, not handwriting — and they are
    subtracted. Strokes that cross a rule get a thin cut, which is harmless:
    the mask is only used for geometry, the crops always come from the
    original grayscale image.
    """
    horiz = cv2.getStructuringElement(cv2.MORPH_RECT, (max(24, page_w // 3), 1))
    lines = cv2.morphologyEx(ink, cv2.MORPH_OPEN, horiz)
    if cv2.countNonZero(lines) == 0:
        return ink
    return cv2.subtract(ink, lines)


def detect_line_bands(ink: np.ndarray, page_w: int) -> list:
    """Detect fine text ROW bands for the layout pass.

    The AI layout pass groups these rows into logical bands (a sentence
    wrapped over two visual rows = one logical band). Python's job here is
    precise, fine-grained geometry:

      1. connected-component cleaning — keep only stroke-like components
         (kills diffuse shadow blobs and speckle).
      2. row-profile runs on the cleaned mask with a LOW threshold —
         every visual text row registers, including short continuation
         rows that a high threshold would drop.
    """
    if cv2.countNonZero(ink) < 300:
        return []

    # --- 1. component cleaning ---------------------------------------
    num, labels, stats, _ = cv2.connectedComponentsWithStats(ink, 8)
    clean = np.zeros_like(ink)
    kept = 0
    for i in range(1, num):
        x, y, w, h, area = (int(v) for v in stats[i])
        fill = area / float(max(1, w * h))
        if area < 25 or h < 5 or fill < 0.06:
            continue  # speckle or diffuse shadow/texture
        if w > page_w * 0.98 and h > ink.shape[0] * 0.6:
            continue  # whole-page artefact (frame / border shadow)
        if w > page_w * 0.5 and h <= 6:
            continue  # ruled / table line, not text
        clean[labels == i] = 255
        kept += 1
    if kept == 0:
        return []

    # --- 2. row runs ---------------------------------------------------
    rows = (clean > 0).sum(axis=1).astype(np.float64)
    win = max(3, ink.shape[0] // 250)
    rows_s = np.convolve(rows, np.ones(win) / win, mode="same")
    positive = rows_s[rows_s > 0]
    if positive.size == 0:
        return []
    # LOW threshold: text rows are typically 4-20× the noise floor; being
    # generous here keeps short rows — the AI groups them afterwards.
    base = float(np.percentile(positive, 25))
    thr = max(base * 1.9, 4.0)

    runs = []
    in_run = False
    start = 0
    for y, d in enumerate(rows_s):
        if d > thr and not in_run:
            start, in_run = y, True
        elif d <= thr and in_run:
            in_run = False
            if y - start >= 7:
                runs.append((start, y))
    if in_run and len(rows_s) - start >= 7:
        runs.append((start, len(rows_s)))

    if not runs:
        return []

    # --- 3. row-height-aware merge + split -----------------------------
    heights = [y1 - y0 for (y0, y1) in runs]
    med_h = float(np.median(heights))

    # close gaps relative to the typical row height: descender dips and
    # Nastaliq diagonal stacking leave sub-threshold valleys INSIDE one
    # visual row (a fixed 4px merge used to split them apart)
    merged: list = []
    for r in runs:
        if merged and r[0] - merged[-1][1] <= max(4.0, med_h * 0.30):
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(list(r))

    # split runs much taller than the median row (two+ rows fused): cut at
    # the deepest valley of the smoothed profile within the safe interior
    final: list = []
    for (y0, y1) in merged:
        h = y1 - y0
        if med_h > 0 and h > med_h * 1.7:
            margin = int(med_h * 0.6)
            lo, hi = y0 + margin, y1 - margin
            if hi - lo > 8:
                seg = rows_s[lo:hi]
                cut = lo + int(np.argmin(seg))
                if cut - y0 >= med_h * 0.6 and y1 - cut >= med_h * 0.6:
                    final.append((y0, cut))
                    final.append((cut, y1))
                    continue
        final.append((y0, y1))
    runs = final

    bands = []
    for (y0, y1) in runs:
        y1 = min(y1 + 1, ink.shape[0])
        band_mask = clean[y0:y1]
        cols = (band_mask > 0).sum(axis=0)
        xs = np.where(cols > 0)[0]
        if xs.size < 6:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        w, h = x1 - x0, y1 - y0
        if w < page_w * 0.02 or h < 7:
            continue
        if w > page_w * 0.45 and h <= 13:
            continue  # heading underline / ruled line, not a text row
        roi = clean[y0:y1, x0:x1]
        density = float(cv2.countNonZero(roi)) / float(max(1, roi.size))
        bands.append({"x": x0, "y": int(y0), "w": w, "h": h, "ink": round(density, 4)})
    bands.sort(key=lambda b: b["y"])
    return bands


def draw_overlay(page: np.ndarray, bands: list) -> np.ndarray:
    out = page.copy()
    for i, b in enumerate(bands):
        x, y, w, h = b["x"], b["y"], b["w"], b["h"]
        cv2.rectangle(out, (x - 4, y - 4), (x + w + 4, y + h + 4), (0, 160, 70), 3)
        label = str(i + 1)
        font, fs = cv2.FONT_HERSHEY_SIMPLEX, max(0.7, min(1.4, w / 300.0))
        (tw, th), _ = cv2.getTextSize(label, font, fs, max(2, int(fs * 2)))
        cx = max(6, min(x + 6, out.shape[1] - tw - 10))
        cy = max(th + 12, y + 6)
        cv2.rectangle(out, (cx - 4, cy - th - 8), (cx + tw + 4, cy + 6), (0, 160, 70), -1)
        cv2.putText(out, label, (cx, cy), font, fs, (255, 255, 255), max(2, int(fs * 2)), cv2.LINE_AA)
    return out


def enhance_crop(crop_bgr: np.ndarray) -> np.ndarray:
    """CLAHE on L channel + percentile contrast stretch + gentle unsharp."""
    lab = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    l = clahe.apply(l)
    out = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

    gray = to_gray(out)
    lo, hi = np.percentile(gray, (2, 98))
    if hi - lo > 24:
        alpha = 255.0 / (hi - lo)
        out = np.clip((out.astype(np.float32) - lo) * alpha, 0, 255).astype(np.uint8)

    blur = cv2.GaussianBlur(out, (0, 0), 2.0)
    out = cv2.addWeighted(out, 1.45, blur, -0.45, 0)
    return out


# ---------------------------------------------------------------- commands

def cmd_ping(_args) -> dict:
    return {
        "ok": True,
        "python": sys.version.split()[0],
        "cv2": cv2.__version__,
        "numpy": np.__version__,
    }


def find_page_region(gray: np.ndarray):
    """Locate the bright paper region of a photographed page.

    Photos usually contain a darker background around the sheet. The ink
    analysis must be restricted to the paper itself, otherwise the dark
    background dominates the threshold and the band detection.
    """
    blur = cv2.GaussianBlur(gray, (7, 7), 0)
    _, bright = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(bright, 8)
    if num <= 1:
        return None
    i = 1 + int(np.argmax(stats[1:, 4]))
    x, y, w, h = (int(v) for v in stats[i, :4])
    if w < gray.shape[1] * 0.35 or h < gray.shape[0] * 0.35:
        return None
    # small inset to drop the page-border shadow
    ins_x = max(2, int(w * 0.01))
    ins_y = max(2, int(h * 0.01))
    return (x + ins_x, y + ins_y, w - 2 * ins_x, h - 2 * ins_y)


def cmd_analyze(args) -> dict:
    img = load_rgb(args.input)

    # crop to the paper region (photographed pages sit on a darker background)
    region = find_page_region(to_gray(img))
    if region is not None:
        px, py, pw, ph = region
        img = img[py:py + ph, px:px + pw]

    ih, iw = img.shape[:2]

    ink = binarize_ink(to_gray(img))
    angle = estimate_skew(ink)
    if abs(angle) >= 0.3:
        img = rotate_page(img, angle)
        ink = binarize_ink(to_gray(img))
    else:
        angle = 0.0

    # pad with white border so edge text isn't clipped by crops/overlays
    img = cv2.copyMakeBorder(img, 16, 16, 16, 16, cv2.BORDER_CONSTANT, value=(255, 255, 255))

    # downscale for the model
    ih, iw = img.shape[:2]
    scale = min(1.0, MAX_PAGE_W / iw)
    if scale < 1.0:
        img = cv2.resize(img, (int(iw * scale), int(ih * scale)), interpolation=cv2.INTER_AREA)
    ih, iw = img.shape[:2]

    # NOTE: ruling lines are kept for the skew estimate (they are perfectly
    # horizontal when deskewed, which sharpens it) and removed afterwards —
    # they must not drive the band detection.
    ink = remove_ruled_lines(binarize_ink(to_gray(img)), iw)
    bands = detect_line_bands(ink, iw)
    # drop bands that are basically empty or absurdly tall (probably figures)
    bands = [b for b in bands if b["ink"] > 0.005 and b["h"] < ih * 0.5]

    overlay = draw_overlay(img, bands)

    cv2.imwrite(args.outdir + "/page.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    cv2.imwrite(args.outdir + "/overlay.jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 85])

    return {
        "ok": True,
        "engine": "python-opencv",
        "originalWidth": int(iw / max(scale, 1e-9) - 32) if scale < 1.0 else int(iw),
        "width": int(iw),
        "height": int(ih),
        "deskewAngle": round(float(angle), 2),
        "bands": bands,
        "pagePath": args.outdir + "/page.jpg",
        "overlayPath": args.outdir + "/overlay.jpg",
    }


def cmd_crop(args) -> dict:
    img = load_rgb(args.input)
    ih, iw = img.shape[:2]
    x, y, w, h = args.x, args.y, args.w, args.h
    pad = args.pad
    x0 = max(0, int(x - pad)); y0 = max(0, int(y - pad))
    x1 = min(iw, int(x + w + pad)); y1 = min(ih, int(y + h + pad))
    if x1 - x0 < 4 or y1 - y0 < 4:
        raise RuntimeError("crop box is empty")

    # ink ratio measured on the RAW pixels (before enhancement) so light
    # ruled paper lines that the contrast stretch would darken don't count
    raw = img[y0:y1, x0:x1]
    raw_gray = to_gray(raw)
    ink_ratio = float(cv2.countNonZero(cv2.threshold(raw_gray, 128, 255, cv2.THRESH_BINARY_INV)[1])) / float(raw_gray.size)

    crop = enhance_crop(raw)

    ch, cw = crop.shape[:2]
    up = min(DEFAULT_SCALE if args.scale <= 0 else args.scale, MAX_CROP_DIM / max(cw, ch), 6.0)
    if up > 1.05:
        crop = cv2.resize(crop, (int(cw * up), int(ch * up)), interpolation=cv2.INTER_CUBIC)

    out_path = f"{args.outdir}/band_{args.index}.png"
    cv2.imwrite(out_path, crop, [cv2.IMWRITE_PNG_COMPRESSION, 6])

    # small thumbnail (base64 jpeg) for the verification UI
    th = crop
    if max(th.shape[:2]) > 640:
        s = 640 / max(th.shape[:2])
        th = cv2.resize(th, (int(th.shape[1] * s), int(th.shape[0] * s)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", th, [cv2.IMWRITE_JPEG_QUALITY, 78])
    thumb = base64.b64encode(buf).decode("ascii") if ok else None

    return {
        "ok": True,
        "engine": "python-opencv",
        "index": args.index,
        "path": out_path,
        "width": int(crop.shape[1]),
        "height": int(crop.shape[0]),
        "upscale": round(float(up), 2),
        "inkRatio": round(ink_ratio, 5),
        "thumbBase64": thumb,
    }


def main():
    p = argparse.ArgumentParser(description="Sonar Docs OCR image preparation")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("ping")
    sp.set_defaults(fn=cmd_ping)

    sp = sub.add_parser("analyze")
    sp.add_argument("--input", required=True)
    sp.add_argument("--outdir", required=True)
    sp.set_defaults(fn=cmd_analyze)

    sp = sub.add_parser("crop")
    sp.add_argument("--input", required=True)
    sp.add_argument("--outdir", required=True)
    sp.add_argument("--x", type=int, required=True)
    sp.add_argument("--y", type=int, required=True)
    sp.add_argument("--w", type=int, required=True)
    sp.add_argument("--h", type=int, required=True)
    sp.add_argument("--index", type=int, default=0)
    sp.add_argument("--scale", type=float, default=DEFAULT_SCALE)
    sp.add_argument("--pad", type=int, default=10)
    sp.set_defaults(fn=cmd_crop)

    args = p.parse_args()
    try:
        if args.cmd in ("analyze", "crop"):
            os.makedirs(args.outdir, exist_ok=True)
        result = args.fn(args)
    except Exception as exc:  # noqa: BLE001
        eprint("error:", exc)
        result = {"ok": False, "error": str(exc)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
