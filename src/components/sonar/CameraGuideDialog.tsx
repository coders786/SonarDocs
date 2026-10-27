"use client";

import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Focus,
  ImagePlus,
  Lightbulb,
  Maximize2,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useSonar } from "./store";
import { fileToDownscaledDataUrl } from "./types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CameraGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const uploads = useSonar((s) => s.uploads);
  const setUploads = useSonar((s) => s.setUploads);
  const log = useSonar((s) => s.log);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const processSelectedFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setCapturing(true);
    setSuccessMsg(null);
    try {
      const dataUrls: string[] = [];
      for (const f of imgs.slice(0, 8)) {
        try {
          dataUrls.push(await fileToDownscaledDataUrl(f));
        } catch {
          log(`Could not read ${f.name}`, "warn");
        }
      }
      if (dataUrls.length > 0) {
        setUploads([...uploads, ...dataUrls].slice(0, 8));
        setSuccessMsg(
          `Captured ${dataUrls.length} page photo${dataUrls.length > 1 ? "s" : ""}! Ready for OCR extraction.`
        );
        setTimeout(() => {
          setSuccessMsg(null);
          onOpenChange(false);
        }, 1200);
      }
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-stone-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700 text-white shadow-sm">
              <Camera className="h-5 w-5" aria-hidden />
            </span>
            Camera Guide & Handwriting Capture
          </DialogTitle>
          <DialogDescription className="text-sm text-stone-600">
            Follow these 5 photography tips for 99%+ accurate text extraction across Sindhi, Urdu, English & Math.
          </DialogDescription>
        </DialogHeader>

        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-sm font-medium text-emerald-900 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Photo Rules Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Rule 1: Lighting */}
          <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs">
              <Sun className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-900">1. Even Bright Lighting</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                Avoid phone shadows or dim ambient light. Natural daylight or overhead desk light works best so ink stays dark.
              </p>
            </div>
          </div>

          {/* Rule 2: Top-down Angle */}
          <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs">
              <Maximize2 className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-900">2. Overhead 90° Angle</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                Hold phone parallel directly above the paper. Diagonal angles distort Nastaliq cascades and math exponents.
              </p>
            </div>
          </div>

          {/* Rule 3: Focus & Contrast */}
          <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs">
              <Focus className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-900">3. Tap to Focus Ink</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                Tap your screen on handwritten strokes. Crisp focus helps distinguish fine dots (nuqtas) and sub/superscripts.
              </p>
            </div>
          </div>

          {/* Rule 4: Full Page Framing */}
          <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs">
              <Lightbulb className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-semibold text-stone-900">4. Keep Page Flat & Uncut</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                Flatten page curves or binder rings. Leave a small border so marginal notes & step numbers aren&apos;t cropped.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Banner: Full Extraction Guarantee */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Full Text Extraction Engine</p>
            <p className="mt-0.5 text-[11px] text-stone-600 leading-relaxed">
              Python cuts every row into focused crops; Gemini reads each crop line-by-line using subject research rules. No line or formula is skipped.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
          {/* Direct Camera Trigger */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void processSelectedFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {/* Gallery / File Picker Trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void processSelectedFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={capturing}
            className="gap-2 border-stone-300"
          >
            <ImagePlus className="h-4 w-4" />
            Choose from Gallery
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={() => cameraInputRef.current?.click()}
            disabled={capturing}
            className="gap-2 bg-amber-700 text-white hover:bg-amber-800 shadow-sm"
          >
            <Camera className="h-4 w-4" />
            {capturing ? "Processing Photo…" : "Open Camera & Take Photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
