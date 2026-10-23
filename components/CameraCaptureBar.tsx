"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { CameraIcon, GalleryIcon, SendIcon, CloseIcon, SpinnerIcon, EditPenIcon } from "@/lib/icons";
import { compressImageFile } from "@/lib/image-compressor";
import { AI_CONFIG } from "@/config/ai";

interface CameraCaptureBarProps {
  locale: Locale;
  onSendPhotos: (photosBase64: string[]) => void;
  isProcessing: boolean;
  onOpenCompose?: () => void;
  isCompact?: boolean;
}

export function CameraCaptureBar({
  locale,
  onSendPhotos,
  isProcessing,
  onOpenCompose,
  isCompact = false,
}: CameraCaptureBarProps) {
  const t = TRANSLATIONS[locale];
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB - selectedPhotos.length;
    if (remainingSlots <= 0) {
      alert(t.maxPhotosNotice);
      return;
    }

    setIsCompressing(true);
    try {
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      const compressedResults: string[] = [];

      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) continue;
        const compressedBase64 = await compressImageFile(file, AI_CONFIG.GUARDRAILS.MAX_IMAGE_DIMENSION_PX);
        compressedResults.push(compressedBase64);
      }

      setSelectedPhotos((prev) => [...prev, ...compressedResults]);
    } catch (err) {
      console.error("Compression error:", err);
    } finally {
      setIsCompressing(false);
      // Reset inputs so the teacher can re-trigger camera if desired
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (selectedPhotos.length === 0 || isProcessing || isCompressing) return;
    onSendPhotos(selectedPhotos);
    setSelectedPhotos([]);
  };

  return (
    <div className="sticky bottom-0 z-20 w-full bg-white border-t border-[#E4DFF0] px-4 pt-3 pb-5 shadow-[0_-4px_16px_rgba(43,39,64,0.06)]">
      <div className="max-w-[640px] mx-auto space-y-3">
        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilesSelected}
          className="hidden"
          id="camera-input"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          id="gallery-input"
        />

        {/* Selected Photos Preview Deck */}
        {selectedPhotos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#5B5570]">
              <span className="font-semibold text-[#2E1F4D]">
                {selectedPhotos.length} / {AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB} Photos
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotos([])}
                className="text-[#C4425A] hover:underline font-medium"
              >
                {t.cancel}
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {selectedPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  className="relative shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 border-[#B9A6E8] bg-slate-50"
                >
                  {/* Preview thumbnail */}
                  <Image
                    src={photo}
                    alt={`Exam page ${idx + 1}`}
                    width={80}
                    height={96}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#2E1F4D]/80 text-white flex items-center justify-center hover:bg-[#C4425A] transition-colors"
                    aria-label="Remove photo"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2E1F4D]/80 text-white">
                    P{idx + 1}
                  </span>
                </div>
              ))}

              {selectedPhotos.length < AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB && (
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="shrink-0 w-20 h-24 rounded-xl border-2 border-dashed border-[#B9A6E8] flex flex-col items-center justify-center text-[#8B6FD1] hover:bg-[#B9A6E8]/10 transition-colors"
                >
                  <CameraIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">+ Add Page</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Action Button Bar */}
        {selectedPhotos.length === 0 ? (
          isCompact ? (
            /* Space-saving single-row toolbar when in active chat/document mode */
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing || isCompressing}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 h-11 rounded-xl bg-[#2E1F4D] text-white flex items-center justify-center gap-2 font-bold text-xs hover:bg-[#3d2b63] active:scale-[0.98] transition-all shadow-xs animate-soft-glow"
              >
                {isCompressing ? (
                  <SpinnerIcon className="w-4 h-4" />
                ) : (
                  <CameraIcon className="w-4 h-4 text-[#B9A6E8]" />
                )}
                <span>{t.snapPaper}</span>
              </button>

              <button
                type="button"
                disabled={isProcessing || isCompressing}
                onClick={() => galleryInputRef.current?.click()}
                className="h-11 px-3.5 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] flex items-center justify-center gap-1.5 font-bold text-xs hover:bg-[#B9A6E8]/20 active:scale-[0.98] transition-all"
              >
                <GalleryIcon className="w-4 h-4 text-[#8B6FD1]" />
                <span className="hidden xs:inline">{t.gallery}</span>
              </button>

              {onOpenCompose && (
                <button
                  type="button"
                  onClick={onOpenCompose}
                  disabled={isProcessing || isCompressing}
                  className="h-11 px-3.5 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#5B5570] hover:text-[#2E1F4D] hover:bg-[#B9A6E8]/20 flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                >
                  <EditPenIcon className="w-4 h-4 text-[#8B6FD1]" />
                  <span className="hidden sm:inline">{t.composePaper}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Primary Action 1: Direct Camera Snap */}
              <button
                type="button"
                disabled={isProcessing || isCompressing}
                onClick={() => cameraInputRef.current?.click()}
                className="h-14 rounded-2xl bg-[#2E1F4D] text-white flex items-center justify-center gap-2.5 font-bold text-base hover:bg-[#3d2b63] active:scale-[0.98] transition-all shadow-md animate-soft-glow focus-visible:outline-2 focus-visible:outline-[#8B6FD1]"
              >
                {isCompressing ? (
                  <SpinnerIcon className="w-6 h-6" />
                ) : (
                  <CameraIcon className="w-6 h-6 text-[#B9A6E8]" />
                )}
                <span>{t.snapPaper}</span>
              </button>

              {/* Action 2: Gallery Picker */}
              <button
                type="button"
                disabled={isProcessing || isCompressing}
                onClick={() => galleryInputRef.current?.click()}
                className="h-14 rounded-2xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] flex items-center justify-center gap-2 font-bold text-base hover:bg-[#B9A6E8]/20 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-[#8B6FD1]"
              >
                <GalleryIcon className="w-6 h-6 text-[#8B6FD1]" />
                <span>{t.gallery}</span>
              </button>
            </div>
          )
        ) : (
          /* When photos are ready to send */
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleSend}
              disabled={isProcessing || isCompressing}
              className="flex-1 h-14 rounded-2xl bg-[#2E1F4D] text-white flex items-center justify-center gap-3 font-bold text-lg hover:bg-[#3d2b63] active:scale-[0.98] transition-all shadow-md animate-soft-glow focus-visible:outline-2 focus-visible:outline-[#8B6FD1]"
            >
              {isProcessing ? (
                <>
                  <SpinnerIcon className="w-6 h-6" />
                  <span>{t.readingPhoto}</span>
                </>
              ) : (
                <>
                  <SendIcon className="w-6 h-6 text-[#B9A6E8]" />
                  <span>{t.sendPhotos}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
