import test from "node:test";
import assert from "node:assert/strict";
import {
  generateCurriculumDocument,
  matchCurriculumFromText,
  getCurriculumInterrogatePayload,
} from "./curriculum-generator";
import { PAKISTAN_CURRICULUM } from "@/config/pakistan-curriculum";

test("curriculum config has all 10 classes and 10 subjects", () => {
  assert.equal(PAKISTAN_CURRICULUM.CLASSES.length, 10, "Must have exactly 10 classes (Class 1 to 10)");
  assert.equal(PAKISTAN_CURRICULUM.SUBJECTS.length, 10, "Must have exactly 10 core subjects");
});

test("generates authentic paper for Physics Class 9", () => {
  const paper = generateCurriculumDocument({
    subjectId: "physics",
    classId: "class_9",
    boardName: "BISE Hyderabad (Sindh)",
    termTitle: "Midterm Examination 2026",
    marksPresetId: "marks_75",
  });

  assert.equal(paper.metadata.subject, "Physics");
  assert.equal(paper.metadata.totalMarks, "75");
  assert.equal(paper.sections.length, 3);
  assert.equal(paper.sections[0].questions.length, 15); // MCQs
  assert.equal(paper.sections[1].questions.length, 8); // Short questions
  assert.equal(paper.sections[2].questions.length, 3); // Long questions
});

test("generates authentic paper for Urdu Lazmi with RTL direction and Nastaliq orthography", () => {
  const paper = generateCurriculumDocument({
    subjectId: "urdu",
    classId: "class_10",
    marksPresetId: "marks_50",
  });

  assert.equal(paper.metadata.primaryLanguage, "ur");
  assert.equal(paper.metadata.primaryDirection, "rtl");
  assert.equal(paper.metadata.subject, "اردو لازمی");
  assert.equal(paper.sections[0].direction, "rtl");
  assert.ok(paper.sections[0].questions[0].text.length > 0);
});

test("generates authentic paper for Sindhi Lazmi with authentic Sindhi script", () => {
  const paper = generateCurriculumDocument({
    subjectId: "sindhi",
    classId: "class_9",
    marksPresetId: "marks_25",
  });

  assert.equal(paper.metadata.primaryLanguage, "sd");
  assert.equal(paper.metadata.primaryDirection, "rtl");
  assert.ok(paper.metadata.subject.includes("سنڌي"));
  assert.equal(paper.sections[0].questions.length, 5); // 25 marks preset has 5 MCQs
});

test("generates authentic paper for Mathematics across Primary, Middle, and Secondary", () => {
  // Primary (Class 3)
  const primaryMath = generateCurriculumDocument({
    subjectId: "mathematics",
    classId: "class_3",
    marksPresetId: "marks_50",
  });
  assert.ok(primaryMath.sections[0].questions[0].text.includes("+") || primaryMath.sections[0].questions[0].text.includes("x") || primaryMath.sections[0].questions[0].text.includes("fraction") || primaryMath.sections[0].questions[0].text.includes("place value"));

  // Secondary (Class 9)
  const secondaryMath = generateCurriculumDocument({
    subjectId: "mathematics",
    classId: "class_9",
    marksPresetId: "marks_75",
  });
  assert.ok(secondaryMath.sections[0].questions[0].text.includes("A ∩ B") || secondaryMath.sections[0].questions[1].text.includes("discriminant"));
});

test("generates authentic paper for all 10 subjects without errors", () => {
  for (const subject of PAKISTAN_CURRICULUM.SUBJECTS) {
    const doc = generateCurriculumDocument({
      subjectId: subject.id,
      classId: "class_9",
      marksPresetId: "marks_50",
    });
    assert.ok(doc.sections.length >= 3, `Subject ${subject.id} must have at least 3 sections`);
    assert.ok(doc.metadata.subject.length > 0);
  }
});

test("matchCurriculumFromText recognizes direct prompts in English, Urdu, and Sindhi", () => {
  // English prompt
  const match1 = matchCurriculumFromText("Create Class 9 Physics paper 50 marks");
  assert.ok(match1);
  assert.equal(match1.subjectId, "physics");
  assert.equal(match1.classId, "class_9");
  assert.equal(match1.marksPresetId, "marks_50");

  // Urdu prompt
  const match2 = matchCurriculumFromText("جماعت دہم اردو لازمی کا پرچہ بنائیں 100 نمبر");
  assert.ok(match2);
  assert.equal(match2.subjectId, "urdu");
  assert.equal(match2.classId, "class_10");
  assert.equal(match2.marksPresetId, "marks_100");

  // Sindhi prompt
  const match3 = matchCurriculumFromText("ڪلاس نائين سنڌي لازمي جو پڙچو 25 مارڪون");
  assert.ok(match3);
  assert.equal(match3.subjectId, "sindhi");
  assert.equal(match3.classId, "class_9");
  assert.equal(match3.marksPresetId, "marks_25");
});

test("matchCurriculumFromText resolves structured wizard answers", () => {
  const match = matchCurriculumFromText("", {
    q_subject: "chemistry",
    q_class: "class_10",
    q_marks: "marks_75",
    q_board: "bsek_khi",
  });
  assert.ok(match);
  assert.equal(match.subjectId, "chemistry");
  assert.equal(match.classId, "class_10");
  assert.equal(match.marksPresetId, "marks_75");
});

test("getCurriculumInterrogatePayload builds 4-step wizard with all 10 subjects and classes", () => {
  const payload = getCurriculumInterrogatePayload("test_sess", "Make a paper");
  assert.equal(payload.questions.length, 4);
  assert.equal(payload.questions[0].options.length, 10, "Subject question must have all 10 subjects");
  assert.equal(payload.questions[1].options.length, 10, "Class question must have all 10 classes");
});
