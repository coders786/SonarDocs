import { NextRequest, NextResponse } from "next/server";
import {
  createJob,
  checkAndIncrementRateLimit,
  updateJobStage,
  finalizeJobSuccess,
  finalizeJobError,
  getUserJobs,
  getUserChatMessages,
} from "@/lib/jobs-store";
import { transcribeExamPaper } from "@/lib/gemini";
import { AI_CONFIG } from "@/config/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = "default_teacher", photos, language } = body;

    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: "At least one exam photo is required." },
        { status: 400 }
      );
    }

    if (photos.length > AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB) {
      return NextResponse.json(
        { error: `Maximum ${AI_CONFIG.GUARDRAILS.MAX_PHOTOS_PER_JOB} photos allowed per job.` },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateCheck = checkAndIncrementRateLimit(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Daily limit reached (20 jobs/day). Please try again tomorrow." },
        { status: 429 }
      );
    }

    // Sniff and parse base64 image data
    const parsedPhotos: { data: string; mimeType: string }[] = [];
    for (const photo of photos) {
      if (typeof photo !== "string") continue;
      const match = photo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        parsedPhotos.push({
          mimeType: match[1],
          data: match[2],
        });
      } else {
        // Assume raw base64 or jpeg
        parsedPhotos.push({
          mimeType: "image/jpeg",
          data: photo,
        });
      }
    }

    if (parsedPhotos.length === 0) {
      return NextResponse.json(
        { error: "Invalid image format provided." },
        { status: 400 }
      );
    }

    // Create job record
    const job = createJob(userId, photos);

    // Asynchronously trigger pipeline with smart model & parameter selection
    (async () => {
      try {
        const transcription = await transcribeExamPaper(
          parsedPhotos,
          (stage, detail) => {
            updateJobStage(job.id, stage, detail || "");
          },
          language
        );

        await finalizeJobSuccess(job.id, transcription);
      } catch (err: any) {
        console.error(`Job ${job.id} pipeline execution failed:`, err);
        finalizeJobError(
          job.id,
          "Could not read paper. Please retry with clearer lighting or steady camera."
        );
      }
    })();

    return NextResponse.json({
      success: true,
      job,
      remainingJobsToday: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error("API /api/jobs error:", error);
    return NextResponse.json(
      { error: "Server encountered an error processing your request." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "default_teacher";

  const jobs = getUserJobs(userId);
  const messages = getUserChatMessages(userId);

  return NextResponse.json({
    jobs,
    messages,
  });
}
