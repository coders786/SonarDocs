import { NextRequest, NextResponse } from "next/server";
import { getJob, setJobDocxBuffer, updateJobStage, addChatMessage } from "@/lib/jobs-store";
import { processEditWithInterrogation } from "@/lib/gemini";
import { generatePaperDocx } from "@/lib/docx-generator";
import { buildInterrogateXml } from "@/lib/interrogate-parser";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { instruction, answers, userId = "default_teacher" } = body;

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json(
        { error: "Edit instruction is required." },
        { status: 400 }
      );
    }

    const job = getJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (!job.transcription) {
      return NextResponse.json(
        { error: "Cannot edit a paper whose initial transcription is not ready." },
        { status: 400 }
      );
    }

    // If teacher provided answers to prior bot interrogation, log an acknowledgement
    if (answers && Object.keys(answers).length > 0) {
      const summaryPill = Object.entries(answers)
        .map(([_, v]) => v)
        .join(" | ");

      addChatMessage(userId, {
        id: `msg_${Date.now()}_user_choice`,
        role: "user",
        type: "text",
        timestamp: Date.now(),
        jobId: id,
        text: `Preferences selected: ${summaryPill}`,
      });
    } else {
      // First time submitting this edit instruction
      addChatMessage(userId, {
        id: `msg_${Date.now()}_user_edit`,
        role: "user",
        type: "text",
        timestamp: Date.now(),
        jobId: id,
        text: instruction,
      });
    }

    // Process edit using dynamic AI interrogation function calling
    const result = await processEditWithInterrogation(
      job.transcription,
      instruction,
      answers,
      job.transcription.metadata.primaryLanguage || "en"
    );

    // If AI decided to interrogate intent with dynamic MCQs
    if (result.type === "interrogate" && result.questions && result.questions.length > 0) {
      const sessionId = `edit_session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const rawXml = buildInterrogateXml(sessionId, result.questions);

      const questionsPayload = {
        sessionId,
        rationale: result.rationale || "Select your preferences to customize this edit:",
        questions: result.questions,
        originalInstruction: instruction,
        rawXml,
      };

      addChatMessage(userId, {
        id: `msg_${Date.now()}_interrogate`,
        role: "assistant",
        type: "clarifying_questions",
        timestamp: Date.now(),
        jobId: id,
        questionsPayload,
        rawXml,
      });

      return NextResponse.json({
        status: "interrogate",
        questionsPayload,
        rawXml,
      });
    }

    // If AI applied the edit (or finished after answers)
    if (result.type === "edit_completed" && result.updatedDocument) {
      updateJobStage(id, "writing", "Updating your document…");

      const updatedTranscription = result.updatedDocument;
      const updatedDocxBuffer = await generatePaperDocx(updatedTranscription);
      setJobDocxBuffer(id, updatedDocxBuffer);

      updateJobStage(id, "ready", "Your updated paper is ready!", {
        transcription: updatedTranscription,
        updatedAt: Date.now(),
      });

      addChatMessage(userId, {
        id: `msg_${Date.now()}_updated_doc`,
        role: "assistant",
        type: "document",
        timestamp: Date.now(),
        jobId: id,
        documentUrl: `/api/jobs/${id}/download`,
        documentFilename: job.docxFilename || "Updated_Paper.docx",
        text: result.summary || "Updated Word file is ready!",
      });

      return NextResponse.json({
        success: true,
        status: "completed",
        job: getJob(id),
      });
    }

    return NextResponse.json({ error: "Could not apply edit." }, { status: 500 });
  } catch (error: any) {
    console.error("API /api/jobs/[id]/edit error:", error);
    return NextResponse.json(
      { error: "Could not apply edit. Please try again." },
      { status: 500 }
    );
  }
}
