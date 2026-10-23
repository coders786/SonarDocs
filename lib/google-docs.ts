import { TranscriptionDocument } from "@/types/paper";

export interface GoogleDocResult {
  docId: string;
  docUrl: string;
  title: string;
}

/**
 * Creates a formatted examination paper directly in the user's Google Docs via Google Docs REST API v1
 */
export async function createGoogleDocPaper(
  accessToken: string,
  paper: TranscriptionDocument
): Promise<GoogleDocResult> {
  const meta = paper.metadata;
  const docTitle = `${meta.subject || "Exam"} - ${meta.gradeClass || "Paper"} (${meta.title || "Examination"})`;

  // Step 1: Create a new blank Google Doc with the specified title
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: docTitle,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error("Google Docs creation failed:", errorText);
    throw new Error(`Google Docs API error (${createRes.status}): ${errorText}`);
  }

  const createdDoc = await createRes.json();
  const documentId = createdDoc.documentId;

  // Step 2: Build formatted text payload
  let text = "";
  if (meta.instituteOrBoard) {
    text += `${meta.instituteOrBoard.toUpperCase()}\n`;
  }
  text += `${meta.title.toUpperCase()}\n`;
  text += `Subject: ${meta.subject}  |  Class/Grade: ${meta.gradeClass}\n`;
  text += `Time Allowed: ${meta.timeAllowed || "2.5 Hours"}  |  Total Marks: ${meta.totalMarks || "75"}\n`;
  if (meta.dateStr) {
    text += `Date: ${meta.dateStr}\n`;
  }
  text += "================================================================================\n\n";

  for (const section of paper.sections) {
    text += `### ${section.title.toUpperCase()}\n`;
    if (section.instructions) {
      text += `Note: ${section.instructions}\n`;
    }
    text += "--------------------------------------------------------------------------------\n";

    for (let i = 0; i < section.questions.length; i++) {
      const q = section.questions[i];
      const marksStr = q.marks ? `  [${q.marks} Marks]` : "";
      text += `${q.number || `Q${i + 1}`}. ${q.text}${marksStr}\n`;

      if (q.options && q.options.length > 0) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          const label = typeof opt === "string" ? opt : `(${opt.key || String.fromCharCode(65 + j)}) ${opt.text}`;
          text += `     ${label}\n`;
        }
      }
      text += "\n";
    }
    text += "\n";
  }

  text += "================================================================================\n";
  text += "                              *** END OF PAPER ***                              \n";

  // Step 3: Insert text into the newly created document
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: text,
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    console.warn("Google Docs batchUpdate warning:", errorText);
  }

  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  return {
    docId: documentId,
    docUrl,
    title: docTitle,
  };
}
