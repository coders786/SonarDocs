import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-arabic",
});

export const metadata: Metadata = {
  title: "SonarDocs - Exam Paper to Word Converter",
  description:
    "Intelligent exam paper digitization for teachers. Convert printed and cursive handwritten exam photos (English, Urdu, Sindhi) into editable Word DOCX documents.",
  openGraph: {
    title: "SonarDocs - Exam Paper to Word Converter",
    description:
      "Intelligent exam paper digitization for teachers. Convert printed and cursive handwritten exam photos (English, Urdu, Sindhi) into editable Word DOCX documents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SonarDocs - Exam Paper to Word Converter",
    description:
      "Intelligent exam paper digitization for teachers. Convert printed and cursive handwritten exam photos (English, Urdu, Sindhi) into editable Word DOCX documents.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSansArabic.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
