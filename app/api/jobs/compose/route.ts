import { NextRequest, NextResponse } from "next/server";
import { composeExamPaper } from "@/lib/gemini";
import {
  createJob,
  checkAndIncrementRateLimit,
  updateJobStage,
  finalizeJobSuccess,
  finalizeJobError,
  addChatMessage,
} from "@/lib/jobs-store";
import {
  matchCurriculumFromText,
  generateCurriculumDocument,
} from "@/lib/curriculum-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subject = "General Science",
      gradeClass = "Class 9",
      totalMarks = "75",
      language = "en",
      clarifyingAnswers = {},
      customPrompt = "",
      userId = "default_teacher",
    } = body;

    const rateCheck = checkAndIncrementRateLimit(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Daily limit reached (20 jobs/day)." },
        { status: 429 }
      );
    }

    // Check if prompt or options match pre-coded curriculum
    const matchedCurriculum = matchCurriculumFromText(`${subject} ${gradeClass} ${customPrompt}`, clarifyingAnswers);

    const job = createJob(userId, []);
    updateJobStage(job.id, "writing", "Formatting examination document…");

    addChatMessage(userId, {
      id: `msg_${Date.now()}_compose_req`,
      role: "user",
      type: "text",
      timestamp: Date.now(),
      jobId: job.id,
      text: `Compose ${subject} (${gradeClass})`,
    });

    if (matchedCurriculum) {
      // Fast-path: compile deterministically
      const doc = generateCurriculumDocument(matchedCurriculum);
      await finalizeJobSuccess(job.id, doc);

      return NextResponse.json({
        success: true,
        status: "ready",
        job,
      });
    }

    // Otherwise, call AI for custom topics
    (async () => {
      try {
        const doc = await composeExamPaper({
          subject,
          gradeClass,
          totalMarks,
          language,
          clarifyingAnswers,
          customPrompt,
        });

        await finalizeJobSuccess(job.id, doc);
      } catch (err: any) {
        console.error("Composition error:", err);
        finalizeJobError(job.id, "Could not compose paper. Please try again.");
      }
    })();

    return NextResponse.json({
      success: true,
      status: "composing",
      job,
    });
  } catch (error: any) {
    console.error("API /api/jobs/compose error:", error);
    return NextResponse.json(
      { error: "Failed to compose paper." },
      { status: 500 }
    );
  }
}
