"use client";

import { useMemo } from "react";
import katex from "katex";

export function Katex({ latex, display = true }: { latex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex || "", {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch {
      return `<span style="color:#b91c1c">${latex}</span>`;
    }
  }, [latex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
