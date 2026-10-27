/**
 * Realistic high-resolution sample handwritten page images as crisp SVG data URLs.
 * Allows users to test the pipeline with 1-click without needing to upload their own file first.
 */

function svgToDataUrl(svg: string): string {
  const cleanSvg = svg.trim();
  if (typeof window !== "undefined" && window.btoa) {
    try {
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(cleanSvg)))}`;
    } catch {
      /* fallback below */
    }
  }
  return `data:image/svg+xml;base64,${Buffer.from(cleanSvg).toString("base64")}`;
}

export const SAMPLE_PAGES = [
  {
    id: "sample-sindhi",
    subject: "sindhi",
    title: "Sindhi Handwritten Prose & Poetry Note",
    subtitle: "سنڌي نئون خطاطي نوٽ (صفحو ۱)",
    description: "Multi-line Sindhi Arabic script note featuring 52 letters, aspirates, and retroflex nuqtas on lined paper.",
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
        <!-- Paper background -->
        <rect width="800" height="1000" fill="#fcf9f2"/>
        <!-- Page border & subtle shadow -->
        <rect x="20" y="20" width="760" height="960" fill="#ffffff" stroke="#e2d8c3" stroke-width="2" rx="8"/>
        <!-- Ruling lines -->
        <line x1="80" y1="120" x2="720" y2="120" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="200" x2="720" y2="200" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="280" x2="720" y2="280" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="360" x2="720" y2="360" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="440" x2="720" y2="440" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="520" x2="720" y2="520" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="600" x2="720" y2="600" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="680" x2="720" y2="680" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="760" x2="720" y2="760" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="840" x2="720" y2="840" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="680" y1="40" x2="680" y2="960" stroke="#f2b8b8" stroke-width="1.5"/> <!-- Margin line -->

        <!-- Title in Sindhi -->
        <text x="650" y="95" font-family="sans-serif" font-size="28" font-weight="bold" fill="#2b1a0e" text-anchor="end">
          سنڌي ادب ۽ شاهه عبداللطيف ڀٽائي
        </text>

        <!-- Body text lines (RTL) -->
        <text x="650" y="185" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          شاهه جو رسالو سنڌي ٻوليءَ جو اعليٰ ترين شاهڪار آهي.
        </text>
        <text x="650" y="265" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          هن ۾ سسئي، مارئي، نوري ۽ عمر جون داستانون بيان ٿيل آهن.
        </text>
        <text x="650" y="345" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          سر يمن ڪليان: سڀئي جِيءَ جبل جُهار، هنيون هوند نه ڌارِ.
        </text>
        <text x="650" y="425" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          جيئن تُون تَنگُ طَلَبَ ۾، تيئن تو ۾ طَلَبدارُ.
        </text>
        <text x="650" y="505" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          سنڌي الفابيٽ ۾ ۵۲ اکر آهن جن ۾ خاص آواز شامل آهن.
        </text>
        <text x="650" y="585" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          مثال: ڀ (bhh)، ڄ (jjh)، ڏ (ddh)، ڳ (ggh)، ڱ (ng).
        </text>
        <text x="650" y="665" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          ليکڪ جي هٿ جي لکائي ۾ نقطن جو صحيح جائزي نتيجو ڏئي ٿو.
        </text>
        <text x="650" y="745" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          استاد جو سبق: هر روز پڙهڻ ۽ لکڻ جي مشق ڪريو.
        </text>

        <!-- Page Footer note -->
        <text x="400" y="920" font-family="sans-serif" font-size="14" fill="#887e6d" text-anchor="middle">
          نمونو صفحو - سنڌي هٿ جي لکائي · Sonar Docs Sample Page
        </text>
      </svg>
    `),
  },
  {
    id: "sample-urdu",
    subject: "urdu",
    title: "Urdu Nastaliq Poetry & Essay Note",
    subtitle: "اردو نستعليق لکائي (صفحہ اول)",
    description: "Urdu Nastaliq handwriting note showing diagonal cascades, aspirate digraphs, and nuqta dots.",
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
        <rect width="800" height="1000" fill="#fcf9f2"/>
        <rect x="20" y="20" width="760" height="960" fill="#ffffff" stroke="#e2d8c3" stroke-width="2" rx="8"/>
        <line x1="80" y1="120" x2="720" y2="120" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="200" x2="720" y2="200" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="280" x2="720" y2="280" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="360" x2="720" y2="360" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="440" x2="720" y2="440" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="520" x2="720" y2="520" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="600" x2="720" y2="600" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="680" x2="720" y2="680" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="760" x2="720" y2="760" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="840" x2="720" y2="840" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="680" y1="40" x2="680" y2="960" stroke="#f2b8b8" stroke-width="1.5"/>

        <text x="650" y="95" font-family="sans-serif" font-size="28" font-weight="bold" fill="#2b1a0e" text-anchor="end">
          علامہ اقبال کا پیغام نوجوانوں کے نام
        </text>

        <text x="650" y="185" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          محبت مجھے ان جوانوں سے ہے، ستاروں پہ جو ڈالتے ہیں کمند۔
        </text>
        <text x="650" y="265" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          تندئ بادِ مخالف سے نہ گھبرا اے عقاب!
        </text>
        <text x="650" y="345" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          یہ تو چلتی ہے تجھے اونچا اڑانے کے لیے۔
        </text>
        <text x="650" y="425" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          اردو خطاطی میں نستعلیق کی ترچھی نشست بہت اہم ہے۔
        </text>
        <text x="650" y="505" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          مرکب الفاظ اور دو چشمی ھ (کھ، چھ، تھ) کا استعمال۔
        </text>
        <text x="650" y="585" font-family="sans-serif" font-size="22" fill="#1e2436" text-anchor="end">
          طالب علم کے لیے روزانہ نوٹس تیار کرنے کی مشق۔
        </text>

        <text x="400" y="920" font-family="sans-serif" font-size="14" fill="#887e6d" text-anchor="middle">
          نمونہ اردو لکاہئی نوٹ · Sonar Docs Sample Page
        </text>
      </svg>
    `),
  },
  {
    id: "sample-english",
    subject: "english",
    title: "English Cursive Physics & History Lecture Note",
    subtitle: "Handwritten Classroom Notes (Page 1)",
    description: "Cursive and print mixed note covering kinematics equations, force diagrams, and lecture annotations.",
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
        <rect width="800" height="1000" fill="#fcf9f2"/>
        <rect x="20" y="20" width="760" height="960" fill="#ffffff" stroke="#e2d8c3" stroke-width="2" rx="8"/>
        <line x1="80" y1="120" x2="720" y2="120" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="200" x2="720" y2="200" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="280" x2="720" y2="280" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="360" x2="720" y2="360" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="440" x2="720" y2="440" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="520" x2="720" y2="520" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="600" x2="720" y2="600" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="680" x2="720" y2="680" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="760" x2="720" y2="760" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="120" y1="40" x2="120" y2="960" stroke="#f2b8b8" stroke-width="1.5"/>

        <text x="140" y="95" font-family="sans-serif" font-size="26" font-weight="bold" fill="#1b2a4a">
          Physics Lecture Notes — Kinematics &amp; Motion
        </text>

        <text x="140" y="185" font-family="sans-serif" font-size="20" fill="#1a1a2e">
          1. Newton's First Law of Motion: An object remains at rest unless acted upon.
        </text>
        <text x="140" y="265" font-family="sans-serif" font-size="20" fill="#1a1a2e">
          2. Equation of Constant Acceleration: v = u + a * t
        </text>
        <text x="140" y="345" font-family="sans-serif" font-size="20" fill="#1a1a2e">
          3. Distance displacement formula: s = u * t + (1/2) * a * t^2
        </text>
        <text x="140" y="425" font-family="sans-serif" font-size="20" fill="#1a1a2e">
          4. Force equals mass times acceleration (F = m * a).
        </text>
        <text x="140" y="505" font-family="sans-serif" font-size="20" fill="#1a1a2e">
          Key Note: Ensure units are in SI standard (Meters, Seconds, Kilograms).
        </text>
        <text x="140" y="585" font-family="sans-serif" font-size="20" fill="#1a1a2e">
          Experiment Result: Velocity vs Time graph shows linear slope m = 9.8 m/s^2.
        </text>

        <text x="400" y="920" font-family="sans-serif" font-size="14" fill="#887e6d" text-anchor="middle">
          English Handwritten Sample Note · Sonar Docs
        </text>
      </svg>
    `),
  },
  {
    id: "sample-math",
    subject: "mathematics",
    title: "Handwritten Calculus & Algebra Worksheet",
    subtitle: "Mathematics Problem Set & Formula Derivations",
    description: "Derivatives, integrals, fractions, limits and matrix equations with LaTeX-convertible notation.",
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
        <rect width="800" height="1000" fill="#fcf9f2"/>
        <rect x="20" y="20" width="760" height="960" fill="#ffffff" stroke="#e2d8c3" stroke-width="2" rx="8"/>
        <line x1="80" y1="120" x2="720" y2="120" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="200" x2="720" y2="200" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="280" x2="720" y2="280" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="360" x2="720" y2="360" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="440" x2="720" y2="440" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="520" x2="720" y2="520" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="600" x2="720" y2="600" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="80" y1="680" x2="720" y2="680" stroke="#e8e0d0" stroke-width="1.5"/>
        <line x1="120" y1="40" x2="120" y2="960" stroke="#f2b8b8" stroke-width="1.5"/>

        <text x="140" y="95" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0d2b45">
          Calculus &amp; Linear Algebra Problem Sheet
        </text>

        <text x="140" y="185" font-family="serif" font-size="22" fill="#111827">
          1. Solve integral: ∫ (3x² + 2x + 1) dx = x³ + x² + x + C
        </text>
        <text x="140" y="265" font-family="serif" font-size="22" fill="#111827">
          2. Quadratic Formula: x = (-b ± √(b² - 4ac)) / (2a)
        </text>
        <text x="140" y="345" font-family="serif" font-size="22" fill="#111827">
          3. Limit Evaluation: lim (x → 0) [ sin(x) / x ] = 1
        </text>
        <text x="140" y="425" font-family="serif" font-size="22" fill="#111827">
          4. Euler Identity: e^(i * π) + 1 = 0
        </text>
        <text x="140" y="505" font-family="serif" font-size="22" fill="#111827">
          5. Summation: ∑ (k = 1 to n) k = n * (n + 1) / 2
        </text>

        <text x="400" y="920" font-family="sans-serif" font-size="14" fill="#887e6d" text-anchor="middle">
          Handwritten Math Worksheet · Sonar Docs
        </text>
      </svg>
    `),
  },
];
