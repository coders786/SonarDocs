"use client";

import React from "react";
import { TranscriptionDocument } from "@/types/paper";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { CloseIcon, DownloadIcon, CheckIcon } from "@/lib/icons";

interface TextPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcription?: TranscriptionDocument;
  docxUrl?: string;
  docxFilename?: string;
  locale: Locale;
}

export function TextPreviewModal({
  isOpen,
  onClose,
  transcription,
  docxUrl,
  docxFilename,
  locale,
}: TextPreviewModalProps) {
  if (!isOpen || !transcription) return null;
  const t = TRANSLATIONS[locale];

  return (
    <div className="fixed inset-0 z-50 bg-[#2E1F4D]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-xl border border-[#E4DFF0] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E4DFF0] flex items-center justify-between bg-[#F7F5FB]">
          <div>
            <h3 className="text-base font-bold text-[#2E1F4D]">
              {transcription.metadata.title || "Paper Preview"}
            </h3>
            <p className="text-xs text-[#5B5570]">
              {transcription.metadata.subject} • {transcription.metadata.gradeClass}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E4DFF0] flex items-center justify-center text-[#5B5570] hover:text-[#2E1F4D] transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-[#2B2740]">
          {/* Metadata banner */}
          <div className="p-3 bg-[#F7F5FB] rounded-xl border border-[#E4DFF0] flex flex-wrap gap-4 text-xs font-semibold text-[#2E1F4D]">
            {transcription.metadata.totalMarks && (
              <div>Marks: {transcription.metadata.totalMarks}</div>
            )}
            {transcription.metadata.timeAllowed && (
              <div>Time: {transcription.metadata.timeAllowed}</div>
            )}
            {transcription.metadata.instituteOrBoard && (
              <div>Board: {transcription.metadata.instituteOrBoard}</div>
            )}
          </div>

          {/* Sections */}
          {transcription.sections.map((sec) => (
            <div key={sec.id} className="space-y-3">
              <div
                dir={sec.direction}
                className="text-sm font-bold text-[#2E1F4D] border-b border-[#E4DFF0] pb-1"
              >
                {sec.title}
              </div>
              {sec.instructions && (
                <div
                  dir={sec.direction}
                  className="text-xs italic text-[#5B5570]"
                >
                  {sec.instructions}
                </div>
              )}

              <div className="space-y-2">
                {sec.questions.map((q) => (
                  <div
                    key={q.id}
                    dir={q.direction}
                    className="p-3 rounded-xl bg-slate-50/70 border border-[#E4DFF0] text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-[#8B6FD1] ml-1 mr-1">
                          {q.number}
                        </span>
                        <span>{q.text}</span>
                      </div>
                      {q.marks && (
                        <span className="shrink-0 text-xs font-bold text-[#3E9F73] bg-[#A8E6C9]/40 px-2 py-0.5 rounded">
                          {q.marks} {locale === "en" ? "Marks" : "نمبر"}
                        </span>
                      )}
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-[#5B5570]">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="bg-white p-1.5 rounded border border-[#E4DFF0]">
                            ({opt.key || oIdx + 1}) {typeof opt === "string" ? opt : opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E4DFF0] bg-[#F7F5FB] flex justify-end gap-2">
          {docxUrl && (
            <a
              href={docxUrl}
              download={docxFilename}
              className="h-11 px-4 rounded-xl bg-[#2E1F4D] text-white flex items-center gap-2 text-sm font-bold hover:bg-[#3d2b63] transition-colors"
            >
              <DownloadIcon className="w-4 h-4 text-[#B9A6E8]" />
              <span>{t.downloadDocx}</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-xl bg-white border border-[#E4DFF0] text-[#2E1F4D] text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
