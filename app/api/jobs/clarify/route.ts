import { NextRequest, NextResponse } from "next/server";
import { generateClarifyingQuestions } from "@/lib/gemini";
import { addChatMessage } from "@/lib/jobs-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contextDescription = "Standard high school examination paper",
      language = "en",
      userId = "default_teacher",
      jobId,
    } = body;

    const questionsPayload = await generateClarifyingQuestions(
      contextDescription,
      language
    );

    // Save clarifying questions message in chat thread
    addChatMessage(userId, {
      id: `msg_${Date.now()}_clarify`,
      role: "assistant",
      type: "clarifying_questions",
      timestamp: Date.now(),
      jobId,
      questionsPayload: {
        rationale: questionsPayload.rationale,
        questions: questionsPayload.questions.map((q) => ({
          ...q,
          allowsCustomAnswer: true,
        })),
      },
    });

    return NextResponse.json({
      success: true,
      questionsPayload,
    });
  } catch (error: any) {
    console.error("API /api/jobs/clarify error:", error);
    return NextResponse.json(
      { error: "Could not generate clarifying questions." },
      { status: 500 }
    );
  }
}
