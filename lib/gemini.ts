import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AI_CONFIG } from "@/config/ai";
import { TranscriptionDocument, SupportedLanguage } from "@/types/paper";
import fs from "fs";
import path from "path";

// Initialize Gemini client strictly on server-side
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Live prompt cache registry mapping model & language key to Gemini API CachedContent resource name
const geminiCachedContents = new Map<string, { resourceName: string; expiresAt: number }>();

/**
 * Creates and retrieves Gemini API CachedContent resources using ai.caches.create
 * Returns the resource name (e.g. 'cachedContents/xyz') for config.cachedContent parameter
 */
export async function getOrCreateGeminiPromptCache(
  ai: GoogleGenAI,
  model: string,
  systemContent: string,
  langKey: string
): Promise<{ cachedContentName?: string; isCacheHit: boolean }> {
  const cacheKey = `${model}_${langKey}_${AI_CONFIG.CACHE_VERSION}`;
  const now = Date.now();
  const existing = geminiCachedContents.get(cacheKey);

  if (existing && existing.expiresAt > now + 60000) {
    console.log(`[SonarDocs Prompt Cache] CACHE HIT: Reusing cachedContent="${existing.resourceName}" for ${cacheKey}`);
    return { cachedContentName: existing.resourceName, isCacheHit: true };
  }

  try {
    console.log(`[SonarDocs Prompt Cache] Calling ai.caches.create for ${cacheKey}...`);
    const createdCache = await ai.caches.create({
      model,
      config: {
        displayName: `sonardocs_${langKey}_${Date.now()}`,
        ttl: `${AI_CONFIG.CACHE_TTL_SECONDS}s`,
        systemInstruction: systemContent,
      },
    });

    if (createdCache?.name) {
      const expiresAt = now + (AI_CONFIG.CACHE_TTL_SECONDS * 1000);
      geminiCachedContents.set(cacheKey, {
        resourceName: createdCache.name,
        expiresAt,
      });
      console.log(`[SonarDocs Prompt Cache] REGISTERED: Active cachedContent="${createdCache.name}" with Gemini API`);
      return { cachedContentName: createdCache.name, isCacheHit: false };
    }
  } catch (err: any) {
    console.warn(`[SonarDocs Prompt Cache] Explicit prompt cache registration unavailable (${err?.message || err}). Falling back to inline systemInstruction.`);
  }

  return { cachedContentName: undefined, isCacheHit: false };
}

// Dynamically auto-select research article based on language so AI doesn't waste navigation tokens
export function getAutoChosenArticle(language?: string): { content: string; filename: string } {
  const langKey = (language || "mixed").toLowerCase() as keyof typeof AI_CONFIG.PARAMETER_PROFILES;
  const profile = AI_CONFIG.PARAMETER_PROFILES[langKey] || AI_CONFIG.PARAMETER_PROFILES.mixed;
  const filename = profile.researchFile;

  try {
    const researchPath = path.join(process.cwd(), "research", filename);
    if (fs.existsSync(researchPath)) {
      const content = fs.readFileSync(researchPath, "utf-8");
      console.log(`[SonarDocs Router] Auto-selected specialized article: ${filename} for language "${language || 'auto'}"`);
      return { content, filename };
    }
  } catch (e) {
    console.error("Error reading specialized research pack:", e);
  }

  return {
    content: "Standard Exam Transcription Guide: Transcribe questions, numbers, and marks accurately.",
    filename: "default",
  };
}

export const FORENSIC_SYSTEM_INSTRUCTION = `You are a forensic exam-document transcription specialist expert in Pakistani examination papers.
Your task is to transcribe examination materials (printed and cursive handwriting) in English, Urdu, and Sindhi.

Key Orthographic & Paleographic Rules:
1. Sindhi Extended Characters (52 letters): Pay meticulous attention to dot counts and position:
   - ٽ (ṭe with 4 dots) vs ٿ (the) vs ٺ (ṭhe).
   - ٻ (implosive b with two dots below) vs ب (single dot below).
   - ڄ (implosive j with 4 dots inside) vs ج (single dot) vs ڃ (ñim).
   - ڳ (ɠe with two bars) vs گ (gaaf).
   - ڱ (velar nasal gaaf) vs ن (nun).
   - ڏ (implosive dal) vs د (dal) vs ڊ (daal).
   - ڻ (retroflex nasal nun).
2. Urdu Nastaliq Cursive: Recognize sloping ligatures, seen/sheen strokes without teeth, nun-ghunna (ں), choti yeh (ی) vs badi yeh (ے).
3. Section Hierarchies: Section A / حصو الف / حصہ اول (MCQs), Section B / حصو ب / حصہ دوم (Short Questions), Section C / حصو ج / حصہ سوم (Long Questions).
4. Question Items: Extract Question number (e.g. "Q1", "سوال نمبر ۱"), exact text, allocated marks (e.g. "5", "10"), detected language ("en", "ur", "sd"), and direction ("ltr" or "rtl").
5. Output format: You MUST output valid, structured JSON matching the TranscriptionDocument schema. Do NOT include markdown code fences or conversational text.`;

// Transcription JSON Schema definition for Gemini responseSchema
export const TRANSCRIPTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    version: { type: Type.STRING },
    metadata: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title of exam, e.g. Annual Examination 2026" },
        subject: { type: Type.STRING, description: "Exam subject, e.g. General Science, سنڌي لازمی, اردو" },
        gradeClass: { type: Type.STRING, description: "Class or Grade, e.g. Class 9, دہم" },
        totalMarks: { type: Type.STRING, description: "Total marks if present, e.g. 75, 100" },
        timeAllowed: { type: Type.STRING, description: "Time duration, e.g. 3 Hours" },
        instituteOrBoard: { type: Type.STRING, description: "Board or school name" },
        primaryLanguage: { type: Type.STRING, description: "en, ur, sd, or mixed" },
        primaryDirection: { type: Type.STRING, description: "ltr or rtl" },
        dateStr: { type: Type.STRING },
      },
      required: ["title", "subject", "gradeClass", "primaryLanguage", "primaryDirection"],
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING, description: "Section name, e.g. Section A (MCQs) or حصو الف" },
          instructions: { type: Type.STRING, description: "Instructions for this section" },
          direction: { type: Type.STRING, description: "ltr or rtl" },
          language: { type: Type.STRING, description: "en, ur, or sd" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                number: { type: Type.STRING, description: "e.g. Q1, سوال نمبر ۱" },
                text: { type: Type.STRING, description: "Full transcribed question text" },
                marks: { type: Type.STRING, description: "Marks allocated, e.g. 5, 10" },
                language: { type: Type.STRING, description: "en, ur, or sd" },
                direction: { type: Type.STRING, description: "ltr or rtl" },
                confidence: { type: Type.NUMBER, description: "0.0 to 1.0" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Choices for MCQs if applicable",
                },
              },
              required: ["id", "number", "text", "language", "direction", "confidence"],
            },
          },
        },
        required: ["id", "title", "direction", "language", "questions"],
      },
    },
    overallConfidence: { type: Type.NUMBER, description: "0.0 to 1.0 overall transcription confidence" },
    notes: { type: Type.STRING, description: "Any notes on unreadable or blurry regions" },
  },
  required: ["version", "metadata", "sections", "overallConfidence"],
};

// Function Declarations for Gemini Function Calling Tools
export const ASK_CLARIFYING_QUESTIONS_TOOL = {
  name: "ask_clarifying_questions",
  description: "Ask the teacher clarifying questions before generating or finalizing the exam paper to narrow down specifics (such as marks distribution, question numbering style, language balance, exam format, or answer lines).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rationale: { type: Type.STRING, description: "Why these questions are necessary" },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            question: { type: Type.STRING, description: "Concise question for the teacher" },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Short selectable answer choices (under 10 words each)"
            },
            allowsCustomAnswer: { type: Type.BOOLEAN }
          },
          required: ["id", "question", "options"]
        }
      }
    },
    required: ["questions"]
  }
};

export const MANIPULATE_DOC_TOOL = {
  name: "manipulate_doc",
  description: "Execute structured manipulations on an examination document (e.g. reorder sections, update marks, renumber questions, add questions, convert numerals, or adjust layout).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: "Operation: 'update_marks', 'add_question', 'remove_question', 'reorder_sections', 'convert_numerals', 'change_layout'"
      },
      targetSectionId: { type: Type.STRING },
      targetQuestionNumber: { type: Type.STRING },
      parametersJson: { type: Type.STRING, description: "JSON stringified parameters or instructions" }
    },
    required: ["action", "parametersJson"]
  }
};

export const COMPOSE_DOC_TOOL = {
  name: "compose_doc",
  description: "Compose or assemble an exam document structure with sections, questions, and metadata from teacher specifications.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      gradeClass: { type: Type.STRING },
      title: { type: Type.STRING },
      totalMarks: { type: Type.STRING },
      timeAllowed: { type: Type.STRING },
      language: { type: Type.STRING, description: "en, ur, or sd" },
      direction: { type: Type.STRING, description: "ltr or rtl" },
      sectionsSummary: { type: Type.STRING, description: "Summary of composed sections" }
    },
    required: ["subject", "gradeClass", "title", "language", "direction"]
  }
};
export async function transcribeExamPaper(
  photosBase64: { data: string; mimeType: string }[],
  onStatusUpdate?: (stage: "reading" | "inspecting" | "writing", detail?: string) => void,
  targetLanguage?: SupportedLanguage
): Promise<TranscriptionDocument> {
  const ai = getGeminiClient();

  // Smart Model & Parameter Selection based on language difficulty:
  // - English: gemini-3.1-flash-lite, minimal thinking, fast OCR
  // - Urdu: gemini-3.8-flash, balanced thinking for Nastaliq ligatures
  // - Sindhi: gemini-3.8-flash, medium thinking + Python sandbox code execution for forensic dot inspection
  const langKey = (targetLanguage || "mixed").toLowerCase() as keyof typeof AI_CONFIG.PARAMETER_PROFILES;
  const profile = AI_CONFIG.PARAMETER_PROFILES[langKey] || AI_CONFIG.PARAMETER_PROFILES.mixed;

  // Auto-chosen article (saves navigation tokens)
  const article = getAutoChosenArticle(targetLanguage);
  const systemContent = `${FORENSIC_SYSTEM_INSTRUCTION}\n\n[AUTO-CHOSEN RESEARCH PACK: ${article.filename}]\n${article.content}`;

  // Attempt Gemini API prompt caching via ai.caches.create and config.cachedContent parameter
  const { cachedContentName, isCacheHit } = await getOrCreateGeminiPromptCache(
    ai,
    profile.model,
    systemContent,
    langKey
  );

  console.log(`[SonarDocs Execution] Model: ${profile.model} | Thinking: ${profile.thinkingLevel} | CodeExecution: ${profile.useCodeExecution} | Article: ${article.filename} | CachedContentParam: ${cachedContentName || "inline"}`);

  onStatusUpdate?.("reading", "Reading your photo…");

  // Multimodal image parts
  const imageParts = photosBase64.map((p) => ({
    inlineData: {
      data: p.data,
      mimeType: p.mimeType,
    },
  }));

  // Configure thinking level
  const thinkingEnum = profile.thinkingLevel === "MEDIUM"
    ? ThinkingLevel.MEDIUM
    : profile.thinkingLevel === "LOW"
    ? ThinkingLevel.LOW
    : ThinkingLevel.MINIMAL;

  // Configure Python code execution tool if required (especially for Sindhi paleography)
  const toolsConfig: any[] = [];
  if (profile.useCodeExecution) {
    toolsConfig.push({ codeExecution: {} });
    onStatusUpdate?.("inspecting", "Looking closer with Python sandbox zoom…");
  }

  const promptText = `Forensically transcribe this examination paper. Transcribe all questions, instructions, sections, and marks accurately into the required JSON schema. Maintain exact Urdu and Sindhi Arabic-script orthography and English terms.${
    profile.useCodeExecution
      ? " You may write Python code to crop, zoom in, enhance contrast, and inspect subtle dot formations on cursive Arabic-script characters."
      : ""
  }`;

  let responseText: string | undefined;

  try {
    const configObj: any = {
      temperature: profile.temperature,
      topP: AI_CONFIG.TOP_P,
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_RESPONSE_SCHEMA,
    };

    // Use explicit prompt cache parameter if available; otherwise supply inline systemInstruction
    if (cachedContentName) {
      configObj.cachedContent = cachedContentName;
    } else {
      configObj.systemInstruction = systemContent;
    }

    // Apply thinkingConfig only on models that support it (Gemini 3 and 4 series)
    if (profile.model !== "gemini-3.1-flash-lite") {
      configObj.thinkingConfig = { thinkingLevel: thinkingEnum };
    }

    if (toolsConfig.length > 0) {
      configObj.tools = toolsConfig;
    }

    const response = await ai.models.generateContent({
      model: profile.model,
      contents: {
        parts: [
          ...imageParts,
          { text: promptText },
        ],
      },
      config: configObj,
    });

    if (response.usageMetadata?.cachedContentTokenCount) {
      console.log(`[SonarDocs Prompt Cache] Success: ${response.usageMetadata.cachedContentTokenCount} tokens served directly from Gemini prompt cache!`);
    }

    responseText = response.text;
  } catch (err: any) {
    console.error("Gemini primary transcription error with profile:", profile.model, err);
    onStatusUpdate?.("inspecting", "Looking closer…");

    // Fallback invocation with default model
    const fallbackResponse = await ai.models.generateContent({
      model: AI_CONFIG.MODELS.DEFAULT,
      contents: {
        parts: [
          ...imageParts,
          { text: `${promptText}\nOutput MUST be valid JSON conforming to the TranscriptionDocument schema.` },
        ],
      },
      config: {
        systemInstruction: systemContent,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });
    responseText = fallbackResponse.text;
  }

  if (!responseText) {
    throw new Error("No transcription generated by AI.");
  }

  // Parse and validate JSON
  let transcription: TranscriptionDocument;
  try {
    transcription = cleanAndParseJson(responseText);
  } catch (parseErr) {
    console.warn("JSON parse error, attempting auto-repair retry:", parseErr);
    onStatusUpdate?.("inspecting", "Refining transcription…");

    // Auto-repair retry
    const repairResponse = await ai.models.generateContent({
      model: AI_CONFIG.EDIT_MODEL_NAME,
      contents: `Fix this malformed JSON into a strictly valid JSON object matching the TranscriptionDocument schema. Return JSON ONLY:\n\n${responseText}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!repairResponse.text) {
      throw new Error("Auto-repair of transcription failed.");
    }
    transcription = cleanAndParseJson(repairResponse.text);
  }

  onStatusUpdate?.("writing", "Writing your file…");
  return sanitizeTranscription(transcription);
}

/**
 * Natural language edit loop: teacher asks e.g. "Q3 ke marks 10 karo"
 * Mutates the stored JSON schema using Gemini Flash Lite without re-running OCR
 */
export const INTERROGATE_USER_DECLARATION = {
  name: "interrogate_user",
  description:
    "Call this function to craft targeted multiple-choice clarifying questions to ask the teacher before modifying the exam paper, whenever their intent has multiple possibilities, requires specific choices (e.g. difficulty level, mark weights, layout, language style, question types, chapter/topic coverage), or needs clarification.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rationale: {
        type: Type.STRING,
        description: "Friendly message to the teacher explaining what is being clarified.",
      },
      questions: {
        type: Type.ARRAY,
        description: "List of 1 to 3 targeted multiple-choice questions.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: "Unique identifier for question, e.g. q1",
            },
            question: {
              type: Type.STRING,
              description: "The clear question text",
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "4 to 5 distinct, well-defined options representing diverse preferences (e.g. board pattern, marks, difficulty, question styles)",
            },
          },
          required: ["id", "question", "options"],
        },
      },
    },
    required: ["rationale", "questions"],
  },
};

export type InterrogationOrEditResult =
  | {
      type: "interrogate";
      rationale: string;
      questions: Array<{ id: string; question: string; options: string[] }>;
    }
  | {
      type: "edit_completed";
      updatedDocument: TranscriptionDocument;
      summary: string;
    };

export async function applyNaturalLanguageEdit(
  currentDoc: TranscriptionDocument,
  editInstruction: string
): Promise<TranscriptionDocument> {
  const ai = getGeminiClient();

  const prompt = `You are an examination document editor. The teacher has requested an edit to an existing exam transcription.
Current Document JSON:
${JSON.stringify(currentDoc, null, 2)}

Teacher Request:
"${editInstruction}"

Apply the teacher's requested changes directly to the JSON structure (e.g. modify question marks, rewrite wording, fix numbering, change subject/title). Keep all other fields intact.
Return ONLY the updated JSON conforming to the TranscriptionDocument schema.`;

  const response = await ai.models.generateContent({
    model: AI_CONFIG.EDIT_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  });

  if (!response.text) {
    throw new Error("Failed to apply edit instruction.");
  }

  const updatedDoc = cleanAndParseJson(response.text);
  return sanitizeTranscription(updatedDoc);
}

/**
 * Intelligent chatbot editor that uses Gemini function-calling with interrogate_user
 * to ask clarifying MCQs whenever intent has multiple possibilities or choices.
 */
export async function processEditWithInterrogation(
  currentDoc: TranscriptionDocument,
  userInstruction: string,
  answersHistory?: Record<string, string>,
  detectedLanguage: string = "en"
): Promise<InterrogationOrEditResult> {
  const ai = getGeminiClient();

  // If user has already answered clarifying questions, execute the edit with their choices
  if (answersHistory && Object.keys(answersHistory).length > 0) {
    const editWithAnswersPrompt = `You are an expert examination document editor. The teacher has requested an edit and specified their exact preferences through these choices:
Current Document:
${JSON.stringify(currentDoc, null, 2)}

Teacher Request: "${userInstruction}"
Teacher's Clarifying Choices: ${JSON.stringify(answersHistory, null, 2)}

Apply the requested changes directly to the JSON structure. Maintain accurate subject terminology, marks, and numbering.
Return ONLY valid JSON conforming to the TranscriptionDocument schema.`;

    const response = await ai.models.generateContent({
      model: AI_CONFIG.EDIT_MODEL_NAME,
      contents: editWithAnswersPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: TRANSCRIPTION_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    if (!response.text) {
      throw new Error("Failed to apply edit with answers.");
    }
    const updated = sanitizeTranscription(cleanAndParseJson(response.text));
    return {
      type: "edit_completed",
      updatedDocument: updated,
      summary: "Updated the exam paper according to your choices.",
    };
  }

  // Evaluate whether to interrogate or directly execute
  const systemPrompt = `You are an examination paper AI assistant and editor.
Examine the teacher's edit instruction:
Teacher Request: "${userInstruction}"

Current Exam Document Summary:
- Subject: ${currentDoc.metadata.subject}
- Class: ${currentDoc.metadata.gradeClass}
- Total Marks: ${currentDoc.metadata.totalMarks}
- Sections: ${currentDoc.sections.map((s) => `${s.title} (${s.questions.length} questions)`).join(", ")}

Decision Rule:
1. If the instruction has open choices, pedagogical ambiguities, or subjective requests (such as "make questions harder", "add MCQs", "change format", "translate to Urdu/Sindhi", "reorganize sections", "change mark distribution", "add conceptual questions", "make paper longer"), you MUST call the "interrogate_user" function with 1 to 3 targeted multiple-choice questions to understand the teacher's exact intent before altering the paper.
2. If the instruction is completely simple, explicit, and unambiguous (such as "change marks of Q2 to 10", "fix typo in title to Midterm", "remove question 5"), do NOT call interrogate_user. Instead, return the updated JSON document directly.`;

  const response = await ai.models.generateContent({
    model: AI_CONFIG.EDIT_MODEL_NAME,
    contents: systemPrompt,
    config: {
      tools: [{ functionDeclarations: [INTERROGATE_USER_DECLARATION] }],
      temperature: 0.2,
    },
  });

  // Check if Gemini invoked interrogate_user
  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    if (call.name === "interrogate_user") {
      const args = call.args as any;
      if (args && Array.isArray(args.questions) && args.questions.length > 0) {
        return {
          type: "interrogate",
          rationale: args.rationale || "Let me clarify a few specifics to tailor this edit:",
          questions: args.questions,
        };
      }
    }
  }

  // If no function call, Gemini determined the edit is simple and unambiguous
  const updatedDoc = await applyNaturalLanguageEdit(currentDoc, userInstruction);
  return {
    type: "edit_completed",
    updatedDocument: updatedDoc,
    summary: "Applied your edit directly to the paper.",
  };
}

/**
 * Intelligent chatbot function call for new paper composition requests from chat
 */
export async function interrogateNewExamIntent(
  userPrompt: string,
  language: string = "en"
): Promise<{
  rationale: string;
  questions: Array<{ id: string; question: string; options: string[] }>;
}> {
  const ai = getGeminiClient();

  const prompt = `The teacher asked: "${userPrompt}".
Call the "interrogate_user" function with 2 to 3 targeted, practical multiple-choice questions (e.g. examination board/pattern, mark breakdown, question types, numeral style) to narrow down the specifics before composing the paper. No emojis.`;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.EDIT_MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ functionDeclarations: [INTERROGATE_USER_DECLARATION] }],
        temperature: 0.2,
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "interrogate_user") {
        const args = call.args as any;
        if (args && Array.isArray(args.questions) && args.questions.length > 0) {
          return {
            rationale: args.rationale || "Please specify a few details for your exam paper:",
            questions: args.questions,
          };
        }
      }
    }
  } catch (e) {
    console.warn("interrogateNewExamIntent fallback:", e);
  }

  const fallback = await generateClarifyingQuestions(userPrompt, language);
  return {
    rationale: fallback.rationale || "Please specify a few details for your exam paper:",
    questions: fallback.questions,
  };
}

/**
 * Write and ask relevant clarifying questions before making/finalizing the paper
 * to narrow down specifics (marks distribution, numbering format, layout standard)
 */
export async function generateClarifyingQuestions(
  contextDescription: string,
  detectedLanguage: string = "en"
): Promise<{ rationale?: string; questions: Array<{ id: string; question: string; options: string[] }> }> {
  const ai = getGeminiClient();

  const isUrdu = detectedLanguage === "ur";
  const isSindhi = detectedLanguage === "sd";

  const prompt = `Analyze this examination material context: "${contextDescription}".
Generate exactly 2 to 3 clarifying multiple-choice questions for the teacher to narrow down the specifics BEFORE finalizing or composing the paper.
Each question MUST have 4 to 5 rich, realistic options.
Focus on:
1. Examination Pattern / Format (Sindh Board Pattern, Federal Board FBISE, Cambridge O-Level, School Term Exam, Practice Worksheet)
2. Question Composition / Difficulty (Standard Mix MCQs & Short & Long, Conceptual & Critical Thinking Focus, Numerical & Problem Solving Focus, Pure Descriptive Theory)
3. Total Marks & Time (25 Marks 45 Mins, 50 Marks 1.5 Hours, 75 Marks 2.5 Hours, 100 Marks 3 Hours)

Rules:
- Questions must be concise (1 short sentence).
- Each question must provide 4 to 5 distinct options (under 10 words each). No markdown, NO EMOJIS!
- Language should match teacher's context (${isUrdu ? "Urdu" : isSindhi ? "Sindhi" : "English"}).`;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.EDIT_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rationale: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["id", "question", "options"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Clarifying questions generation error:", err);
  }

  // Sane default fallback clarifying questions without emojis
  if (isUrdu) {
    return {
      rationale: "پرچہ فائنل کرنے سے پہلے تفصیلات منتخب کریں:",
      questions: [
        {
          id: "q_format",
          question: "امتحانی بورڈ یا فارمیٹ منتخب کریں:",
          options: [
            "سندھ بورڈ پیٹرن (BISE)",
            "فیڈرل بورڈ پیٹرن (FBISE)",
            "اسکول مڈٹرم / ٹرم پیپر",
            "ہوم ورک و مشقی شیٹ جوابی جگہ کے ساتھ",
            "معروضی کوئز پیپر (صرف MCQs)",
          ],
        },
        {
          id: "q_marks",
          question: "کل نمبر اور دورانیہ منتخب کریں:",
          options: [
            "25 نمبر (45 منٹ)",
            "50 نمبر (1.5 گھنٹہ)",
            "75 نمبر (2.5 گھنٹے)",
            "100 نمبر (3 گھنٹے)",
          ],
        },
        {
          id: "q_numerals",
          question: "سوالات کے نمبروں کا انداز:",
          options: [
            "مشرقی عربی انگ (۱، ۲، ۳)",
            "انگریزی اعداد (1, 2, 3)",
            "اردو حروف تہجی (الف، ب، ج)",
            "رومن اعداد (I, II, III)",
          ],
        },
      ],
    };
  }

  if (isSindhi) {
    return {
      rationale: "پڙچو تيار ڪرڻ کان اڳ وضاحتون چونڊيو:",
      questions: [
        {
          id: "q_format",
          question: "پڙچي جو فارميٽ يا بورڊ چونڊيو:",
          options: [
            "سنڌ بورڊ پيٽرن (BISE)",
            "اسڪول مڊٽرم ٽيسٽ پيٽرن",
            "جوابي لڪيرن سان مشقي شيٽ",
            "ڪوچنگ سينٽر موڪ ٽيسٽ",
            "صرف چونڊ سوال (MCQs)",
          ],
        },
        {
          id: "q_marks",
          question: "ڪل مارڪون ۽ وقت چونڊيو:",
          options: [
            "25 مارڪون (45 منٽ)",
            "50 مارڪون (1.5 ڪلاڪ)",
            "75 مارڪون (2.5 ڪلاڪ)",
            "100 مارڪون (3 ڪلاڪ)",
          ],
        },
        {
          id: "q_numerals",
          question: "سوالن جا نمبر ڪيئن رکو:",
          options: [
            "سنڌي انگ (۱، ۲، ۳)",
            "انگريزي انگ (1, 2, 3)",
            "سنڌي اکر (الف، ب، ج)",
            "رومن انگ (I, II, III)",
          ],
        },
      ],
    };
  }

  return {
    rationale: "Select paper specifics before generating:",
    questions: [
      {
        id: "q_format",
        question: "Select examination layout standard or board:",
        options: [
          "Sindh Board Pattern (BISE)",
          "Federal Board Pattern (FBISE)",
          "School Midterm / Final Examination",
          "Worksheet with Answer Lines",
          "Objective Quiz Sheet (MCQs Only)",
        ],
      },
      {
        id: "q_marks",
        question: "Total marks & duration allocated:",
        options: [
          "25 Marks (45 Minutes)",
          "50 Marks (1.5 Hours)",
          "75 Marks (2.5 Hours)",
          "100 Marks (3 Hours)",
        ],
      },
      {
        id: "q_style",
        question: "Question composition and difficulty:",
        options: [
          "Standard Balanced Mix (MCQs + Short + Detailed)",
          "Conceptual & Critical Thinking Focus",
          "Numerical & Problem Solving Focus",
          "Direct Memory & Definition Focus",
        ],
      },
    ],
  };
}

/**
 * Compose a new examination paper based on subject, grade, and answered clarifying questions
 */
export async function composeExamPaper(specs: {
  subject: string;
  gradeClass: string;
  totalMarks?: string;
  timeAllowed?: string;
  language: string;
  direction?: string;
  clarifyingAnswers?: Record<string, string>;
  customPrompt?: string;
}): Promise<TranscriptionDocument> {
  const ai = getGeminiClient();

  const isRTL = specs.language === "ur" || specs.language === "sd" || specs.direction === "rtl";
  const dir = isRTL ? "rtl" : "ltr";

  const prompt = `Compose a comprehensive, professional examination paper document according to these teacher specifications:
- Subject: ${specs.subject}
- Class/Grade: ${specs.gradeClass}
- Language: ${specs.language} (${dir})
- Total Marks: ${specs.totalMarks || "75"}
- Time Allowed: ${specs.timeAllowed || "3 Hours"}
- Clarifying Options Chosen: ${JSON.stringify(specs.clarifyingAnswers || {})}
${specs.customPrompt ? `- Custom Requirements: ${specs.customPrompt}` : ""}

Structure the document with:
1. Section A: Multiple Choice Questions (MCQs) with options
2. Section B: Short Answer Questions with allocated marks
3. Section C: Detailed / Long Descriptive Questions

Return strictly valid JSON conforming to the TranscriptionDocument schema. Maintain authentic Urdu/Sindhi orthography if applicable.`;

  const langKey = specs.language || "en";
  const article = getAutoChosenArticle(langKey);
  const systemContent = `You are an expert curriculum examination composer.\n[RESEARCH PACK: ${article.filename}]\n${article.content}`;
  const { cachedContentName } = await getOrCreateGeminiPromptCache(ai, AI_CONFIG.MODEL_NAME, systemContent, langKey);

  const configObj: any = {
    responseMimeType: "application/json",
    responseSchema: TRANSCRIPTION_RESPONSE_SCHEMA,
    temperature: 0.2,
  };

  if (cachedContentName) {
    configObj.cachedContent = cachedContentName;
  } else {
    configObj.systemInstruction = systemContent;
  }

  const response = await ai.models.generateContent({
    model: AI_CONFIG.MODEL_NAME,
    contents: prompt,
    config: configObj,
  });

  if (response.usageMetadata?.cachedContentTokenCount) {
    console.log(`[SonarDocs Compose] CachedContentTokenCount: ${response.usageMetadata.cachedContentTokenCount} tokens reused from prompt cache.`);
  }

  if (!response.text) {
    throw new Error("Paper composition failed.");
  }

  const doc = cleanAndParseJson(response.text);
  return sanitizeTranscription(doc);
}

/**
 * Direct document manipulation execution engine
 */
export async function executeDocManipulation(
  doc: TranscriptionDocument,
  action: string,
  payload: Record<string, any>
): Promise<TranscriptionDocument> {
  // 1. Programmatic fast transformations
  if (action === "convert_numerals") {
    const toEastern = payload.toEastern ?? true;
    const westernDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const easternDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

    const replaceDigits = (str: string) => {
      let result = str;
      for (let i = 0; i < 10; i++) {
        if (toEastern) {
          result = result.replaceAll(westernDigits[i], easternDigits[i]);
        } else {
          result = result.replaceAll(easternDigits[i], westernDigits[i]);
        }
      }
      return result;
    };

    return {
      ...doc,
      sections: doc.sections.map((sec) => ({
        ...sec,
        title: replaceDigits(sec.title),
        questions: sec.questions.map((q) => ({
          ...q,
          number: replaceDigits(q.number),
          marks: q.marks ? replaceDigits(q.marks) : q.marks,
          text: replaceDigits(q.text),
        })),
      })),
    };
  }

  if (action === "add_answer_lines") {
    return {
      ...doc,
      sections: doc.sections.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) => ({
          ...q,
          text: `${q.text}\n_________________________________________________________________\n_________________________________________________________________`,
        })),
      })),
    };
  }

  if (action === "reorder_sections") {
    // Reverse or cycle sections
    return {
      ...doc,
      sections: [...doc.sections].reverse(),
    };
  }

  // 2. Fall back to AI-driven structured manipulation
  const ai = getGeminiClient();
  const prompt = `You are a document manipulation executor.
Perform the following manipulation on this examination document:
Action: ${action}
Parameters: ${JSON.stringify(payload)}

Current Document JSON:
${JSON.stringify(doc, null, 2)}

Return strictly valid JSON conforming to the TranscriptionDocument schema.`;

  const response = await ai.models.generateContent({
    model: AI_CONFIG.EDIT_MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  });

  if (!response.text) {
    throw new Error("Document manipulation execution failed.");
  }

  return sanitizeTranscription(cleanAndParseJson(response.text));
}

function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

function sanitizeTranscription(doc: any): TranscriptionDocument {
  // Ensure valid structure with fallbacks
  return {
    version: doc.version || "1.0",
    metadata: {
      title: doc.metadata?.title || "EXAMINATION PAPER",
      subject: doc.metadata?.subject || "Subject",
      gradeClass: doc.metadata?.gradeClass || "Class",
      totalMarks: doc.metadata?.totalMarks || "",
      timeAllowed: doc.metadata?.timeAllowed || "",
      instituteOrBoard: doc.metadata?.instituteOrBoard || "",
      primaryLanguage: doc.metadata?.primaryLanguage || "en",
      primaryDirection: doc.metadata?.primaryDirection === "rtl" ? "rtl" : "ltr",
      dateStr: doc.metadata?.dateStr || new Date().toISOString().split("T")[0],
    },
    sections: Array.isArray(doc.sections)
      ? doc.sections.map((s: any, sIdx: number) => ({
          id: s.id || `section-${sIdx + 1}`,
          title: s.title || `Section ${sIdx + 1}`,
          instructions: s.instructions || "",
          direction: s.direction === "rtl" ? "rtl" : "ltr",
          language: s.language || "en",
          questions: Array.isArray(s.questions)
            ? s.questions.map((q: any, qIdx: number) => ({
                id: q.id || `q-${sIdx + 1}-${qIdx + 1}`,
                number: q.number || `Q${qIdx + 1}`,
                text: q.text || "",
                marks: q.marks || "",
                language: q.language || "en",
                direction: q.direction === "rtl" ? "rtl" : "ltr",
                confidence: typeof q.confidence === "number" ? q.confidence : 0.9,
                options: Array.isArray(q.options) ? q.options : undefined,
              }))
            : [],
        }))
      : [],
    overallConfidence: typeof doc.overallConfidence === "number" ? doc.overallConfidence : 0.88,
    notes: doc.notes || "",
  };
}
