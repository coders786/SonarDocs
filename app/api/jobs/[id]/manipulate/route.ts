import { NextRequest, NextResponse } from "next/server";
import { getJob, setJobDocxBuffer, updateJobStage, addChatMessage } from "@/lib/jobs-store";
import { executeDocManipulation } from "@/lib/gemini";
import { generatePaperDocx } from "@/lib/docx-generator";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, payload = {}, userId = "default_teacher" } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required for document manipulation." },
        { status: 400 }
      );
    }

    const job = getJob(id);
    if (!job || !job.transcription) {
      return NextResponse.json(
        { error: "Valid paper document not found for this job." },
        { status: 404 }
      );
    }

    updateJobStage(id, "writing", "Manipulating Word document…");

    // Execute structured manipulation on document
    const updatedTranscription = await executeDocManipulation(
      job.transcription,
      action,
      payload
    );

    // Re-render DOCX buffer
    const updatedDocx = await generatePaperDocx(updatedTranscription);
    setJobDocxBuffer(id, updatedDocx);

    updateJobStage(id, "ready", "Your paper is ready!", {
      transcription: updatedTranscription,
      updatedAt: Date.now(),
    });

    addChatMessage(userId, {
      id: `msg_${Date.now()}_manipulate`,
      role: "assistant",
      type: "document",
      timestamp: Date.now(),
      jobId: id,
      documentUrl: `/api/jobs/${id}/download`,
      documentFilename: job.docxFilename || "Manipulated_Paper.docx",
      text: "Updated Word file is ready!",
    });

    return NextResponse.json({
      success: true,
      job: getJob(id),
    });
  } catch (error: any) {
    console.error("API /api/jobs/[id]/manipulate error:", error);
    return NextResponse.json(
      { error: "Failed to execute document manipulation." },
      { status: 500 }
    );
  }
}
