"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChatMessage, PaperJob, PipelineStage } from "@/types/paper";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { motion } from "motion/react";
import {
  DocumentIcon,
  DownloadIcon,
  ScanEyeIcon,
  CheckIcon,
  RefreshIcon,
  SpinnerIcon,
  AlertCircleIcon,
  CameraIcon,
  EditPenIcon,
  SparklesIcon,
  GoogleDocsIcon,
  ExternalLinkIcon,
} from "@/lib/icons";
import { InterrogateWizardCard } from "./InterrogateWizardCard";
import { DocManipulatorToolbar } from "./DocManipulatorToolbar";
import { parseInterrogateXml, buildInterrogateXml, InterrogatePayload } from "@/lib/interrogate-parser";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentJob: PaperJob | null;
  locale: Locale;
  onRetry: () => void;
  onInspectText: (jobId: string) => void;
  onSubmitClarifyingAnswers?: (answers: Record<string, string>, originalInstruction?: string) => Promise<void>;
  onManipulateDoc?: (jobId: string, action: string, payload?: Record<string, any>) => Promise<void>;
  onQuickPrompt?: (prompt: string) => void;
  onExportToGoogleDocs?: (jobId: string) => Promise<{ docUrl: string } | null>;
  googleDocLinks?: Record<string, string>;
}

export function ChatMessageList({
  messages,
  currentJob,
  locale,
  onRetry,
  onInspectText,
  onSubmitClarifyingAnswers,
  onManipulateDoc,
  onQuickPrompt,
  onExportToGoogleDocs,
  googleDocLinks = {},
}: ChatMessageListProps) {
  const t = TRANSLATIONS[locale];
  const [exportingJobId, setExportingJobId] = useState<string | null>(null);

  const handleExportGoogleDoc = async (jobId: string) => {
    if (!onExportToGoogleDocs || exportingJobId) return;
    setExportingJobId(jobId);
    try {
      await onExportToGoogleDocs(jobId);
    } finally {
      setExportingJobId(null);
    }
  };

  if (messages.length === 0 && !currentJob) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto">
        <div className="w-full max-w-md space-y-4">
          {/* Friendly AI Chatbot Avatar */}
          <div className="w-16 h-16 rounded-3xl bg-[#B9A6E8]/25 border-2 border-[#B9A6E8] flex items-center justify-center text-[#8B6FD1] mx-auto animate-soft-glow shadow-[0_0_24px_rgba(185,166,232,0.35)]">
            <EditPenIcon className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2E1F4D]">
              {locale === "ur" ? "سونار ڈاکس امتحانی چیٹ بوٹ" : locale === "sd" ? "سونار ڊاڪس امتحان چيٽ بوٽ" : "SonarDocs Exam Chatbot"}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B5570] font-medium mt-1">
              {locale === "ur"
                ? "کوئی بھی پرچہ بنانے کے لیے میسج کریں، یا پرانی کاپی اسکین کریں"
                : locale === "sd"
                ? "ڪو به پڙچو تيار ڪرڻ لاءِ چيٽ ڪريو يا تصوير اسڪين ڪريو"
                : "Chat to create or edit any exam paper, or snap a photo to transcribe."}
            </p>
          </div>

          {/* Simple Step-by-Step Derivation */}
          <div className="p-3 bg-white rounded-2xl border border-[#E4DFF0] shadow-xs flex items-center justify-between text-[11px] font-semibold text-[#2E1F4D] gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#2E1F4D] text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Ask in Chat</span>
            </div>
            <span className="text-[#8B6FD1]">→</span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#8B6FD1] text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <span>1-by-1 MCQs</span>
            </div>
            <span className="text-[#8B6FD1]">→</span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#3E9F73] text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Google Docs & Word</span>
            </div>
          </div>

          {/* Direct Conversational Starters */}
          <div className="space-y-2 text-left pt-1">
            <span className="text-[10px] font-bold text-[#5B5570] uppercase tracking-wider block px-1 flex items-center gap-1">
              <SparklesIcon className="w-3.5 h-3.5 text-[#8B6FD1]" />
              <span>{locale === "ur" ? "فوری آغاز کریں:" : locale === "sd" ? "جلدي شروعات ڪريو:" : "Quick Conversation Starters:"}</span>
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                {
                  title: "Class 9 Physics Midterm",
                  desc: "50 Marks, Sindh Board pattern with MCQs & numericals",
                  prompt: "Create a Class 9 Physics Midterm examination paper with 50 marks",
                },
                {
                  title: "Class 10 Urdu Lazmi Paper",
                  desc: "Matric Board pattern with poetry explanation & essays",
                  prompt: "Compose Class 10 Urdu Lazmi examination paper according to Matric Board",
                },
                {
                  title: "Class 9 Sindhi Lazmi Exam",
                  desc: "Authentic Sindhi script, grammar, questions & summary",
                  prompt: "Compose Class 9 Sindhi Lazmi examination paper with authentic orthography",
                },
                {
                  title: "Class 8 General Science Test",
                  desc: "Short quiz with diagrams and conceptual questions",
                  prompt: "Create Class 8 General Science test paper with 25 marks",
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuickPrompt?.(item.prompt)}
                  className="w-full p-2.5 bg-white rounded-2xl border border-[#E4DFF0] hover:border-[#8B6FD1] shadow-xs hover:shadow-[0_0_16px_rgba(185,166,232,0.35)] transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-[#2E1F4D] block group-hover:text-[#8B6FD1] transition-colors truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-[#5B5570] block truncate">
                      {item.desc}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#8B6FD1] shrink-0 group-hover:translate-x-1 transition-transform">
                    Send →
                  </span>
                </button>
              ))}
            </div>

            {/* Camera / OCR Option */}
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("camera-input-unified") as HTMLInputElement;
                input?.click();
              }}
              className="w-full p-2.5 rounded-2xl bg-[#F7F5FB] border border-[#B9A6E8] hover:bg-[#B9A6E8]/20 transition-all flex items-center justify-center gap-2 text-xs font-bold text-[#2E1F4D] cursor-pointer"
            >
              <CameraIcon className="w-4 h-4 text-[#8B6FD1]" />
              <span>Or Snap Photo of Existing Paper (OCR)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto">
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        if (msg.type === "photo" && msg.photos) {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[85%] bg-white rounded-2xl p-2.5 border border-[#E4DFF0] shadow-xs">
                <div className="flex flex-wrap gap-2">
                  {msg.photos.map((p, idx) => (
                    <Image
                      key={idx}
                      src={p}
                      alt={`Uploaded paper ${idx + 1}`}
                      width={96}
                      height={128}
                      unoptimized
                      className="w-20 h-28 sm:w-24 sm:h-32 object-cover rounded-xl border border-[#E4DFF0]"
                    />
                  ))}
                </div>
                <div className="mt-1 text-right text-[10px] text-[#5B5570]">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>
          );
        }

        if (msg.type === "status") {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex justify-start"
            >
              <StatusCard stage={msg.statusStage || "reading"} text={msg.text || ""} locale={locale} />
            </motion.div>
          );
        }

        if (msg.type === "document") {
          const docUrl = msg.jobId ? googleDocLinks[msg.jobId] : undefined;
          const isExporting = msg.jobId === exportingJobId;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex justify-start w-full"
            >
              <div className="max-w-[95%] sm:max-w-[90%] w-full bg-white rounded-2xl p-4 border-2 border-[#A8E6C9] shadow-[0_0_20px_rgba(168,230,201,0.45)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#A8E6C9]/40 flex items-center justify-center text-[#3E9F73]">
                    <DocumentIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs font-bold text-[#3E9F73]">
                      <CheckIcon className="w-4 h-4" />
                      <span>{t.paperReady}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#2E1F4D] truncate mt-0.5">
                      {msg.documentFilename || "Exam_Paper.docx"}
                    </div>
                  </div>
                </div>

                {/* Primary Actions: Google Docs & Word Download */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Google Docs Export / Open Button */}
                  {docUrl ? (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 rounded-xl bg-[#4285F4] text-white flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-xs hover:bg-[#3367D6] transition-all cursor-pointer"
                    >
                      <GoogleDocsIcon className="w-4 h-4 text-white" />
                      <span>Open in Google Docs</span>
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => msg.jobId && handleExportGoogleDoc(msg.jobId)}
                      className="h-11 rounded-xl bg-[#2E1F4D] text-white flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-xs hover:bg-[#3d2b63] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isExporting ? (
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <GoogleDocsIcon className="w-4 h-4 text-[#B9A6E8]" />
                      )}
                      <span>{isExporting ? "Creating in Docs…" : "Save to Google Docs"}</span>
                    </button>
                  )}

                  {/* Word File Download */}
                  <a
                    href={msg.documentUrl}
                    download={msg.documentFilename}
                    className="h-11 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#2E1F4D] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold hover:border-[#8B6FD1] transition-all cursor-pointer"
                  >
                    <DownloadIcon className="w-4 h-4 text-[#8B6FD1]" />
                    <span>{t.downloadDocx}</span>
                  </a>
                </div>

                {/* Preview / Inspection button */}
                {msg.jobId && (
                  <button
                    type="button"
                    onClick={() => onInspectText(msg.jobId!)}
                    className="w-full h-9 rounded-xl bg-[#F7F5FB] border border-[#E4DFF0] text-[#5B5570] flex items-center justify-center gap-2 text-xs font-semibold hover:text-[#2E1F4D] transition-colors cursor-pointer"
                  >
                    <ScanEyeIcon className="w-4 h-4 text-[#8B6FD1]" />
                    <span>{t.inspectPreview}</span>
                  </button>
                )}

                {/* Direct Document Manipulation Toolbar */}
                {msg.jobId && onManipulateDoc && (
                  <DocManipulatorToolbar
                    jobId={msg.jobId}
                    locale={locale}
                    onManipulate={onManipulateDoc}
                  />
                )}
              </div>
            </motion.div>
          );
        }

        if (msg.type === "clarifying_questions" && msg.questionsPayload) {
          // Parse XML or create structured payload so it is ALWAYS rendered sequentially
          const xmlToParse = msg.rawXml ||
                             msg.questionsPayload.rawXml ||
                             buildInterrogateXml(msg.questionsPayload.sessionId || `sess_${msg.id}`, msg.questionsPayload.questions);

          let parsedXml: InterrogatePayload | null = parseInterrogateXml(xmlToParse);

          // If XML parsing didn't match, wrap questions directly into InterrogatePayload
          if (!parsedXml && msg.questionsPayload.questions) {
            parsedXml = {
              sessionId: msg.questionsPayload.sessionId || `session_${msg.id}`,
              originalInstruction: msg.questionsPayload.originalInstruction,
              questions: msg.questionsPayload.questions.map((q, idx) => ({
                id: q.id || `q_${idx + 1}`,
                step: idx + 1,
                total: msg.questionsPayload!.questions.length,
                text: q.question,
                options: q.options.map((opt, oIdx) => ({
                  id: String.fromCharCode(97 + oIdx),
                  label: opt,
                })),
              })),
            };
          }

          if (parsedXml) {
            parsedXml.originalInstruction = msg.questionsPayload.originalInstruction;
            return (
              <div key={msg.id} className="flex justify-start w-full">
                <InterrogateWizardCard
                  payload={parsedXml}
                  locale={locale}
                  onSubmitAnswers={async (answers, sessionId, originalInstruction) => {
                    if (onSubmitClarifyingAnswers) {
                      await onSubmitClarifyingAnswers(answers, originalInstruction);
                    }
                  }}
                />
              </div>
            );
          }
        }

        // Standard text message
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                isUser
                  ? "bg-[#2E1F4D] text-white rounded-br-xs shadow-xs"
                  : "bg-white text-[#2B2740] border border-[#E4DFF0] rounded-bl-xs shadow-xs"
              }`}
            >
              <p>{msg.text}</p>
              <div
                className={`text-[9px] mt-0.5 text-right ${
                  isUser ? "text-slate-300" : "text-[#5B5570]"
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Active in-progress job card if currently running */}
      {currentJob && currentJob.stage !== "ready" && currentJob.stage !== "error" && (
        <div className="flex justify-start">
          <StatusCard stage={currentJob.stage} text={currentJob.statusMessage} locale={locale} />
        </div>
      )}

      {/* Error state card with retry */}
      {currentJob && currentJob.stage === "error" && (
        <div className="flex justify-start">
          <div className="max-w-[90%] bg-white rounded-2xl p-3 border border-[#F6C6D0] bg-[#F6C6D0]/10 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5 text-[#C4425A]" />
              <h4 className="text-xs font-bold text-[#C4425A]">
                {t.genericError}
              </h4>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="h-9 px-3 rounded-xl bg-[#2E1F4D] text-white flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-[#3d2b63] transition-colors cursor-pointer"
            >
              <RefreshIcon className="w-3.5 h-3.5 text-[#B9A6E8]" />
              <span>{t.retry}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  stage,
  text,
  locale,
}: {
  stage: PipelineStage;
  text: string;
  locale: Locale;
}) {
  const t = TRANSLATIONS[locale];

  let displayLabel = text;
  if (stage === "reading") displayLabel = t.readingPhoto;
  if (stage === "inspecting") displayLabel = t.lookingCloser;
  if (stage === "writing") displayLabel = t.writingFile;

  return (
    <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-[#B9A6E8] shadow-xs flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-[#B9A6E8]/20 flex items-center justify-center text-[#8B6FD1]">
        <SpinnerIcon className="w-4 h-4 animate-spin" />
      </div>
      <div>
        <p className="text-xs font-bold text-[#2E1F4D]">{displayLabel}</p>
        <p className="text-[10px] text-[#5B5570]">
          {stage === "reading"
            ? "Analyzing orthography"
            : stage === "inspecting"
            ? "Paleography inspection"
            : "Formatting examination document"}
        </p>
      </div>
    </div>
  );
}
