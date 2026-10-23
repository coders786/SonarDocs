"use client";

import React, { useState } from "react";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { SendIcon, EditPenIcon, SpinnerIcon } from "@/lib/icons";

interface EditInputBarProps {
  locale: Locale;
  jobId: string;
  onApplyEdit: (jobId: string, instruction: string) => Promise<void>;
  isEditing: boolean;
}

export function EditInputBar({
  locale,
  jobId,
  onApplyEdit,
  isEditing,
}: EditInputBarProps) {
  const t = TRANSLATIONS[locale];
  const [instruction, setInstruction] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isEditing) return;
    const text = instruction;
    setInstruction("");
    await onApplyEdit(jobId, text);
  };

  const handleChipClick = async (chipText: string) => {
    if (isEditing) return;
    await onApplyEdit(jobId, chipText);
  };

  return (
    <div className="w-full bg-[#F7F5FB] border-t border-[#E4DFF0] px-4 py-2.5">
      <div className="max-w-[640px] mx-auto space-y-2">
        {/* Quick Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none text-xs pr-6">
          <button
            type="button"
            disabled={isEditing}
            onClick={() => handleChipClick(t.quickEditMarks)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-[#E4DFF0] text-[#2E1F4D] font-medium hover:border-[#8B6FD1] transition-colors"
          >
            {t.quickEditMarks}
          </button>
          <button
            type="button"
            disabled={isEditing}
            onClick={() => handleChipClick(t.quickEditTitle)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-[#E4DFF0] text-[#2E1F4D] font-medium hover:border-[#8B6FD1] transition-colors"
          >
            {t.quickEditTitle}
          </button>
          <button
            type="button"
            disabled={isEditing}
            onClick={() => handleChipClick(t.quickEditNumbers)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-[#E4DFF0] text-[#2E1F4D] font-medium hover:border-[#8B6FD1] transition-colors"
          >
            {t.quickEditNumbers}
          </button>
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={t.editPlaceholder}
              disabled={isEditing}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-white border border-[#E4DFF0] text-[#2B2740] text-sm placeholder:text-[#5B5570] focus:border-[#8B6FD1] focus:ring-1 focus:ring-[#8B6FD1] outline-hidden transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B6FD1]">
              <EditPenIcon className="w-4 h-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={!instruction.trim() || isEditing}
            className="h-12 w-12 rounded-xl bg-[#2E1F4D] text-white flex items-center justify-center shrink-0 hover:bg-[#3d2b63] disabled:opacity-40 transition-colors shadow-xs"
            aria-label="Send edit instruction"
          >
            {isEditing ? (
              <SpinnerIcon className="w-5 h-5" />
            ) : (
              <SendIcon className="w-5 h-5 text-[#B9A6E8]" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
