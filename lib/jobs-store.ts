import { PaperJob, ChatMessage, TranscriptionDocument, PipelineStage } from "@/types/paper";
import { generatePaperDocx } from "./docx-generator";

interface StoredJobData {
  job: PaperJob;
  docxBuffer?: Buffer;
  subscribers: Set<(job: PaperJob) => void>;
}

// Global in-memory storage singleton for Next.js dev & runtime
const globalForJobs = globalThis as unknown as {
  jobsStore: Map<string, StoredJobData> | undefined;
  messagesStore: Map<string, ChatMessage[]> | undefined;
  userRateLimitStore: Map<string, { count: number; date: string }> | undefined;
};

const jobsMap: Map<string, StoredJobData> = globalForJobs.jobsStore ?? new Map();
const messagesMap: Map<string, ChatMessage[]> = globalForJobs.messagesStore ?? new Map();
const rateLimitMap: Map<string, { count: number; date: string }> = globalForJobs.userRateLimitStore ?? new Map();

if (process.env.NODE_ENV !== "production") {
  globalForJobs.jobsStore = jobsMap;
  globalForJobs.messagesStore = messagesMap;
  globalForJobs.userRateLimitStore = rateLimitMap;
}

export function checkAndIncrementRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split("T")[0];
  const record = rateLimitMap.get(userId) || { count: 0, date: today };

  if (record.date !== today) {
    record.count = 0;
    record.date = today;
  }

  const MAX_PER_DAY = 20;
  if (record.count >= MAX_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  rateLimitMap.set(userId, record);
  return { allowed: true, remaining: MAX_PER_DAY - record.count };
}

export function createJob(userId: string, photos: string[]): PaperJob {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const newJob: PaperJob = {
    id: jobId,
    userId,
    createdAt: now,
    updatedAt: now,
    stage: "reading",
    statusMessage: "Reading your photo…",
    photos,
    toolIterations: 0,
  };

  jobsMap.set(jobId, {
    job: newJob,
    subscribers: new Set(),
  });

  // Add initial photo message to user's chat thread
  addChatMessage(userId, {
    id: `msg_${now}_photo`,
    role: "user",
    type: "photo",
    timestamp: now,
    jobId,
    photos,
  });

  // Add status message from assistant
  addChatMessage(userId, {
    id: `msg_${now}_status`,
    role: "assistant",
    type: "status",
    timestamp: now + 1,
    jobId,
    statusStage: "reading",
    text: "Reading your photo…",
  });

  return newJob;
}

export function updateJobStage(
  jobId: string,
  stage: PipelineStage,
  statusMessage: string,
  extra?: Partial<PaperJob>
) {
  const data = jobsMap.get(jobId);
  if (!data) return;

  data.job = {
    ...data.job,
    stage,
    statusMessage,
    updatedAt: Date.now(),
    ...extra,
  };

  // Notify SSE subscribers
  data.subscribers.forEach((callback) => {
    try {
      callback(data.job);
    } catch (e) {
      console.error("Subscriber notification error:", e);
    }
  });

  // Update or append status in user chat
  const messages = messagesMap.get(data.job.userId) || [];
  const existingStatusMsg = messages.find(
    (m) => m.jobId === jobId && m.type === "status"
  );

  if (existingStatusMsg) {
    existingStatusMsg.statusStage = stage;
    existingStatusMsg.text = statusMessage;
    existingStatusMsg.timestamp = Date.now();
  }
}

export async function finalizeJobSuccess(
  jobId: string,
  transcription: TranscriptionDocument
) {
  const data = jobsMap.get(jobId);
  if (!data) return;

  // Generate standard filename: Subject_Class_Date.docx
  const cleanSubject = (transcription.metadata.subject || "Exam")
    .replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")
    .substring(0, 24);
  const cleanClass = (transcription.metadata.gradeClass || "Paper")
    .replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")
    .substring(0, 16);
  const dateStr = new Date().toISOString().split("T")[0];
  const docxFilename = `${cleanSubject}_${cleanClass}_${dateStr}.docx`;

  // Render DOCX buffer
  const docxBuffer = await generatePaperDocx(transcription);
  data.docxBuffer = docxBuffer;

  const docxUrl = `/api/jobs/${jobId}/download`;

  updateJobStage(jobId, "ready", "Your paper is ready!", {
    transcription,
    docxUrl,
    docxFilename,
  });

  // Add document download card to chat thread
  addChatMessage(data.job.userId, {
    id: `msg_${Date.now()}_doc`,
    role: "assistant",
    type: "document",
    timestamp: Date.now(),
    jobId,
    documentUrl: docxUrl,
    documentFilename: docxFilename,
    text: "Your paper is ready!",
  });
}

export function finalizeJobError(jobId: string, errorMessage: string) {
  const data = jobsMap.get(jobId);
  if (!data) return;

  updateJobStage(jobId, "error", errorMessage, {
    error: errorMessage,
  });

  addChatMessage(data.job.userId, {
    id: `msg_${Date.now()}_err`,
    role: "assistant",
    type: "text",
    timestamp: Date.now(),
    jobId,
    text: errorMessage,
  });
}

export function getJob(jobId: string): PaperJob | undefined {
  return jobsMap.get(jobId)?.job;
}

export function getJobDocxBuffer(jobId: string): Buffer | undefined {
  return jobsMap.get(jobId)?.docxBuffer;
}

export function setJobDocxBuffer(jobId: string, buffer: Buffer) {
  const data = jobsMap.get(jobId);
  if (data) {
    data.docxBuffer = buffer;
  }
}

export function getUserJobs(userId: string): PaperJob[] {
  const list: PaperJob[] = [];
  jobsMap.forEach((entry) => {
    if (entry.job.userId === userId) {
      list.push(entry.job);
    }
  });
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export function addChatMessage(userId: string, message: ChatMessage) {
  const list = messagesMap.get(userId) || [];
  list.push(message);
  messagesMap.set(userId, list);
}

export function getUserChatMessages(userId: string): ChatMessage[] {
  return messagesMap.get(userId) || [];
}

export function subscribeToJob(jobId: string, callback: (job: PaperJob) => void): () => void {
  const data = jobsMap.get(jobId);
  if (!data) return () => {};

  data.subscribers.add(callback);
  return () => {
    data.subscribers.delete(callback);
  };
}
