// Centralized AI, Model Tiering, and Parameter Configuration
// Dynamically routes based on language difficulty:
// - English: gemini-3.1-flash-lite (lowest latency/cost, fast OCR)
// - Urdu: gemini-3.8-flash (medium thinking for Nastaliq ligatures)
// - Sindhi: gemini-3.8-flash (medium thinking + Python code execution sandbox for forensic dot inspection)
export const AI_CONFIG = {
  // Primary defaults
  MODEL_NAME: "gemini-3.8-flash",
  EDIT_MODEL_NAME: "gemini-3.1-flash-lite",
  TEMPERATURE: 0.1,
  TOP_P: 0.95,
  MAX_OUTPUT_TOKENS: 8192,

  // Model Tier definitions
  MODELS: {
    // English (Lowest difficulty, fast OCR)
    ENGLISH: "gemini-3.1-flash-lite",

    // Urdu (Medium difficulty Nastaliq)
    URDU: "gemini-3.8-flash",

    // Sindhi (Hardest cursive Arabic-script with 52 letters & 4-dot variations)
    SINDHI: "gemini-3.8-flash",

    // Conversational edits & fast micro-corrections
    FAST_EDIT: "gemini-3.1-flash-lite",

    // Fallback default
    DEFAULT: "gemini-3.8-flash",
  },

  // Language-specific parameter profiles
  PARAMETER_PROFILES: {
    en: {
      model: "gemini-3.1-flash-lite",
      thinkingLevel: "MINIMAL" as const,
      useCodeExecution: false,
      researchFile: "english-exam-standards.md",
      temperature: 0.1,
      description: "Low-latency OCR profile for English text",
    },
    ur: {
      model: "gemini-3.8-flash",
      thinkingLevel: "LOW" as const,
      useCodeExecution: false,
      researchFile: "urdu-nastaliq.md",
      temperature: 0.1,
      description: "Balanced reasoning profile for Urdu Nastaliq cursive",
    },
    sd: {
      model: "gemini-3.8-flash",
      thinkingLevel: "MEDIUM" as const,
      useCodeExecution: true, // Python sandbox execution to zoom and inspect cropped image regions
      researchFile: "sindhi-paleography.md",
      temperature: 0.05,
      description: "High-forensic paleography profile with Python image inspection and medium thinking",
    },
    mixed: {
      model: "gemini-3.8-flash",
      thinkingLevel: "MEDIUM" as const,
      useCodeExecution: true,
      researchFile: "sindhi-paleography.md",
      temperature: 0.1,
      description: "Hybrid profile for multi-script examination materials",
    },
  },

  // Agentic inspection loop limits
  MAX_TOOL_ITERATIONS: 5,
  PIPELINE_TIMEOUT_MS: 3 * 60 * 1000,

  // Context Caching configuration
  CACHE_VERSION: "v2.1.0-targeted-packs",
  CACHE_TTL_SECONDS: 3600,

  // Guardrails
  GUARDRAILS: {
    MAX_PHOTOS_PER_JOB: 8,
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
    MAX_IMAGE_DIMENSION_PX: 1600,
    MAX_JOBS_PER_USER_PER_DAY: 20,
    ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  },
} as const;

export type AiConfig = typeof AI_CONFIG;
