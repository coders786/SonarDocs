// Localization dictionary for SonarDocs (English, Urdu, Sindhi)
// Zero emojis - clean, concise, 3-word maximum for button labels

export type Locale = "en" | "ur" | "sd";

export interface TranslationStrings {
  appName: string;
  tagline: string;
  signInWithGoogle: string;
  signedInAs: string;
  signOut: string;
  snapPaper: string;
  gallery: string;
  sendPhotos: string;
  cancel: string;
  readingPhoto: string;
  lookingCloser: string;
  writingFile: string;
  paperReady: string;
  downloadDocx: string;
  retry: string;
  inspectPreview: string;
  editPlaceholder: string;
  historyTitle: string;
  noPastPapers: string;
  genericError: string;
  maxPhotosNotice: string;
  cameraAccessDenied: string;
  quickEditMarks: string;
  quickEditTitle: string;
  quickEditNumbers: string;
  languageSelect: string;
  composePaper: string;
  direction: "ltr" | "rtl";
}

export const TRANSLATIONS: Record<Locale, TranslationStrings> = {
  en: {
    appName: "SonarDocs",
    tagline: "Instant Exam Digitization",
    signInWithGoogle: "Sign In Google",
    signedInAs: "Teacher Account",
    signOut: "Sign Out",
    snapPaper: "Take Photo",
    gallery: "From Gallery",
    sendPhotos: "Process Paper",
    cancel: "Cancel",
    readingPhoto: "Reading your photo…",
    lookingCloser: "Looking closer…",
    writingFile: "Writing your file…",
    paperReady: "Your paper is ready!",
    downloadDocx: "Download Word File",
    retry: "Try Again",
    inspectPreview: "View Text",
    editPlaceholder: "Ask edit: e.g. Q3 marks 10",
    historyTitle: "Past Papers",
    noPastPapers: "No papers yet",
    genericError: "Could not read paper. Please retry with clearer lighting.",
    maxPhotosNotice: "Up to 8 photos",
    cameraAccessDenied: "Please allow camera access.",
    quickEditMarks: "Set Q3 marks to 10",
    quickEditTitle: "Fix section title",
    quickEditNumbers: "Fix question numbering",
    languageSelect: "Language",
    composePaper: "Compose New Paper",
    direction: "ltr",
  },
  ur: {
    appName: "سونار ڈاکس",
    tagline: "پرچہ ورڈ کنورٹر",
    signInWithGoogle: "گوگل سائن ان",
    signedInAs: "استاد اکاؤنٹ",
    signOut: "لاگ آؤٹ",
    snapPaper: "تصویر لیں",
    gallery: "گیلری سے منتخب",
    sendPhotos: "پرچہ بھیجیں",
    cancel: "منسوخ",
    readingPhoto: "تصویر پڑھی جا رہی ہے…",
    lookingCloser: "باریک بینی معائنہ…",
    writingFile: "ورڈ فائل تیار…",
    paperReady: "پرچہ تیار ہے!",
    downloadDocx: "ورڈ فائل ڈاؤنلوڈ",
    retry: "دوبارہ کوشش کریں",
    inspectPreview: "تحریر دیکھیں",
    editPlaceholder: "ترمیم: جیسے سوال ۳ کے نمبر ۱۰ کریں",
    historyTitle: "سابقہ پرچے",
    noPastPapers: "کوئی پرچہ نہیں",
    genericError: "پرچہ نہیں پڑھا جا سکا۔ براہ کرم صاف روشنی میں دوبارہ تصویر لیں۔",
    maxPhotosNotice: "زیادہ سے زیادہ ۸ تصاویر",
    cameraAccessDenied: "براہ کرم کیمرے کی اجازت دیں۔",
    quickEditMarks: "سوال ۳ کے ۱۰ نمبر کریں",
    quickEditTitle: "سیکشن کا عنوان درست کریں",
    quickEditNumbers: "سوالات کی نمبرنگ درست کریں",
    languageSelect: "زبان",
    composePaper: "نیا پرچہ بنائیں",
    direction: "rtl",
  },
  sd: {
    appName: "سونار ڊاڪس",
    tagline: "امتحاني پڙچو ڪنورٽر",
    signInWithGoogle: "گوگل سائن ان",
    signedInAs: "استاد اڪائونٽ",
    signOut: "لاگ آئوٽ",
    snapPaper: "فوٽو ڪڍو",
    gallery: "گيلري مان کڻو",
    sendPhotos: "پڙچو موڪليو",
    cancel: "رد ڪريو",
    readingPhoto: "تصوير پڙهي پئي وڃي…",
    lookingCloser: "غور سان معائنو…",
    writingFile: "ورڊ فائل لکي پئي…",
    paperReady: "پڙچو تيار آهي!",
    downloadDocx: "ورڊ فائل ڊائونلوڊ",
    retry: "ٻيهر ڪوشش ڪريو",
    inspectPreview: "لکت ڏسو",
    editPlaceholder: "ترميم: سوال ۳ جا نمبر ۱۰ ڪريو",
    historyTitle: "اڳوڻا پڙچا",
    noPastPapers: "ڪو به پڙچو ناهي",
    genericError: "پڙچو پڙهي نه سگهيو. مهرباني ڪري صاف روشني ۾ تصوير ڪڍو.",
    maxPhotosNotice: "وڌ ۾ وڌ ۸ تصويرون",
    cameraAccessDenied: "مهرباني ڪري ڪيمرا جي اجازت ڏيو.",
    quickEditMarks: "سوال ۳ جا ۱۰ نمبر ڪريو",
    quickEditTitle: "سيڪشن جو عنوان درست ڪريو",
    quickEditNumbers: "سوالن جي نمبرنگ درست ڪريو",
    languageSelect: "ٻولي",
    composePaper: "نئون پڙچو ٺاهيو",
    direction: "rtl",
  },
};
