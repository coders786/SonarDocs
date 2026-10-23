"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import {
  CameraIcon,
  GalleryIcon,
  SendIcon,
  CloseIcon,
  SpinnerIcon,
  SparklesIcon,
} from "@/lib/icons";
import { compressImageFile } from "@/lib/image-compressor";
import { AI_CONFIG } from "@/config/ai";

interface ChatInputBarProps {
  locale: Locale;
  onSendPhotos: (photosBase64: string[]) => void;
  onSendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
  isEditing: boolean;
  hasReadyDocument: boolean;
}

export function ChatInputBar({
  locale,
  onSendPhotos,
  onSendMessage,
  isProcessing,
  isEditing,
  hasReadyDocument,
}: ChatInputBarProps) {
  const t = TRANSLATIONS[locale];
  const [textInput, setTextInput] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const isBusy = isProcessing || isEditing || isCompressing;

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
      console.error("Image compression error:", err);
    } finally {
      setIsCompressing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isBusy) return;

    // If photos are attached, dispatch photos
    if (selectedPhotos.length > 0) {
      const photosToSend = [...selectedPhotos];
      setSelectedPhotos([]);
      onSendPhotos(photosToSend);
      return;
    }

    // If text is entered, dispatch chat message
    const trimmed = textInput.trim();
    if (!trimmed) return;

    setTextInput("");
    await onSendMessage(trimmed);
  };

  const handleChipClick = async (chipText: string) => {
    if (isBusy) return;
    await onSendMessage(chipText);
  };

  // Tab state for suggestion chips: "subjects" | "classes" | "prompts"
  const [chipTab, setChipTab] = useState<"subjects" | "classes" | "prompts">(hasReadyDocument ? "prompts" : "subjects");

  const subjectChips = [
    { id: "physics", label: locale === "ur" ? "طبیعیات" : locale === "sd" ? "فزڪس" : "Physics", prompt: "Create Class 9 Physics Midterm Paper" },
    { id: "chemistry", label: locale === "ur" ? "کیمیا" : locale === "sd" ? "ڪيمسٽري" : "Chemistry", prompt: "Create Class 9 Chemistry Exam Paper" },
    { id: "biology", label: locale === "ur" ? "حیاتیات" : locale === "sd" ? "حياتيات" : "Biology", prompt: "Create Class 9 Biology Exam Paper" },
    { id: "mathematics", label: locale === "ur" ? "ریاضی" : locale === "sd" ? "حساب" : "Mathematics", prompt: "Create Class 9 Mathematics Exam Paper" },
    { id: "computer_science", label: locale === "ur" ? "کمپیوٹر" : locale === "sd" ? "ڪمپيوٽر" : "Computer Science", prompt: "Create Class 9 Computer Science Paper" },
    { id: "english", label: locale === "ur" ? "انگریزی" : locale === "sd" ? "انگريزي" : "English Compulsory", prompt: "Create Class 9 English Compulsory Paper" },
    { id: "urdu", label: locale === "ur" ? "اردو لازمی" : locale === "sd" ? "اردو لازمي" : "Urdu Lazmi", prompt: "Create Class 10 Urdu Lazmi Paper" },
    { id: "sindhi", label: locale === "ur" ? "سندھی لازمی" : locale === "sd" ? "سنڌي لازمي" : "Sindhi Lazmi", prompt: "Create Class 9 Sindhi Lazmi Paper" },
    { id: "pakistan_studies", label: locale === "ur" ? "مطالعہ پاکستان" : locale === "sd" ? "مطالعو پاڪستان" : "Pakistan Studies", prompt: "Create Class 9 Pakistan Studies Paper" },
    { id: "islamiat", label: locale === "ur" ? "اسلامیات" : locale === "sd" ? "اسلاميات" : "Islamiat Compulsory", prompt: "Create Class 9 Islamiat Compulsory Paper" },
  ];

  const classChips = [
    { label: "Class 10 (SSC-II)", prompt: "Create Class 10 examination paper" },
    { label: "Class 9 (SSC-I)", prompt: "Create Class 9 examination paper" },
    { label: "Class 8 (Middle)", prompt: "Create Class 8 examination paper" },
    { label: "Class 7 (Middle)", prompt: "Create Class 7 examination paper" },
    { label: "Class 6 (Middle)", prompt: "Create Class 6 examination paper" },
    { label: "Class 5 (Primary)", prompt: "Create Class 5 examination paper" },
    { label: "Class 4 (Primary)", prompt: "Create Class 4 examination paper" },
    { label: "Class 3 (Primary)", prompt: "Create Class 3 examination paper" },
    { label: "Class 2 (Primary)", prompt: "Create Class 2 examination paper" },
    { label: "Class 1 (Primary)", prompt: "Create Class 1 examination paper" },
  ];

  // Dynamic Suggestion Chips
  const idleChips = [
    locale === "ur" ? "طبیعیات جماعت 9" : locale === "sd" ? "فزڪس ڪلاس 9" : "Physics Class 9",
    locale === "ur" ? "اردو لازمی دہم" : locale === "sd" ? "اردو لازمي ڏهين" : "Urdu Lazmi Class 10",
    locale === "ur" ? "سندھی لازمی نہم" : locale === "sd" ? "سنڌي لازمي نائين" : "Sindhi Lazmi Class 9",
    locale === "ur" ? "جنرل سائنس ہشتم" : locale === "sd" ? "جنرل سائنس اٺين" : "General Science Class 8",
    locale === "ur" ? "انگریزی گرامر نہم" : locale === "sd" ? "انگريزي گرامر نائين" : "English Grammar Class 9",
  ];

  const readyDocumentChips = [
    locale === "ur" ? "سوالات کے نیچے جوابی لکیریں شامل کریں" : locale === "sd" ? "سوالن هيٺان جوابي لڪيرون لڳايو" : "Add answer lines under questions",
    locale === "ur" ? "نمبروں کو مشرقی عربی (۱، ۲، ۳) میں تبدیل کریں" : locale === "sd" ? "نمبرن کي سنڌي انگن (۱، ۲، ۳) ۾ تبديل ڪريو" : "Convert to Eastern Arabic numerals (۱، ۲، ۳)",
    locale === "ur" ? "سیکشن اے میں 5 مزید ایم سی کیوز شامل کریں" : locale === "sd" ? "سيڪشن الف ۾ 5 وڌيڪ چونڊ سوال شامل ڪريو" : "Add 5 more MCQs to Section A",
    locale === "ur" ? "مختصر سوالات کو مزید تصوراتی بنائیں" : locale === "sd" ? "مختصر سوالن کي وڌيڪ تصوراتي ٺاهيو" : "Make short questions more conceptual",
    locale === "ur" ? "کل نمبر 100 کر دیں" : locale === "sd" ? "ڪل مارڪون 100 ڪريو" : "Set total marks to 100",
  ];

  const canSubmit = (textInput.trim().length > 0 || selectedPhotos.length > 0) && !isBusy;

  return (
    <div className="sticky bottom-0 z-20 w-full bg-white/95 backdrop-blur-md border-t border-[#E4DFF0] px-3 sm:px-4 pt-2.5 pb-4 shadow-[0_-4px_20px_rgba(43,39,64,0.06)]">
      <div className="max-w-[640px] mx-auto space-y-2">
        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilesSelected}
          className="hidden"
          id="camera-input-unified"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          id="gallery-input-unified"
        />

        {/* Selected Photos Attachment Row */}
        {selectedPhotos.length > 0 && (
          <div className="p-2.5 bg-[#F7F5FB] rounded-2xl border border-[#B9A6E8]/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#2E1F4D] px-1">
              <span>
                {selectedPhotos.length} {locale === "ur" ? "تصاویر منسلک ہیں" : locale === "sd" ? "تصويرون ڳنڍيل آهن" : "photo(s) attached"}
              </span>
              <span className="text-[11px] text-[#5B5570]">
                {AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB - selectedPhotos.length}{" "}
                {locale === "ur" ? "مزید گنجائش" : locale === "sd" ? "وڌيڪ جاءِ" : "remaining"}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {selectedPhotos.map((photo, idx) => (
                <div key={idx} className="relative shrink-0 group">
                  <Image
                    src={photo}
                    alt={`Selected page ${idx + 1}`}
                    width={64}
                    height={80}
                    unoptimized
                    className="w-16 h-20 object-cover rounded-xl border border-[#E4DFF0] shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#C4425A] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white">
                    P{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pre-coded Pakistani Curriculum Category Tabs & Chips */}
        {selectedPhotos.length === 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#5B5570] px-1">
              <div className="flex items-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5 text-[#8B6FD1]" />
                <span>Pakistani Curriculum (Pre-coded):</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setChipTab("subjects")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    chipTab === "subjects"
                      ? "bg-[#2E1F4D] text-white"
                      : "bg-[#F7F5FB] text-[#5B5570] hover:text-[#2E1F4D]"
                  }`}
                >
                  10 Subjects
                </button>
                <button
                  type="button"
                  onClick={() => setChipTab("classes")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    chipTab === "classes"
                      ? "bg-[#2E1F4D] text-white"
                      : "bg-[#F7F5FB] text-[#5B5570] hover:text-[#2E1F4D]"
                  }`}
                >
                  Class 1-10
                </button>
                <button
                  type="button"
                  onClick={() => setChipTab("prompts")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    chipTab === "prompts"
                      ? "bg-[#2E1F4D] text-white"
                      : "bg-[#F7F5FB] text-[#5B5570] hover:text-[#2E1F4D]"
                  }`}
                >
                  {hasReadyDocument ? "Edits" : "Prompts"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none text-xs">
              {chipTab === "subjects" &&
                subjectChips.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleChipClick(s.prompt)}
                    className="shrink-0 min-h-[30px] px-2.5 py-1 rounded-full bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] text-xs font-semibold hover:border-[#8B6FD1] hover:bg-white hover:shadow-[0_0_12px_rgba(185,166,232,0.4)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}

              {chipTab === "classes" &&
                classChips.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleChipClick(c.prompt)}
                    className="shrink-0 min-h-[30px] px-2.5 py-1 rounded-full bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] text-xs font-semibold hover:border-[#8B6FD1] hover:bg-white hover:shadow-[0_0_12px_rgba(185,166,232,0.4)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {c.label}
                  </button>
                ))}

              {chipTab === "prompts" &&
                (hasReadyDocument ? readyDocumentChips : idleChips).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleChipClick(chip)}
                    className="shrink-0 min-h-[30px] px-2.5 py-1 rounded-full bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] text-xs font-semibold hover:border-[#8B6FD1] hover:bg-white hover:shadow-[0_0_12px_rgba(185,166,232,0.4)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Chat Input & Media Actions Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
          {/* Gallery Button */}
          <button
            type="button"
            disabled={isBusy || selectedPhotos.length >= AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB}
            onClick={() => galleryInputRef.current?.click()}
            title={locale === "ur" ? "تصاویر منتخب کریں" : locale === "sd" ? "تصويرون چونڊيو" : "Upload photos"}
            className="w-12 h-12 rounded-2xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] hover:text-[#8B6FD1] hover:border-[#8B6FD1] hover:bg-white active:scale-95 flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40"
          >
            <GalleryIcon className="w-5 h-5" />
          </button>

          {/* Camera Button */}
          <button
            type="button"
            disabled={isBusy || selectedPhotos.length >= AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB}
            onClick={() => cameraInputRef.current?.click()}
            title={locale === "ur" ? "کیمرے سے تصویر لیں" : locale === "sd" ? "ڪيمرا سان تصوير ڪڍو" : "Snap photo"}
            className="w-12 h-12 rounded-2xl bg-[#B9A6E8]/25 border border-[#B9A6E8] text-[#8B6FD1] hover:bg-[#8B6FD1] hover:text-white active:scale-95 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-[0_0_12px_rgba(185,166,232,0.3)] disabled:opacity-40"
          >
            <CameraIcon className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                selectedPhotos.length > 0
                  ? locale === "ur"
                    ? "ارسال کے بٹن پر کلک کریں…"
                    : locale === "sd"
                    ? "موڪلڻ لاءِ بٽڻ دٻايو…"
                    : "Tap send to analyze photos…"
                  : hasReadyDocument
                  ? locale === "ur"
                    ? "سونار ڈاکس سے ترمیم کہیں (جیسے: سیکشن بی مشکل کریں)…"
                    : locale === "sd"
                    ? "سونار ڊاڪس کي ترميم چئو (جهڙوڪ: سوال سخت ڪريو)…"
                    : "Ask SonarDocs to edit or adjust paper…"
                  : locale === "ur"
                  ? "نیا پرچہ بنانے یا ترمیم کے لیے لکھیں…"
                  : locale === "sd"
                  ? "نئون پڙچو ٺاهڻ يا ترميم لاءِ لکو…"
                  : "Message SonarDocs AI to compose or edit paper…"
              }
              disabled={isBusy}
              className="w-full h-12 px-4 rounded-2xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2B2740] text-sm placeholder:text-[#5B5570] focus:border-[#8B6FD1] focus:bg-white focus:ring-2 focus:ring-[#8B6FD1]/30 focus:shadow-[0_0_16px_rgba(185,166,232,0.4)] outline-hidden transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send message"
            className={`w-12 h-12 rounded-2xl bg-[#2E1F4D] text-white flex items-center justify-center shrink-0 transition-all cursor-pointer ${
              canSubmit
                ? "animate-soft-glow hover:bg-[#3d2b63] shadow-[0_0_16px_rgba(185,166,232,0.5)] active:scale-95"
                : "opacity-40 cursor-not-allowed"
            }`}
          >
            {isBusy ? (
              <SpinnerIcon className="w-5 h-5 animate-spin" />
            ) : (
              <SendIcon className="w-5 h-5 text-[#B9A6E8]" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
