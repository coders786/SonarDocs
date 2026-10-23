import type { Metadata } from "next";
import { Inter, Lateef, Noto_Nastaliq_Urdu } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Sindhi (Arabic-script, Naskh-flavoured, covers extended Sindhi letters)
const lateef = Lateef({
  variable: "--font-sindhi",
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
});

// Urdu (Nastaliq)
const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sonar Docs — Research-Driven Handwriting OCR",
  description:
    "Upload handwritten notes in Sindhi, Urdu, English or Mathematics. A curated research dossier guides AI layout analysis, python-powered focus crops and line-by-line OCR — you verify, then the document AI writes the clean digital document.",
  keywords: ["handwriting OCR", "Sindhi OCR", "Urdu OCR", "handwritten math", "document AI", "HTR"],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${lateef.variable} ${nastaliq.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
