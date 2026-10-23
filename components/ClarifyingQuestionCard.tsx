"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ClarifyingQuestionsPayload } from "@/types/paper";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { CheckIcon, SendIcon, SpinnerIcon, BrainCircuitIcon } from "@/lib/icons";

interface ClarifyingQuestionCardProps {
  payload: ClarifyingQuestionsPayload;
  locale: Locale;
  onSubmitAnswers: (answers: Record<string, string>, originalInstruction?: string) => Promise<void>;
}

export function ClarifyingQuestionCard({
  payload,
  locale,
  onSubmitAnswers,
}: ClarifyingQuestionCardProps) {
  const t = TRANSLATIONS[locale];
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectOption = (questionId: string, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const allAnswered = payload.questions.every((q) => !!selectedAnswers[q.id]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswers(selectedAnswers, payload.originalInstruction);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditContext = !!payload.originalInstruction;

  return (
    <motion.div
      id="clarifying-questions-card"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-[95%] sm:max-w-[90%] w-full bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#B9A6E8] shadow-[0_0_24px_rgba(185,166,232,0.35)] space-y-4 scroll-mt-24"
    >
      <div className="flex items-start gap-3 border-b border-[#E4DFF0] pb-3">
        <div className="w-9 h-9 rounded-xl bg-[#B9A6E8]/25 text-[#8B6FD1] flex items-center justify-center shrink-0">
          <BrainCircuitIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#2E1F4D] leading-snug">
            {payload.rationale ||
              (locale === "ur"
                ? "پرچے کی تفصیلات منتخب کریں:"
                : locale === "sd"
                ? "پڙچي جون وضاحتون چونڊيو:"
                : "Select Preferences:")}
          </h4>
          <p className="text-xs text-[#5B5570] mt-0.5">
            {isEditContext
              ? locale === "ur"
                ? "ترمیم کو لاگو کرنے کے لیے اختیارات پر ٹیپ کریں"
                : locale === "sd"
                ? "ترميم لاڳو ڪرڻ لاءِ هيٺين مان چونڊيو"
                : `Tailoring request: "${payload.originalInstruction}"`
              : locale === "ur"
              ? "بہترین فارمیٹنگ کے لیے درج ذیل اختیارات پر کلک کریں"
              : locale === "sd"
              ? "بهترين نتيجي لاءِ هيٺين مان چونڊيو"
              : "Tap your preferences to shape the examination paper"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {payload.questions.map((q, idx) => {
          const currentChoice = selectedAnswers[q.id];

          return (
            <div key={q.id || idx} className="space-y-2">
              <label className="text-xs font-bold text-[#2B2740] block">
                {idx + 1}. {q.question}
              </label>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = currentChoice === opt;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectOption(q.id, opt)}
                      className={`min-h-[46px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#2E1F4D] text-white shadow-[0_0_12px_rgba(185,166,232,0.5)] border-2 border-[#8B6FD1]"
                          : "bg-[#F7F5FB] border border-[#E4DFF0] text-[#2B2740] hover:border-[#8B6FD1] hover:bg-white"
                      }`}
                    >
                      {isSelected ? (
                        <CheckIcon className="w-4 h-4 text-[#A8E6C9]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[#B9A6E8]/70" />
                      )}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-[#E4DFF0] flex items-center justify-between gap-3">
        <span className="text-[11px] text-[#5B5570]">
          {allAnswered
            ? locale === "ur"
              ? "تمام ترجیحات منتخب ہو گئیں"
              : locale === "sd"
              ? "سموريون وضاحتون چونڊجي ويون"
              : "All preferences selected"
            : locale === "ur"
            ? "جاری رکھنے کے لیے تمام سوالات منتخب کریں"
            : locale === "sd"
            ? "اڳتي وڌڻ لاءِ سمورا سوال چونڊيو"
            : "Select an option for each question"}
        </span>

        <button
          type="button"
          disabled={!allAnswered || isSubmitting}
          onClick={handleSubmit}
          className={`min-h-[48px] px-6 rounded-xl bg-[#2E1F4D] text-white flex items-center gap-2 text-sm font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer ${
            allAnswered && !isSubmitting
              ? "animate-soft-glow hover:bg-[#3d2b63]"
              : "opacity-40 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <SpinnerIcon className="w-5 h-5 animate-spin" />
          ) : (
            <SendIcon className="w-4 h-4 text-[#B9A6E8]" />
          )}
          <span>
            {isEditContext
              ? locale === "ur"
                ? "تبدیلیاں لاگو کریں"
                : locale === "sd"
                ? "تبديليون لاڳو ڪريو"
                : "Apply Choices"
              : locale === "ur"
              ? "پرچہ بنائیں"
              : locale === "sd"
              ? "پڙچو تيار ڪريو"
              : "Generate Paper"}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
