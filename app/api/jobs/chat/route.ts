import { NextRequest, NextResponse } from "next/server";
import { interrogateNewExamIntent, composeExamPaper } from "@/lib/gemini";
import {
  createJob,
  checkAndIncrementRateLimit,
  updateJobStage,
  finalizeJobSuccess,
  finalizeJobError,
  addChatMessage,
} from "@/lib/jobs-store";
import { buildInterrogateXml } from "@/lib/interrogate-parser";
import {
  matchCurriculumFromText,
  generateCurriculumDocument,
  getCurriculumInterrogatePayload,
} from "@/lib/curriculum-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      answers,
      originalPrompt,
      language = "en",
      userId = "default_teacher",
    } = body;

    const activePrompt = originalPrompt || prompt;
    if (!activePrompt && (!answers || Object.keys(answers).length === 0)) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // Branch A: User answered the bot's dynamic or curriculum MCQs -> Compose the paper!
    if (answers && Object.keys(answers).length > 0) {
      const rateCheck = checkAndIncrementRateLimit(userId);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: "Daily limit reached (20 jobs/day)." },
          { status: 429 }
        );
      }

      // Log teacher's choices
      const summaryPills = Object.values(answers).join(" | ");
      addChatMessage(userId, {
        id: `msg_${Date.now()}_user_choice`,
        role: "user",
        type: "text",
        timestamp: Date.now(),
        text: `Selected: ${summaryPills}`,
      });

      // Check if answers match pre-coded Pakistani curriculum
      const matchedCurriculum = matchCurriculumFromText(activePrompt || "", answers);

      if (matchedCurriculum) {
        // Fast-path: compile deterministically without LLM API call
        const job = createJob(userId, []);
        updateJobStage(job.id, "writing", "Formatting Pakistani curriculum examination document…");

        const doc = generateCurriculumDocument(matchedCurriculum);
        await finalizeJobSuccess(job.id, doc);

        return NextResponse.json({
          success: true,
          status: "ready",
          job,
        });
      }

      // Fallback: AI composition for custom or non-standard prompts
      const job = createJob(userId, []);
      updateJobStage(job.id, "writing", "Composing customized examination document…");

      (async () => {
        try {
          const doc = await composeExamPaper({
            subject: activePrompt || "General Science",
            gradeClass: answers.q_grade || answers.q_class || "Class 9",
            totalMarks: answers.q_marks || "75",
            language,
            clarifyingAnswers: answers,
            customPrompt: activePrompt || "",
          });

          await finalizeJobSuccess(job.id, doc);
        } catch (err: any) {
          console.error("Composition error from chat interrogation:", err);
          finalizeJobError(job.id, "Could not compose paper. Please try again.");
        }
      })();

      return NextResponse.json({
        success: true,
        status: "composing",
        job,
      });
    }

    // Branch B: New prompt from teacher
    addChatMessage(userId, {
      id: `msg_${Date.now()}_user`,
      role: "user",
      type: "text",
      timestamp: Date.now(),
      text: prompt,
    });

    // Check if the prompt already has enough curriculum detail (e.g. "Create Class 9 Physics paper 50 marks")
    const quickMatch = matchCurriculumFromText(prompt);
    const hasExplicitSubjectAndClass =
      quickMatch &&
      (prompt.toLowerCase().includes("class") ||
        prompt.toLowerCase().includes("grade") ||
        prompt.includes("جماعت") ||
        prompt.includes("ڪلاس")) &&
      (prompt.toLowerCase().includes("physics") ||
        prompt.toLowerCase().includes("chemistry") ||
        prompt.toLowerCase().includes("biology") ||
        prompt.toLowerCase().includes("math") ||
        prompt.toLowerCase().includes("computer") ||
        prompt.toLowerCase().includes("urdu") ||
        prompt.toLowerCase().includes("sindhi") ||
        prompt.toLowerCase().includes("english") ||
        prompt.toLowerCase().includes("pakistan") ||
        prompt.toLowerCase().includes("islam"));

    if (hasExplicitSubjectAndClass) {
      // Direct generation without redundant questioning
      const job = createJob(userId, []);
      updateJobStage(job.id, "writing", "Compiling standardized curriculum examination document…");

      const doc = generateCurriculumDocument(quickMatch);
      await finalizeJobSuccess(job.id, doc);

      return NextResponse.json({
        success: true,
        status: "ready",
        job,
      });
    }

    // Branch C: Interrogate with pre-coded extensive options
    // If user's prompt is a general request to make/compose a paper, provide the pre-coded curriculum wizard
    const isGeneralPaperRequest =
      prompt.toLowerCase().includes("paper") ||
      prompt.toLowerCase().includes("exam") ||
      prompt.toLowerCase().includes("test") ||
      prompt.toLowerCase().includes("create") ||
      prompt.toLowerCase().includes("make") ||
      prompt.toLowerCase().includes("compose") ||
      prompt.includes("پرچہ") ||
      prompt.includes("امتحان") ||
      prompt.includes("پڙچو");

    if (isGeneralPaperRequest) {
      const sessionId = `curriculum_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payload = getCurriculumInterrogatePayload(sessionId, prompt);
      const rawXml = buildInterrogateXml(
        sessionId,
        payload.questions.map((q) => ({
          id: q.id,
          question: q.text,
          options: q.options.map((o) => o.label),
        }))
      );

      const questionsPayload = {
        sessionId,
        rationale: "Select from the pre-coded Pakistani curriculum to compile your standardized exam paper instantly.",
        questions: payload.questions.map((q) => ({
          id: q.id,
          question: q.text,
          options: q.options.map((o) => o.label),
        })),
        originalInstruction: prompt,
        rawXml,
      };

      addChatMessage(userId, {
        id: `msg_${Date.now()}_assistant_mcq`,
        role: "assistant",
        type: "clarifying_questions",
        timestamp: Date.now(),
        questionsPayload,
        rawXml,
      });

      return NextResponse.json({
        status: "interrogate",
        questionsPayload,
        rawXml,
      });
    }

    // Branch D: Fallback to Gemini AI interrogation for custom or open-ended inquiries
    const interrogation = await interrogateNewExamIntent(prompt, language);
    const sessionId = `chat_session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawXml = buildInterrogateXml(sessionId, interrogation.questions);

    const questionsPayload = {
      sessionId,
      rationale: interrogation.rationale,
      questions: interrogation.questions,
      originalInstruction: prompt,
      rawXml,
    };

    addChatMessage(userId, {
      id: `msg_${Date.now()}_assistant_mcq`,
      role: "assistant",
      type: "clarifying_questions",
      timestamp: Date.now(),
      questionsPayload,
      rawXml,
    });

    return NextResponse.json({
      status: "interrogate",
      questionsPayload,
      rawXml,
    });
  } catch (error: any) {
    console.error("API /api/jobs/chat error:", error);
    return NextResponse.json(
      { error: "Chat service error. Please try again." },
      { status: 500 }
    );
  }
}
