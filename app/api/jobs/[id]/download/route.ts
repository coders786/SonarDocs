import { NextRequest, NextResponse } from "next/server";
import { getJob, getJobDocxBuffer } from "@/lib/jobs-store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const job = getJob(id);

  if (!job) {
    return new NextResponse("Job not found", { status: 404 });
  }

  const docxBuffer = getJobDocxBuffer(id);
  if (!docxBuffer) {
    return new NextResponse("Document file is not ready yet", { status: 404 });
  }

  const filename = job.docxFilename || "Exam_Paper.docx";
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(docxBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      "Content-Length": docxBuffer.length.toString(),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
