import { SupportedLanguage, TextDirection, TranscriptionDocument } from "@/types/paper";

export interface CurriculumSubject {
  id: string;
  nameEn: string;
  nameUr: string;
  nameSd: string;
  language: SupportedLanguage;
  direction: TextDirection;
  classes: string[]; // which classes take this subject
}

export interface CurriculumClass {
  id: string;
  nameEn: string;
  nameUr: string;
  nameSd: string;
  level: "Primary" | "Middle" | "Secondary";
}

export interface ExamBoard {
  id: string;
  name: string;
  region: string;
}

export interface ExamTerm {
  id: string;
  titleEn: string;
  titleUr: string;
  titleSd: string;
}

export interface MarksPreset {
  id: string;
  marks: string;
  timeAllowed: string;
  mcqCount: number;
  shortCount: number;
  longCount: number;
}

export const PAKISTAN_CURRICULUM = {
  // All 10 Classes
  CLASSES: [
    { id: "class_1", nameEn: "Class 1", nameUr: "جماعت اول", nameSd: "ڪلاس پهريون", level: "Primary" },
    { id: "class_2", nameEn: "Class 2", nameUr: "جماعت دوم", nameSd: "ڪلاس ٻيون", level: "Primary" },
    { id: "class_3", nameEn: "Class 3", nameUr: "جماعت سوم", nameSd: "ڪلاس ٽيون", level: "Primary" },
    { id: "class_4", nameEn: "Class 4", nameUr: "جماعت چہارم", nameSd: "ڪلاس چوٿون", level: "Primary" },
    { id: "class_5", nameEn: "Class 5", nameUr: "جماعت پنجم", nameSd: "ڪلاس پنجون", level: "Primary" },
    { id: "class_6", nameEn: "Class 6", nameUr: "جماعت ششم", nameSd: "ڪلاس ڇهون", level: "Middle" },
    { id: "class_7", nameEn: "Class 7", nameUr: "جماعت ہفتم", nameSd: "ڪلاس ستون", level: "Middle" },
    { id: "class_8", nameEn: "Class 8", nameUr: "جماعت ہشتم", nameSd: "ڪلاس اٺون", level: "Middle" },
    { id: "class_9", nameEn: "Class 9 (SSC-I)", nameUr: "جماعت نہم", nameSd: "ڪلاس نائين", level: "Secondary" },
    { id: "class_10", nameEn: "Class 10 (SSC-II)", nameUr: "جماعت دہم", nameSd: "ڪلاس ڏهين", level: "Secondary" },
  ] as CurriculumClass[],

  // All 10 Core Subjects
  SUBJECTS: [
    {
      id: "physics",
      nameEn: "Physics",
      nameUr: "طبیعیات",
      nameSd: "فزڪس",
      language: "en",
      direction: "ltr",
      classes: ["class_9", "class_10"],
    },
    {
      id: "chemistry",
      nameEn: "Chemistry",
      nameUr: "کیمیا",
      nameSd: "ڪيمسٽري",
      language: "en",
      direction: "ltr",
      classes: ["class_9", "class_10"],
    },
    {
      id: "biology",
      nameEn: "Biology",
      nameUr: "حیاتیات",
      nameSd: "حياتيات",
      language: "en",
      direction: "ltr",
      classes: ["class_9", "class_10"],
    },
    {
      id: "mathematics",
      nameEn: "Mathematics",
      nameUr: "ریاضی",
      nameSd: "حساب / رياضي",
      language: "en",
      direction: "ltr",
      classes: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10"],
    },
    {
      id: "computer_science",
      nameEn: "Computer Science",
      nameUr: "کمپیوٹر سائنس",
      nameSd: "ڪمپيوٽر سائنس",
      language: "en",
      direction: "ltr",
      classes: ["class_6", "class_7", "class_8", "class_9", "class_10"],
    },
    {
      id: "english",
      nameEn: "English Compulsory",
      nameUr: "انگریزی لازمی",
      nameSd: "انگريزي لازمي",
      language: "en",
      direction: "ltr",
      classes: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10"],
    },
    {
      id: "urdu",
      nameEn: "Urdu Lazmi",
      nameUr: "اردو لازمی",
      nameSd: "اردو لازمي",
      language: "ur",
      direction: "rtl",
      classes: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10"],
    },
    {
      id: "sindhi",
      nameEn: "Sindhi Lazmi",
      nameUr: "سندھی لازمی",
      nameSd: "سنڌي لازمي (سلسلو)",
      language: "sd",
      direction: "rtl",
      classes: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10"],
    },
    {
      id: "pakistan_studies",
      nameEn: "Pakistan Studies",
      nameUr: "مطالعہ پاکستان",
      nameSd: "مطالعو پاڪستان",
      language: "ur",
      direction: "rtl",
      classes: ["class_9", "class_10"],
    },
    {
      id: "islamiat",
      nameEn: "Islamiat Compulsory",
      nameUr: "اسلامیات لازمی",
      nameSd: "اسلاميات لازمي",
      language: "ur",
      direction: "rtl",
      classes: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10"],
    },
  ] as CurriculumSubject[],

  // Examination Boards
  BOARDS: [
    { id: "bise_hyd", name: "BISE Hyderabad (Sindh)", region: "Sindh" },
    { id: "bsek_khi", name: "BSEK Karachi (Sindh)", region: "Sindh" },
    { id: "bise_suk", name: "BISE Sukkur (Sindh)", region: "Sindh" },
    { id: "bise_lrk", name: "BISE Larkana (Sindh)", region: "Sindh" },
    { id: "bise_mpk", name: "BISE Mirpurkhas (Sindh)", region: "Sindh" },
    { id: "fbise_isb", name: "Federal Board FBISE Islamabad", region: "Federal" },
    { id: "bise_lhr", name: "BISE Lahore (Punjab)", region: "Punjab" },
    { id: "bise_rwp", name: "BISE Rawalpindi (Punjab)", region: "Punjab" },
    { id: "school_internal", name: "School Terminal Examination", region: "Internal" },
    { id: "coaching_mock", name: "Coaching Center Mock Test", region: "Private" },
  ] as ExamBoard[],

  // Examination Terms
  TERMS: [
    { id: "annual", titleEn: "Annual Examination 2026", titleUr: "سالانہ امتحان 2026", titleSd: "سالانو امتحان 2026" },
    { id: "midterm", titleEn: "Midterm Examination 2026", titleUr: "ششمائی / مڈٹرم امتحان 2026", titleSd: "مڊٽرم امتحان 2026" },
    { id: "sendup", titleEn: "Send-Up Examination 2026", titleUr: "سینڈ اپ امتحان 2026", titleSd: "سينڊ اپ امتحان 2026" },
    { id: "term1", titleEn: "First Term Assessment", titleUr: "پہلی سہ ماہی جائزہ", titleSd: "پهريون ٽرم امتحاني پڙچو" },
    { id: "monthly", titleEn: "Monthly Unit Test", titleUr: "ماہانہ یونٹ ٹیسٹ", titleSd: "مهينيوار ٽيسٽ" },
    { id: "model", titleEn: "Model Question Paper", titleUr: "ماڈل پیپر", titleSd: "ماڊل پڙچو" },
  ] as ExamTerm[],

  // Standard Marks and Durations Presets
  MARKS_PRESETS: [
    { id: "marks_75", marks: "75", timeAllowed: "2.5 Hours", mcqCount: 15, shortCount: 8, longCount: 3 },
    { id: "marks_50", marks: "50", timeAllowed: "1.5 Hours", mcqCount: 10, shortCount: 6, longCount: 2 },
    { id: "marks_100", marks: "100", timeAllowed: "3 Hours", mcqCount: 20, shortCount: 10, longCount: 4 },
    { id: "marks_25", marks: "25", timeAllowed: "45 Minutes", mcqCount: 5, shortCount: 4, longCount: 1 },
  ] as MarksPreset[],
};
