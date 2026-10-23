"use client";

import React from "react";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { HistoryIcon, GoogleGIcon, EditPenIcon } from "@/lib/icons";

interface HeaderProps {
  locale: Locale;
  setLocale: (l: Locale) => void;
  user: { name: string; email: string } | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenHistory: () => void;
  onOpenCompose?: () => void;
}

export function Header({
  locale,
  setLocale,
  user,
  onSignIn,
  onSignOut,
  onOpenHistory,
  onOpenCompose,
}: HeaderProps) {
  const t = TRANSLATIONS[locale];

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E4DFF0] px-3 py-2.5 shadow-xs">
      <div className="max-w-[640px] mx-auto flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#B9A6E8]/25 border border-[#B9A6E8]/40 flex items-center justify-center text-[#8B6FD1]">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
              <path d="M6 14h6" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#2E1F4D] tracking-tight leading-none truncate">
              {t.appName}
            </h1>
            <p className="text-[10px] text-[#5B5570] font-semibold leading-none mt-0.5 truncate hidden sm:block">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Compact Universal Language Toggle */}
          <div className="flex items-center bg-[#F7F5FB] rounded-lg p-0.5 border border-[#E4DFF0]">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors ${
                locale === "en"
                  ? "bg-[#2E1F4D] text-white shadow-xs"
                  : "text-[#5B5570] hover:text-[#2B2740]"
              }`}
              aria-label="English"
              title="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("ur")}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors ${
                locale === "ur"
                  ? "bg-[#2E1F4D] text-white shadow-xs"
                  : "text-[#5B5570] hover:text-[#2B2740]"
              }`}
              aria-label="Urdu"
              title="Urdu (اردو)"
            >
              UR
            </button>
            <button
              type="button"
              onClick={() => setLocale("sd")}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold rounded-md transition-colors ${
                locale === "sd"
                  ? "bg-[#2E1F4D] text-white shadow-xs"
                  : "text-[#5B5570] hover:text-[#2B2740]"
              }`}
              aria-label="Sindhi"
              title="Sindhi (سنڌي)"
            >
              SD
            </button>
          </div>

          {/* Compose New Exam Button */}
          {onOpenCompose && (
            <button
              type="button"
              onClick={onOpenCompose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] flex items-center justify-center text-[#5B5570] hover:text-[#2E1F4D] hover:bg-[#B9A6E8]/20 transition-colors"
              title="Compose Exam Paper"
              aria-label="Compose Exam Paper"
            >
              <EditPenIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8B6FD1]" />
            </button>
          )}

          {/* History Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] flex items-center justify-center text-[#5B5570] hover:text-[#2E1F4D] hover:bg-[#B9A6E8]/10 transition-colors"
            aria-label={t.historyTitle}
            title={t.historyTitle}
          >
            <HistoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Google Teacher Sign In / Status */}
          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="h-8 sm:h-9 px-2 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] flex items-center gap-1.5 text-xs font-semibold text-[#2E1F4D] hover:bg-rose-50 hover:text-[#C4425A] transition-colors"
              title={`${user.name} (${user.email}) - Click to sign out`}
            >
              <span className="w-2 h-2 rounded-full bg-[#3E9F73] shrink-0" />
              <span className="max-w-[56px] truncate text-[11px] font-bold text-[#2E1F4D]">{user.name.split(" ")[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-[#2E1F4D] text-white flex items-center gap-1 sm:gap-1.5 text-xs font-bold hover:bg-[#3d2b63] transition-colors shadow-xs"
            >
              <GoogleGIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{t.signInWithGoogle}</span>
            </button>
          )}
        </div>
      </div>

      {/* Smart Model Tier & Prompt Cache Sub-bar */}
      <div className="max-w-[640px] mx-auto mt-2 pt-1.5 border-t border-[#E4DFF0]/60 flex items-center justify-between text-[10px] text-[#5B5570]">
        <div className="flex items-center gap-1.5 font-medium min-w-0 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B6FD1] shrink-0" />
          <span className="font-semibold text-[#2E1F4D] truncate">
            {locale === "en" ? "Gemini 3.1 Flash Lite" : "Gemini 3.8 Flash"}
          </span>
          <span className="text-[#8B6FD1] hidden xs:inline">|</span>
          <span className="truncate hidden xs:inline">
            {locale === "en"
              ? "Fast OCR"
              : locale === "ur"
              ? "Nastaliq Medium Thinking"
              : "Deep Thinking + Python Zoom"}
          </span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-[#3E9F73] bg-[#A8E6C9]/35 px-1.5 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3E9F73]" />
          <span>Cache Active</span>
        </div>
      </div>
    </header>
  );
}
