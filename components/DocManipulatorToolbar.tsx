"use client";

import React, { useState } from "react";
import { Locale } from "@/lib/i18n";
import { EditPenIcon, SpinnerIcon, RefreshIcon } from "@/lib/icons";

interface DocManipulatorToolbarProps {
  jobId: string;
  locale: Locale;
  onManipulate: (jobId: string, action: string, payload?: Record<string, any>) => Promise<void>;
}

export function DocManipulatorToolbar({
  jobId,
  locale,
  onManipulate,
}: DocManipulatorToolbarProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleAction = async (action: string, payload?: Record<string, any>) => {
    if (activeAction) return;
    setActiveAction(action);
    try {
      await onManipulate(jobId, action, payload);
    } finally {
      setActiveAction(null);
    }
  };

  const isUrdu = locale === "ur";
  const isSindhi = locale === "sd";

  return (
    <div className="pt-2 border-t border-[#E4DFF0] space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-[#5B5570]">
        <span>
          {isUrdu ? "فوری تدوین و تبدیل:" : isSindhi ? "فوري تبديلي:" : "Quick Document Tools:"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
        {/* Action 1: Eastern vs Western Numerals */}
        <button
          type="button"
          disabled={!!activeAction}
          onClick={() => handleAction("convert_numerals", { toEastern: true })}
          className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#B9A6E8]/20 transition-colors"
        >
          {activeAction === "convert_numerals" ? (
            <SpinnerIcon className="w-4 h-4" />
          ) : (
            <span className="font-bold text-[#8B6FD1]">۱، ۲، ۳</span>
          )}
          <span>{isUrdu ? "مشرقی ہندسے" : isSindhi ? "سنڌي انگ" : "Eastern 1 2 3"}</span>
        </button>

        {/* Action 2: Add Answer Lines */}
        <button
          type="button"
          disabled={!!activeAction}
          onClick={() => handleAction("add_answer_lines")}
          className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#B9A6E8]/20 transition-colors"
        >
          {activeAction === "add_answer_lines" ? (
            <SpinnerIcon className="w-4 h-4" />
          ) : (
            <EditPenIcon className="w-4 h-4 text-[#8B6FD1]" />
          )}
          <span>{isUrdu ? "جوابی لکیریں" : isSindhi ? "جوابي لڪيرون" : "Answer Lines"}</span>
        </button>

        {/* Action 3: Reorder Sections */}
        <button
          type="button"
          disabled={!!activeAction}
          onClick={() => handleAction("reorder_sections")}
          className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#B9A6E8]/20 transition-colors"
        >
          {activeAction === "reorder_sections" ? (
            <SpinnerIcon className="w-4 h-4" />
          ) : (
            <RefreshIcon className="w-4 h-4 text-[#8B6FD1]" />
          )}
          <span>{isUrdu ? "سیکشن الٹیں" : isSindhi ? "سيڪشن ترتيب" : "Reorder Parts"}</span>
        </button>
      </div>
    </div>
  );
}
