import { NextRequest } from "next/server";
import { getJob, subscribeToJob } from "@/lib/jobs-store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const initialJob = getJob(id);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state immediately
      if (initialJob) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialJob)}\n\n`)
        );
      }

      // If already finished, close
      if (initialJob?.stage === "ready" || initialJob?.stage === "error") {
        controller.close();
        return;
      }

      // Subscribe to subsequent job updates
      const unsubscribe = subscribeToJob(id, (updatedJob) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(updatedJob)}\n\n`)
          );
          if (updatedJob.stage === "ready" || updatedJob.stage === "error") {
            unsubscribe();
            controller.close();
          }
        } catch {
          unsubscribe();
        }
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
