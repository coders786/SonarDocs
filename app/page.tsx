"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { ChatMessageList } from "@/components/ChatMessageList";
import { ChatInputBar } from "@/components/ChatInputBar";
import { TextPreviewModal } from "@/components/TextPreviewModal";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { Locale, TRANSLATIONS } from "@/lib/i18n";
import { ChatMessage, PaperJob } from "@/types/paper";
import { initAuth, googleSignIn, logout, getAccessToken } from "@/lib/google-auth";
import { createGoogleDocPaper } from "@/lib/google-docs";
import { User } from "firebase/auth";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [googleDocLinks, setGoogleDocLinks] = useState<Record<string, string>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [jobs, setJobs] = useState<PaperJob[]>([]);
  const [currentJob, setCurrentJob] = useState<PaperJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [activeInspectJob, setActiveInspectJob] = useState<PaperJob | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[locale];
  const direction = t.direction;

  // Initialize real Firebase Google Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setFirebaseUser(user);
      },
      () => {
        setFirebaseUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Connect SSE for live job progress
  const connectSSE = (jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const updatedJob: PaperJob = JSON.parse(event.data);
        setCurrentJob(updatedJob);

        if (updatedJob.stage === "ready" || updatedJob.stage === "error") {
          setIsProcessing(false);
          es.close();
          loadData();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      es.close();
      setIsProcessing(false);
      loadData();
    };
  };

  const loadData = async () => {
    const userId = firebaseUser?.email || "default_teacher";
    try {
      const res = await fetch(`/api/jobs?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        if (Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          const inProgress = data.jobs.find(
            (j: PaperJob) => j.stage !== "ready" && j.stage !== "error"
          );
          if (inProgress) {
            setCurrentJob(inProgress);
            setIsProcessing(true);
            connectSSE(inProgress.id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching chat data:", err);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.email]);

  // Auto-create in Google Docs in background if teacher is signed in with Google
  useEffect(() => {
    if (!firebaseUser) return;
    let isCancelled = false;

    const syncDocs = async () => {
      const token = await getAccessToken();
      if (!token || isCancelled) return;

      const readyJobsWithoutLink = jobs.filter(
        (j) => j.stage === "ready" && j.transcription && !googleDocLinks[j.id]
      );

      for (const rJob of readyJobsWithoutLink) {
        if (isCancelled) break;
        try {
          const res = await createGoogleDocPaper(token, rJob.transcription!);
          if (!isCancelled) {
            setGoogleDocLinks((prev) => ({
              ...prev,
              [rJob.id]: res.docUrl,
            }));
          }
        } catch (e) {
          console.warn("Background Google Docs sync notice:", e);
        }
      }
    };

    syncDocs();
    return () => {
      isCancelled = true;
    };
  }, [jobs, firebaseUser, googleDocLinks]);

  // Scroll to bottom on message update, or top of wizard card when clarifying
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.type === "clarifying_questions") {
      const wizardCard = document.getElementById("interrogate-wizard-card");
      if (wizardCard) {
        wizardCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentJob]);

  // Handler: Teacher sends photo(s)
  const handleSendPhotos = async (photos: string[]) => {
    if (photos.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const userId = firebaseUser?.email || "default_teacher";

    const tempJobId = `temp_${Date.now()}`;
    const optimisticUserMsg: ChatMessage = {
      id: `msg_opt_${Date.now()}`,
      role: "user",
      type: "photo",
      timestamp: Date.now(),
      jobId: tempJobId,
      photos,
    };
    const optimisticStatusMsg: ChatMessage = {
      id: `msg_opt_status_${Date.now()}`,
      role: "assistant",
      type: "status",
      timestamp: Date.now() + 1,
      jobId: tempJobId,
      statusStage: "reading",
      text: t.readingPhoto,
    };

    setMessages((prev) => [...prev, optimisticUserMsg, optimisticStatusMsg]);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, photos, language: locale }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t.genericError);
      }

      const data = await res.json();
      if (data.job) {
        setCurrentJob(data.job);
        connectSSE(data.job.id);
      }
    } catch (err: any) {
      console.error("Job submit error:", err);
      setIsProcessing(false);
      loadData();
    }
  };

  // Find latest ready job to determine context (editing vs new paper)
  const latestReadyJob =
    jobs.find((j) => j.stage === "ready") ||
    (currentJob?.stage === "ready" ? currentJob : null);

  // Handler: Unified chat message sender
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing || isEditing) return;
    const userId = firebaseUser?.email || "default_teacher";

    // Scenario A: An active paper is ready -> Edit with interrogation
    if (latestReadyJob) {
      setIsEditing(true);
      try {
        const res = await fetch(`/api/jobs/${latestReadyJob.id}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: text.trim(), userId }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Edit failed");
        }

        await loadData();
      } catch (err) {
        console.error("Edit request error:", err);
      } finally {
        setIsEditing(false);
      }
      return;
    }

    // Scenario B: No paper ready yet -> Conversational compose request with dynamic interrogation
    setIsProcessing(true);
    try {
      const res = await fetch("/api/jobs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.trim(),
          language: locale,
          userId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Chat failed");
      }

      const data = await res.json();
      if (data.status === "composing" && data.job) {
        setCurrentJob(data.job);
        connectSSE(data.job.id);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error("Chat prompt error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Teacher answers bot's dynamic MCQ questions
  const handleSubmitClarifyingAnswers = async (
    answers: Record<string, string>,
    originalInstruction?: string
  ) => {
    const userId = firebaseUser?.email || "default_teacher";

    // If an active paper is ready, route answers to edit endpoint
    if (latestReadyJob) {
      setIsEditing(true);
      try {
        const res = await fetch(`/api/jobs/${latestReadyJob.id}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: originalInstruction || "Apply teacher's selected choices",
            answers,
            userId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed applying answers");
        }

        await loadData();
      } catch (err) {
        console.error("Submit edit answers error:", err);
      } finally {
        setIsEditing(false);
      }
      return;
    }

    // Otherwise, route answers to chat compose endpoint
    setIsProcessing(true);
    try {
      const res = await fetch("/api/jobs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: originalInstruction || "Compose examination paper",
          answers,
          language: locale,
          userId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed composing paper with answers");
      }

      const data = await res.json();
      if (data.job) {
        setCurrentJob(data.job);
        connectSSE(data.job.id);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error("Submit chat answers error:", err);
      setIsProcessing(false);
      loadData();
    }
  };

  // Handler: Export directly to Google Docs
  const handleExportToGoogleDocs = async (jobId: string): Promise<{ docUrl: string } | null> => {
    let token = await getAccessToken();

    // If not signed in or no token in memory, trigger Google Sign-in flow
    if (!token || !firebaseUser) {
      try {
        const signInResult = await googleSignIn();
        if (signInResult) {
          token = signInResult.accessToken;
          setFirebaseUser(signInResult.user);
        }
      } catch (err) {
        console.error("Sign in aborted or failed:", err);
        return null;
      }
    }

    if (!token) return null;

    const targetJob = jobs.find((j) => j.id === jobId) || currentJob;
    if (!targetJob || !targetJob.transcription) {
      alert("Paper content is still generating or not available.");
      return null;
    }

    try {
      const result = await createGoogleDocPaper(token, targetJob.transcription);
      setGoogleDocLinks((prev) => ({
        ...prev,
        [jobId]: result.docUrl,
      }));

      // Open new Google Doc tab
      if (typeof window !== "undefined") {
        window.open(result.docUrl, "_blank");
      }
      return { docUrl: result.docUrl };
    } catch (err: any) {
      console.error("Error creating Google Doc:", err);
      alert(`Could not create Google Doc: ${err.message || "Please check connection"}`);
      return null;
    }
  };

  // Handler: Direct document manipulation
  const handleManipulateDoc = async (
    jobId: string,
    action: string,
    payload: Record<string, any> = {}
  ) => {
    const userId = firebaseUser?.email || "default_teacher";
    try {
      const res = await fetch(`/api/jobs/${jobId}/manipulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload,
          userId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Manipulation failed");
      }

      await loadData();
    } catch (err) {
      console.error("Manipulation error:", err);
    }
  };

  // Handler: Inspect text modal
  const handleInspectText = (jobId: string) => {
    const target = jobs.find((j) => j.id === jobId) || currentJob;
    if (target && target.transcription) {
      setActiveInspectJob(target);
      setInspectModalOpen(true);
    }
  };

  // Auth handlers with real Firebase Google Provider
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setFirebaseUser(res.user);
        loadData();
      }
    } catch (err) {
      console.error("Google sign in error:", err);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setFirebaseUser(null);
  };

  // Display user object for Header
  const headerUser = firebaseUser
    ? {
        name: firebaseUser.displayName || "Google Teacher",
        email: firebaseUser.email || "",
      }
    : null;

  return (
    <div
      dir={direction}
      className="min-h-screen bg-[#F7F5FB] flex flex-col items-center justify-between font-sans selection:bg-[#B9A6E8] selection:text-[#2E1F4D]"
    >
      {/* Top Header with Real Google Auth */}
      <Header
        locale={locale}
        setLocale={setLocale}
        user={headerUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {/* Main Chat Thread Area */}
      <main className="w-full max-w-[640px] flex-1 flex flex-col justify-between overflow-hidden">
        <ChatMessageList
          messages={messages}
          currentJob={currentJob}
          locale={locale}
          onRetry={loadData}
          onInspectText={handleInspectText}
          onSubmitClarifyingAnswers={handleSubmitClarifyingAnswers}
          onManipulateDoc={handleManipulateDoc}
          onQuickPrompt={handleSendMessage}
          onExportToGoogleDocs={handleExportToGoogleDocs}
          googleDocLinks={googleDocLinks}
        />
        <div ref={messagesEndRef} />
      </main>

      {/* Unified Modern Chatbot Input Bar */}
      <ChatInputBar
        locale={locale}
        onSendPhotos={handleSendPhotos}
        onSendMessage={handleSendMessage}
        isProcessing={isProcessing}
        isEditing={isEditing}
        hasReadyDocument={!!latestReadyJob}
      />

      {/* Text Inspection Modal */}
      <TextPreviewModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        transcription={activeInspectJob?.transcription}
        docxUrl={activeInspectJob?.docxUrl}
        docxFilename={activeInspectJob?.docxFilename}
        locale={locale}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        jobs={jobs}
        locale={locale}
        onInspect={handleInspectText}
      />
    </div>
  );
}
