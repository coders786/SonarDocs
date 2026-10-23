"use client";

import React from "react";
import { PaperJob } from "@/types/paper";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { CloseIcon, DocumentIcon, DownloadIcon, ScanEyeIcon } from "@/lib/icons";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: PaperJob[];
  locale: Locale;
  onInspect: (jobId: string) => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  jobs,
  locale,
  onInspect,
}: HistoryDrawerProps) {
  if (!isOpen) return null;
  const t = TRANSLATIONS[locale];

  return (
    <div className="fixed inset-0 z-50 bg-[#2E1F4D]/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E4DFF0]">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#E4DFF0] flex items-center justify-between bg-[#F7F5FB]">
          <div className="flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-[#8B6FD1]" />
            <h3 className="text-base font-bold text-[#2E1F4D]">
              {t.historyTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E4DFF0] flex items-center justify-center text-[#5B5570] hover:text-[#2E1F4D] transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-16 text-[#5B5570] text-sm">
              {t.noPastPapers}
            </div>
          ) : (
            jobs.map((j) => (
              <div
                key={j.id}
                className="p-3.5 rounded-2xl bg-white border border-[#E4DFF0] shadow-xs space-y-2 hover:border-[#8B6FD1] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#2E1F4D] truncate">
                      {j.docxFilename || j.transcription?.metadata?.title || "Exam Paper"}
                    </h4>
                    <p className="text-xs text-[#5B5570]">
                      {new Date(j.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      j.stage === "ready"
                        ? "bg-[#A8E6C9]/40 text-[#3E9F73]"
                        : j.stage === "error"
                        ? "bg-[#F6C6D0]/40 text-[#C4425A]"
                        : "bg-[#B9A6E8]/40 text-[#8B6FD1]"
                    }`}
                  >
                    {j.stage.toUpperCase()}
                  </span>
                </div>

                {j.docxUrl && (
                  <div className="flex gap-2 pt-1">
                    <a
                      href={j.docxUrl}
                      download={j.docxFilename}
                      className="flex-1 h-9 rounded-xl bg-[#2E1F4D] text-white flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-[#3d2b63] transition-colors"
                    >
                      <DownloadIcon className="w-4 h-4 text-[#B9A6E8]" />
                      <span>{t.downloadDocx}</span>
                    </a>
                    {j.transcription && (
                      <button
                        type="button"
                        onClick={() => {
                          onInspect(j.id);
                          onClose();
                        }}
                        className="px-3 h-9 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] text-xs font-semibold hover:bg-slate-100 transition-colors"
                      >
                        <ScanEyeIcon className="w-4 h-4 text-[#8B6FD1]" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
