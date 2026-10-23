"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InterrogatePayload, InterrogateQuestion } from "@/lib/interrogate-parser";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { CheckIcon, SendIcon, SpinnerIcon, BrainCircuitIcon, EditPenIcon } from "@/lib/icons";

interface InterrogateWizardCardProps {
  payload: InterrogatePayload;
  locale: Locale;
  onSubmitAnswers: (answers: Record<string, string>, sessionId: string, originalInstruction?: string) => Promise<void>;
}

export function InterrogateWizardCard({
  payload,
  locale,
  onSubmitAnswers,
}: InterrogateWizardCardProps) {
  const t = TRANSLATIONS[locale];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, { id: string; label: string }>>(() => {
    if (typeof window !== "undefined" && payload.sessionId) {
      try {
        const stored = sessionStorage.getItem(`sonardocs_session_${payload.sessionId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      } catch {
        // ignore storage error
      }
    }
    return {};
  });
  const [customText, setCustomText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = payload.questions || [];
  const totalSteps = questions.length;
  const currentQuestion: InterrogateQuestion | undefined = questions[currentStepIndex];

  const handleSelectOption = (questionId: string, optionId: string, optionLabel: string) => {
    const updated = {
      ...selectedAnswers,
      [questionId]: { id: optionId, label: optionLabel },
    };
    setSelectedAnswers(updated);

    // Save to session memory
    if (typeof window !== "undefined" && payload.sessionId) {
      try {
        sessionStorage.setItem(`sonardocs_session_${payload.sessionId}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleApplyCustomText = () => {
    if (!currentQuestion || !customText.trim()) return;
    handleSelectOption(currentQuestion.id, "custom", customText.trim());
  };

  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const isCurrentStepAnswered = !!currentAnswer;

  const handleNextStep = () => {
    setCustomText("");
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCustomText("");
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const answersMap: Record<string, string> = {};
    Object.entries(selectedAnswers).forEach(([qId, val]) => {
      answersMap[qId] = val.label;
    });

    try {
      await onSubmitAnswers(answersMap, payload.sessionId, payload.originalInstruction);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentQuestion) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <motion.div
      id="interrogate-wizard-card"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-[95%] sm:max-w-[90%] w-full bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#B9A6E8] shadow-[0_0_28px_rgba(185,166,232,0.4)] space-y-4 my-2"
    >
      {/* Wizard Header & Progress Bar */}
      <div className="space-y-2 border-b border-[#E4DFF0] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#B9A6E8]/25 text-[#8B6FD1] flex items-center justify-center font-bold text-xs">
              <BrainCircuitIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#2E1F4D] block">
                {locale === "ur" ? "وضاحتی سوالات (ایک ایک مرحلہ)" : locale === "sd" ? "وضاحتي سوال (هڪ هڪ مرحلو)" : "Clarification Wizard"}
              </span>
              <span className="text-[10px] text-[#5B5570]">
                {locale === "ur" ? "مرحلہ وار انتخاب کریں" : locale === "sd" ? "مرحلي وار چونڊيو" : "Sequential 1-by-1 choice selection"}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 rounded-full bg-[#2E1F4D] text-white text-xs font-bold shadow-xs">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Animated Progress Track */}
        <div className="w-full h-2 rounded-full bg-[#F7F5FB] border border-[#E4DFF0] overflow-hidden">
          <motion.div
            className="h-full bg-[#8B6FD1]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Sequential Question Step (Strictly 1 question at a time) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B6FD1]">
              Question {currentStepIndex + 1} of {totalSteps}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-[#2E1F4D] leading-snug">
              {currentQuestion.text}
            </h4>
          </div>

          {/* Options List */}
          <div className="space-y-2 pt-1">
            {currentQuestion.options.map((opt) => {
              const isSelected = currentAnswer?.id === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.id, opt.label)}
                  className={`w-full p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#2E1F4D] text-white border-2 border-[#8B6FD1] shadow-[0_0_18px_rgba(185,166,232,0.5)] font-bold"
                      : "bg-[#F7F5FB] border border-[#E4DFF0] text-[#2B2740] hover:border-[#8B6FD1] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[#8B6FD1] text-white"
                          : "bg-[#E4DFF0] text-[#2E1F4D]"
                      }`}
                    >
                      {opt.id.toUpperCase()}
                    </span>
                    <span className="leading-snug">{opt.label}</span>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#A8E6C9] flex items-center justify-center text-[#3E9F73] shrink-0">
                      <CheckIcon className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Write-In Option Input */}
          <div className="pt-2 border-t border-[#E4DFF0]/60 space-y-1.5">
            <label className="text-[11px] font-semibold text-[#5B5570] flex items-center gap-1.5">
              <EditPenIcon className="w-3.5 h-3.5 text-[#8B6FD1]" />
              <span>{locale === "ur" ? "یا اپنی مرضی کی ہدایت لکھیں:" : locale === "sd" ? "يا پنهنجي مرضيءَ مطابق لکو:" : "Or type custom preference:"}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyCustomText();
                  }
                }}
                placeholder={
                  currentAnswer?.id === "custom"
                    ? `Selected: "${currentAnswer.label}"`
                    : "e.g., 60 marks, 10 short questions, BISE Sukkur"
                }
                className="flex-1 h-10 px-3 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-xs text-[#2B2740] placeholder:text-[#5B5570] focus:border-[#8B6FD1] outline-hidden"
              />
              <button
                type="button"
                disabled={!customText.trim() || isSubmitting}
                onClick={handleApplyCustomText}
                className="px-3.5 h-10 rounded-xl bg-[#8B6FD1] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#785bc0] transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
            {currentAnswer?.id === "custom" && (
              <p className="text-[11px] text-[#3E9F73] font-semibold">
                Active custom choice: &quot;{currentAnswer.label}&quot;
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Sequential Navigation & Wizard Controls */}
      <div className="pt-3 border-t border-[#E4DFF0] flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={currentStepIndex === 0 || isSubmitting}
          onClick={handlePrevStep}
          className="min-h-[44px] px-4 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] text-xs font-semibold hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all"
        >
          ← Back
        </button>

        {!isLastStep ? (
          <button
            type="button"
            disabled={!isCurrentStepAnswered || isSubmitting}
            onClick={handleNextStep}
            className={`min-h-[44px] px-5 rounded-xl bg-[#2E1F4D] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isCurrentStepAnswered ? "animate-soft-glow hover:bg-[#3d2b63]" : "opacity-40 cursor-not-allowed"
            }`}
          >
            <span>Next Step</span>
            <span>→</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!isCurrentStepAnswered || isSubmitting}
            onClick={handleFinalSubmit}
            className={`min-h-[48px] px-6 rounded-xl bg-[#2E1F4D] text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              isCurrentStepAnswered && !isSubmitting
                ? "animate-soft-glow hover:bg-[#3d2b63] shadow-[0_0_20px_rgba(185,166,232,0.6)]"
                : "opacity-40 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <SpinnerIcon className="w-5 h-5 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4 text-[#B9A6E8]" />
            )}
            <span>
              {payload.originalInstruction
                ? locale === "ur" ? "تبدیلیاں لاگو کریں" : locale === "sd" ? "تبديليون لاڳو ڪريو" : "Apply Revisions"
                : locale === "ur" ? "پرچہ تیار کریں" : locale === "sd" ? "پڙچو تيار ڪريو" : "Synthesize & Generate"}
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
