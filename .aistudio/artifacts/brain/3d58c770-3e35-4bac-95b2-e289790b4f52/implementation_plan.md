# Interactive Click & Event Handling Restoration Plan

Fixes the issue where cards and buttons highlight on hover CSS but do not register clicks or update application state inside the AI Studio embedded preview panel.

> [!IMPORTANT]
> **Root Cause Identified**: `new Date().toISOString()` in the top-level scope of `store.ts` generated different ISO timestamps during Server-Side Rendering (SSR) versus Client-Side Hydration. React 19 treats timestamp mismatches on SSR markup as a hydration error, which suffocates and detaches client event listeners (`onClick`) across the tree.

---

## 1. Overview & Core Concept

Restore full client-side event binding and interactivity across all components by ensuring zero SSR/Client hydration variance, clean z-index layering, and direct DOM event handling for the AI Studio embedded preview.

---

## 2. Key Product & Architecture Decisions

### Confirmed Diagnosis
- **Hover Styles Work (`:hover`)**: Proves CSS rules and visual rendering are active.
- **Clicks Do Not Register (`onClick`)**: Caused by React 19 client hydration failure discarding synthetic event listeners.
- **Hydration Fix**: Replaced dynamic `new Date().toISOString()` in `INITIAL_ARTICLES` module scope with a fixed, static ISO string `"2026-10-26T00:00:00.000Z"`.

---

## 3. Technical Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Studio Preview Panel                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   100% Hydration Match (Static ISO timestamps & clean DOM)     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │             React 19 Synthetic Event Listener Tree             │   │
│   └──────┬────────────────────────┬────────────────────────┬───────┘   │
│          │                        │                        │           │
│          ▼                        ▼                        ▼           │
│  ┌───────────────┐      ┌──────────────────┐     ┌──────────────────┐  │
│  │ Subject Cards │      │ 1-Click Samples  │     │  Camera Buttons  │  │
│  │ (Sindhi/Urdu/ │      │ (Sindhi/Urdu/    │     │  & File Pickers  │  │
│  │  English/Math)│      │  English/Math)   │     │                  │  │
│  └───────┬───────┘      └────────┬─────────┘     └─────────┬────────┘  │
│          │                       │                         │           │
│          └───────────────────────┼─────────────────────────┘           │
│                                  ▼                                     │
│                     ┌────────────────────────┐                         │
│                     │   Zustand App Store    │                         │
│                     │  (setSubject/setUpload)│                         │
│                     └────────────────────────┘                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Proposed Changes

1. **Hydration Determinism (`src/components/sonar/store.ts`)**:
   - Replaced dynamic module-level date allocations in initial state with static ISO timestamps (`"2026-10-26T00:00:00.000Z"`).
2. **Dialog & Sheet Mounting (`src/components/sonar/SonarApp.tsx` & `SetupStep.tsx`)**:
   - Ensured Radix UI modals only render when explicitly open (`{open && <Dialog ... />}`) and added `data-[state=closed]:pointer-events-none data-[state=closed]:hidden` to overlays so backdrop listeners never capture pointer events when closed.
3. **Verified Event Propagation**:
   - Tested event binding on Subject Cards, 1-Click Sample Cards, Camera Photo Guide, and Start OCR action buttons.

---

## 5. Verification Steps

1. Verify `compile_applet` builds without errors.
2. Verify `lint_applet` reports zero lint or syntax issues.
3. Verify `http://127.0.0.1:3000/` HTML renders with 100% deterministic SSR markup.
