import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
} from "docx";
import { TranscriptionDocument, SectionBlock, QuestionItem } from "@/types/paper";

const FONT_ARABIC = "Noto Nastaliq Urdu, Noto Naskh Arabic, Traditional Arabic, Arial";
const FONT_LATIN = "Arial, Calibri, sans-serif";

export async function generatePaperDocx(doc: TranscriptionDocument): Promise<Buffer> {
  const isPrimaryRTL = doc.metadata.primaryDirection === "rtl";
  const primaryFont = isPrimaryRTL ? FONT_ARABIC : FONT_LATIN;
  const sectionsChildren: (Paragraph | Table)[] = [];

  // 1. Examination Document Header Block
  if (doc.metadata.instituteOrBoard) {
    sectionsChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: isPrimaryRTL,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: doc.metadata.instituteOrBoard,
            bold: true,
            size: 32, // 16pt
            font: primaryFont,
            rightToLeft: isPrimaryRTL,
          }),
        ],
      })
    );
  }

  // Paper Title
  sectionsChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: isPrimaryRTL,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: doc.metadata.title || "EXAMINATION PAPER",
          bold: true,
          size: 28, // 14pt
          font: primaryFont,
          rightToLeft: isPrimaryRTL,
        }),
      ],
    })
  );

  // Metadata Row: Subject, Class, Time, Marks
  const metaRuns: TextRun[] = [];
  if (doc.metadata.subject) {
    metaRuns.push(
      new TextRun({
        text: isPrimaryRTL ? `مضمون: ${doc.metadata.subject}    ` : `Subject: ${doc.metadata.subject}    `,
        bold: true,
        size: 22,
        font: primaryFont,
        rightToLeft: isPrimaryRTL,
      })
    );
  }
  if (doc.metadata.gradeClass) {
    metaRuns.push(
      new TextRun({
        text: isPrimaryRTL ? `جماعت: ${doc.metadata.gradeClass}    ` : `Class: ${doc.metadata.gradeClass}    `,
        bold: true,
        size: 22,
        font: primaryFont,
        rightToLeft: isPrimaryRTL,
      })
    );
  }
  if (doc.metadata.timeAllowed) {
    metaRuns.push(
      new TextRun({
        text: isPrimaryRTL ? `وقت: ${doc.metadata.timeAllowed}    ` : `Time: ${doc.metadata.timeAllowed}    `,
        size: 22,
        font: primaryFont,
        rightToLeft: isPrimaryRTL,
      })
    );
  }
  if (doc.metadata.totalMarks) {
    metaRuns.push(
      new TextRun({
        text: isPrimaryRTL ? `کل نمبر: ${doc.metadata.totalMarks}` : `Total Marks: ${doc.metadata.totalMarks}`,
        bold: true,
        size: 22,
        font: primaryFont,
        rightToLeft: isPrimaryRTL,
      })
    );
  }

  if (metaRuns.length > 0) {
    sectionsChildren.push(
      new Paragraph({
        alignment: isPrimaryRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isPrimaryRTL,
        spacing: { after: 240 },
        children: metaRuns,
      })
    );
  }

  // Divider line
  sectionsChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "_________________________________________________________________________________",
          color: "8B6FD1",
          size: 16,
        }),
      ],
    })
  );

  // 2. Examination Sections and Questions
  for (const section of doc.sections) {
    const isSectionRTL = section.direction === "rtl";
    const sectionFont = isSectionRTL ? FONT_ARABIC : FONT_LATIN;

    // Section Title
    sectionsChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: isSectionRTL,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            size: 24, // 12pt
            font: sectionFont,
            rightToLeft: isSectionRTL,
          }),
        ],
      })
    );

    // Section Instructions
    if (section.instructions) {
      sectionsChildren.push(
        new Paragraph({
          alignment: isSectionRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isSectionRTL,
          spacing: { after: 180 },
          children: [
            new TextRun({
              text: section.instructions,
              italics: true,
              size: 20,
              font: sectionFont,
              rightToLeft: isSectionRTL,
            }),
          ],
        })
      );
    }

    // Questions in Section
    for (const q of section.questions) {
      renderQuestion(q, sectionsChildren);
    }
  }

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: sectionsChildren,
      },
    ],
  });

  return await Packer.toBuffer(wordDoc);
}

function renderQuestion(q: QuestionItem, list: (Paragraph | Table)[], depth = 0) {
  const isRTL = q.direction === "rtl";
  const font = isRTL ? FONT_ARABIC : FONT_LATIN;

  const runs: TextRun[] = [];

  // Question numbering
  if (q.number) {
    runs.push(
      new TextRun({
        text: `${q.number} `,
        bold: true,
        size: 22,
        font: font,
        rightToLeft: isRTL,
      })
    );
  }

  // Question text
  runs.push(
    new TextRun({
      text: q.text,
      size: 22,
      font: font,
      rightToLeft: isRTL,
    })
  );

  // Marks notation
  if (q.marks) {
    const marksText = isRTL ? ` (${q.marks} نمبر)` : ` (${q.marks} Marks)`;
    runs.push(
      new TextRun({
        text: marksText,
        bold: true,
        size: 20,
        font: font,
        rightToLeft: isRTL,
      })
    );
  }

  list.push(
    new Paragraph({
      alignment: isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isRTL,
      indent: { left: depth * 360, right: isRTL ? depth * 360 : 0 },
      spacing: { before: 100, after: 100 },
      children: runs,
    })
  );

  // Options (e.g. for MCQs)
  if (q.options && q.options.length > 0) {
    const optionRuns: TextRun[] = [];
    q.options.forEach((opt, idx) => {
      optionRuns.push(
        new TextRun({
          text: `   (${idx + 1}) ${opt}      `,
          size: 20,
          font: font,
          rightToLeft: isRTL,
        })
      );
    });

    list.push(
      new Paragraph({
        alignment: isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isRTL,
        indent: { left: (depth + 1) * 360, right: isRTL ? (depth + 1) * 360 : 0 },
        spacing: { after: 140 },
        children: optionRuns,
      })
    );
  }

  // Sub-questions
  if (q.subQuestions && q.subQuestions.length > 0) {
    for (const sub of q.subQuestions) {
      renderQuestion(sub, list, depth + 1);
    }
  }
}
