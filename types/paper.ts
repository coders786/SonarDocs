export type TextDirection = "ltr" | "rtl";
export type SupportedLanguage = "en" | "ur" | "sd";

export type PipelineStage = "reading" | "inspecting" | "writing" | "ready" | "error";

export interface QuestionOption {
  key: string;                 // "A", "B", "C", "D"
  text: string;
}

export interface QuestionItem {
  id: string;
  number: string;              // "1", "۲", etc.
  text: string;
  marks?: string;              // e.g. "(5 marks)"
  options?: QuestionOption[];  // MCQ choices if present
  language: SupportedLanguage;
  direction: TextDirection;
  confidence: number;          // 0.0 to 1.0
  notes?: string;
  subQuestions?: QuestionItem[];
}

export interface SectionBlock {
  id: string;
  title: string;               // e.g. "Section A: MCQs", "باب اول"
  instructions?: string;       // e.g. "Attempt all questions."
  questions: QuestionItem[];
  direction: TextDirection;
  language: SupportedLanguage;
}

export interface PaperMetadata {
  title: string;               // e.g. "MIDTERM EXAMINATION 2026"
  subject: string;             // e.g. "Physics", "اردو لازمی"
  gradeClass: string;          // e.g. "Class IX", "جماعت نہم"
  totalMarks?: string;         // e.g. "75", "100"
  timeAllowed?: string;        // e.g. "3 Hours", "ٽي ڪلاڪ"
  instituteOrBoard?: string;   // e.g. "BISE Hyderabad", "Govt High School"
  primaryLanguage: SupportedLanguage;
  primaryDirection: TextDirection;
  dateStr?: string;
}

export interface TranscriptionDocument {
  version: string;             // "1.0"
  metadata: PaperMetadata;
  sections: SectionBlock[];
  overallConfidence: number;   // 0.0 to 1.0
  notes?: string;              // Any unreadable areas or ambiguity notes
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];
  selectedAnswer?: string;
  allowsCustomAnswer?: boolean;
}

export interface ClarifyingQuestionsPayload {
  sessionId?: string;
  rationale?: string;
  questions: ClarifyingQuestion[];
  originalInstruction?: string;
  rawXml?: string;
}

export interface DocManipulationAction {
  action: "update_marks" | "add_question" | "remove_question" | "reorder_sections" | "renumber" | "change_layout" | "custom";
  targetSectionId?: string;
  targetQuestionNumber?: string;
  parameters: Record<string, any>;
  description?: string;
}

export interface PaperJob {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  stage: PipelineStage;
  statusMessage: string;
  photos: string[];            // Data URLs or storage paths
  transcription?: TranscriptionDocument;
  docxUrl?: string;
  docxFilename?: string;       // Pattern: Subject_Class_Date.docx
  toolIterations: number;
  pendingQuestions?: ClarifyingQuestion[];
  answers?: Record<string, string>;
  error?: string;
}

export type MessageRole = "user" | "assistant" | "system";

export type MessageType = "photo" | "status" | "document" | "text" | "clarifying_questions";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  timestamp: number;
  jobId?: string;
  text?: string;
  photos?: string[];
  documentUrl?: string;
  documentFilename?: string;
  statusStage?: PipelineStage;
  questionsPayload?: ClarifyingQuestionsPayload;
  rawXml?: string;
}
