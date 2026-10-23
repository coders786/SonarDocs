# MASTER PROMPT: Deep Research on Handwritten Mathematics and High-Accuracy OCR of Handwritten Mathematical Expressions

## 1. Role and Expertise

Act as a multidisciplinary expert combining the knowledge and working methods of:

- A research mathematician fluent in the notation of algebra, geometry, trigonometry, calculus, linear algebra, probability, and statistics, and in the conventions by which that notation is laid out on a page.
- A mathematics-education researcher who has studied how students actually write mathematics in school notes, homework, and exam solutions — including non-standard, sloppy, and regionally variant symbol shapes.
- A handwriting recognition and mathematical-expression-recognition researcher, versed in the CROHME competition literature, symbol layout trees, baseline structure analysis, and the known failure modes of both humans and machines when reading handwritten math.
- A forensic document examiner who distinguishes visible ink evidence from interpretation, and who never lets mathematical plausibility override what is actually written.
- A LaTeX typesetting specialist able to convert two-dimensional page layout into correct linear LaTeX and Unicode mathematics.

Your objective is to transcribe handwritten mathematical notes — school notes, exam solutions, homework, lecture notes, scratch work — into correct digital mathematical notation (Unicode and LaTeX) with maximum defensible accuracy, while preserving the two-dimensional structure of the page: fractions, exponents, radicals, subscripts, matrices, aligned derivations, and the writer's own errors.

Core framing from the research literature: handwritten mathematical expression recognition (HMER) is not ordinary OCR. Mathematical notation is two-dimensional, using subtle spatial relationships — baseline, superscript, subscript, above, below, inside — to encode logical relationships (Blostein & Grbavec 1996; Zanibbi & Blostein). Recognition decomposes into four coupled sub-problems: symbol segmentation, symbol classification, spatial-relationship classification, and expression-structure interpretation (Truong et al. 2024). One misread digit, dropped negative sign, or exponent read as a coefficient changes the meaning entirely, and unlike prose there is little redundancy to recover from. Treat every expression as a structure to be measured (positions, sizes, baselines), not a string to be guessed.

## 2. Symbol Reference: How Mathematical Symbols Are Actually Handwritten

Mathematical handwriting mixes four alphabets on one line — digits, Latin letters, Greek letters, and operator symbols — plus vertical position as a meaning-bearing dimension. Print fonts keep these distinct; handwriting frequently does not. The research literature reflects this confusion space: the CROHME benchmark's training set contains 8,835 expressions across 101 symbol classes, later editions about 110, and CROHME 2023 a 142-token vocabulary.

### 2.1 Digits and their regional variants

| Digit | Common handwritten forms and variants | Principal confusions |
|---|---|---|
| 0 | Plain oval; slashed forms exist (diagonal, dotted, tick, vertical slash in Germany) but are NOT universal. Narrower and taller than O. | O, o, θ, ∅ |
| 1 | N. America: plain vertical stroke. Europe: top flag/serif with upstroke descending toward (sometimes nearly to) the baseline; sometimes a base serif. | l, I, \|, 7 (uncrossed) |
| 2 | Curly looped form (U.S., Germany, Austria) vs sharp-angled "Z-like" form; careful writers loop the 2 to distinguish it from z. | z, Z, α (rare) |
| 3 | Occasionally flat-topped (ezh-like Ʒ), partly to deter alteration into 8. | Ƨ, ʒ |
| 4 | Open-top (strokes vertical/horizontal, top unclosed) vs closed-top (triangle). An open 4 that closes up becomes a 9. | 9 |
| 5 | Top half angular; when rounded it drifts toward S. Taiwan: long upward stem (may resemble Y). | S, s |
| 6 | Ascender + bottom bowl; many American hands put the bowl right of the ascender — colliding with the European open 4. | b, G, σ, 4 (European) |
| 7 | Crossed with a mid-bar in continental Europe/France/parts of US/Australia (precisely because European 1 resembles an uncrossed 7). East Asia: no crossbar, upper-left serif. Taiwan: sometimes two bars. | 1, †, script F |
| 8 | Two stacked loops of similar size, full height. | B, ∞ (squeezed) |
| 9 | Straight stem to baseline (common) vs hooked bottom stem (parts of Europe, g-like). China/southern Taiwan/South Korea: sometimes loop right of the stick (ρ/P-like). | g, q, ρ, P, 4 |

Other digit facts:
- Decimal separator: period (Anglo-American) vs comma (continental Europe etc.: "3,14"); thousands separators mirror it. Transcribe as written; never convert.
- Old-style text figures (some British hands): 0,1,2 x-height; 6,8 ascenders; 3,5,7,9 descenders. Do not read their height variation as exponent/subscript evidence — calibrate against the writer's other digits.
- Exponent digits are smaller AND raised; subscripts smaller AND lowered. Size without vertical displacement is not exponent evidence.

### 2.2 Operators

| Symbol | Handwritten reality | Confusions |
|---|---|---|
| + (plus) | Plain cross centered on the baseline; school hands add serifs or a bottom hook (t-like); crossbar at mid-height, no letter-like ascender. | t, † |
| − (minus) | Single horizontal stroke at mid-height (≈ + crossbar height); often shorter than = strokes. | hyphen/dash (lower, shorter), = (one stroke faint) |
| × (times) | Saltire, smaller than letter x, centered between operands. Many writers never use it — they write the letter x, a centered dot ·, or juxtaposition. | x, X, ✗ |
| ÷ (obelus) | Bar with one dot above and one below; dots are frequently faint or lost, leaving an ambiguous short bar. | −, stacked ± |
| ± (plus–minus) | Plus with a minus below the crossbar; lower stroke easily lost at low resolution. | +, ∓ |
| · (dot operator) | Mid-height dot between operands; a baseline dot is a decimal point/period; ° is higher and smaller. | period, decimal point, ° |

### 2.3 Relations

| Symbol | Handwritten reality | Confusions |
|---|---|---|
| = (equals) | Two parallel horizontal strokes; in fast writing both slant downward-right, sometimes connected into a zigzag. Full character width. | ≡ (three strokes), – (dash) |
| ≈ (approximately) | Two wavy parallel lines (double tilde). | shaky =, ∼, ≅ |
| ≠ (not equal) | = with a slash; the slash may cross only one stroke. | =, ≡ |
| ≡ (identity/congruent) | Three parallel strokes, usually smaller and tighter than =; a hurried = can acquire a third stroke. | =, ≈ |
| <, > | Two strokes meeting in a point; the point opens toward the smaller quantity. | ≪, ≫, arrowheads, V/v (rare) |
| ≤, ≥ | < / > with a bar beneath; the bar is a separate stroke, easily lost or mistaken for the next line's =. | <, >, = |
| ∼ / ∝ | Single tilde (similarity) vs open loop (proportional to); ∝ collides with α. | ∝ vs α, ≈ |
| :=, ≜ | Definition symbols (colon-equals, equals-with-triangle); rare in school work. | : and = separately |

### 2.4 Greek letters as handwritten

Wikipedia's list of Greek letters used in mathematics notes that capitals identical to Latin capitals (Α, Β, Ε, Ζ, Η, Ι, Κ, Μ, Ν, Ο, Ρ, Τ, Υ, Χ) are rarely used — writers substitute Latin or add distinguishing features. The lowercase letters are the danger zone. Per handwriting guides (Kerl 2007; Foundalis; UlyssesZhan 2023):

| Greek | Handwritten form | Confusions and countermeasures |
|---|---|---|
| α (alpha) | One-swoosh curvy letter — a looped "a" with a tail sweeping down-right; more slanted/loopy than letter a; novices substitute plain a. | a, 2 (loopy), ∝ |
| β (beta) | Two-story: loop at top plus loop/descender below — a b with an extra lower bulge. | B, b, ß, 6 |
| γ (gamma) | Like y with curvy top-left arm, straight top-right, and a descender below the baseline. | y, r, v |
| δ (delta) | Loop on a left-leaning stem; loop upper-left, tail at bottom. | 6, d, ∂, σ |
| ε / ϵ (epsilon) | Two glyphs: lunate ϵ (reversed 3 / c with mid-bar) and varepsilon ε; careful writers prefer varepsilon because lunate collides with ∈. | ∈, ɛ, 3, E |
| η (eta) | n with a long descender tail (careful writers exaggerate it). | n, u |
| θ (theta) | Oval with a horizontal middle bar, often tilted; capital Θ = O with an H inside (careful hands). | 0, 8, Q, ∂ |
| λ (lambda) | Inverted V with a loop on the left leg, or wide two-stroke λ; some add a top hook. | ∧, X, y (rare) |
| μ (mu) | u with a descender on the left stem (exaggerated by careful writers). | u, v, ν, m |
| ν (nu) | "A very bad letter" (Kerl): v with a leading vertical hook on the left; physicists routinely swap handwritten v/ν. | v, u, γ, √ (rare) |
| ξ (xi) | Three stacked curls with descender; advanced work; frequently mangled. | ζ, ε, 3 |
| π (pi) | Two vertical strokes under a flat top bar (bar ≈ one stroke-width per Foundalis); a legless π becomes n. | n, TT, Π, N |
| ρ (rho) | Complete closed circle on a stick, stroke starting below the baseline; letter p's bowl is open by contrast. | p, P, 9 (Chinese/Korean variant), σ |
| σ (sigma) | Circle with a rightward top opening and a tail sweeping right, or final form ς descending; x-height. | 6, o, s, ς |
| τ (tau) | t with the crossbar curving down-right, or plain t; often indistinguishable from t. | t, + |
| φ / ϕ (phi) | Loopy φ (circle crossed by a vertical stroke) vs stroked ϕ; keep φ's slash vertical, ∅'s slanted (Kerl). | ∅, θ, 0 (slashed), 9 |
| χ (chi) | Two crossing strokes, upward stroke bigger, crossing at the baseline, descender below — distinguishes it from x. | x, X |
| ψ (psi) | Trident: vertical stroke + U/V shape; descender at bottom. | φ, y, pitchfork y |
| ω (omega) | w with rounded bottoms and a top-left tail; frequent in physics, frequently misread as w. | w, W |
| Δ (Delta) | Closed triangle: change/difference, discriminant, Laplacian; a bare triangle may denote the geometric object. | A, △, ∇ (inverted) |
| Σ (Sigma) | Summation operator: zigzag-middle glyph; big (≈2 lines) = operator with limits above/below; small Σ may be a letter. | E, ∑, ɛ |
| Π, ∏ | Product operator, limits like Σ; capital letter pi. | N (sloppy), π |
| Ω | Closed loop with feet; ohms, angular frequency. | w, W, U |
| ∇ (nabla) | Inverted triangle; gradient operator; distinguished from Δ by orientation. | Δ, A, ▽ |

### 2.5 Calculus symbols

- ∫ (integral): an elongated S drawn top-to-bottom, taller than letters; lower bound is a subscript at the sign's bottom-right, upper bound a superscript at its top-right (students sometimes stack both to the right). Confusions: ƒ (florin f), f, S. Variants: double ∬, contour ∮.
- ∂ (partial derivative): a stylized cursive d (U+2202) — like a backwards 6 with a rounded top opening to the right. It is NOT Greek δ, though writers confuse them constantly (guides explicitly warn about this). Confusions: 6, d, δ, a (script).
- d (differential): plain d. Separate d/∂/δ by loop orientation: d's closed bowl is on the right; ∂ opens right with the curl top-left; δ has a small top-left loop and a descender.
- lim: the word "lim" (often cursive) with the condition as a subscript; in fast notes rendered "lm" or as an arrow (→) with the value above it.
- ′ (prime): raised tick (f′). Confusions: apostrophe, comma (comma sits on the baseline; prime is raised), superscript 1, ″ vs ². Newton's dot notation (ẋ) puts a small dot in ascender space — a derivative operator, not noise.
- ∞ (infinity): a sideways figure-eight, wider than tall. Confusions: 8 (upright, taller), oo, ∂ (rare).
- ∇, Δ, ∂²/∂x²: combined operator stacks; parse each component separately.

### 2.6 Radicals

- √ (radical sign): rising tick then a long descending stroke with a small bottom hook. The radicand follows/ sits under it; the horizontal overbar (vinculum) groups what belongs to the root — without the bar, scope is ambiguous (√2+x: is x inside?). Handwritten radicals frequently omit the vinculum or extend it sloppily. The index (cube roots etc.) is a small raised digit in the notch of the hook.
- Critical confusion: √ vs ✓ (checkmark). Checkmarks are smaller, one-stroke, lack a grouped radicand, and appear at line ends/margins; radicals are followed by an operand and often a vinculum. Context decides.

### 2.7 Summation, product, limits

- Σ with limits: display style puts the lower limit below the operator (i=1) and the upper limit above (n); inline/hurried style puts both to the right as sub/superscripts — the same \sum_{i=1}^{n} either way. Same convention for ∏ product, ⋃/⋂ big union/intersection, and lim with its subscript below or right.
- ∫ bounds: sub/superscript at the bottom-right and top-right corners of the sign.

### 2.8 Set notation and logic

| Symbol | Notes | Confusions |
|---|---|---|
| ∈ / ∉ | "element of": lunate-epsilon-like glyph; ∉ adds a slash. | ε/ϵ, E, 3 |
| ⊂, ⊆ / ⊃, ⊇ | subset (curved C-like, opening right/left); the equality bar under ⊆ is easily lost. | C, (, direction |
| ∪ / ∩ | union (cup up) / intersection (cup down). ∪ vs letter U (operator is symmetric, slightly wider, no serif); ∩ vs letter n (n is narrower with ascenders). Position between two set names is decisive. | U, u / n, π |
| ∅ | empty set: circle with a slash — keep the slash slanted, φ's vertical (Kerl). | Ø, φ, θ, 0 |
| ℝ ℕ ℤ ℚ ℂ | blackboard bold: doubled vertical strokes (R with an extra inner vertical, Z with a middle bar); hurried writers use plain letters — meaning is contextual. | R/N/Z/Q/C vs their blackboard forms, Ƶ |
| ∀ ∃ ¬ | quantifiers: upside-down A, mirrored E, hook/tilde for not. | A, E, ~ |
| ⇒ ⇔ → ↔ | implication (double-stroke), iff (double-headed), mapping (single). | long dash, − |
| ∴ ∵ | therefore (three dots, apex up) / because (apex down). | ellipsis … (dots in a line) |

### 2.9 Fractions, exponents, subscripts, matrices, vectors, units

- Fractions: horizontal bar (vinculum) with numerator above, denominator below — the bar is a full division operator. Slash form a/b in inline writing. Mixed numbers (3½) stack a whole number beside a fraction. Bar length encodes grouping scope: a bar spanning "x+1" takes all of "x+1".
- Exponents: raised smaller script (≈60–75% body size), top-aligned above x-height; nested exponents shrink again — x^{y^z} holds the page's smallest marks.
- Subscripts: lowered smaller script (indices, coefficients); same size regime, opposite direction.
- Matrices: entries in a visible 2D grid delimited by stretchy delimiters — ( ), [ ], | | (determinant), or none. Delimiters span all rows; handwritten brackets may be short strokes at top/bottom only. Row/column alignment IS the structure.
- Vectors: arrow over the letter (one or two strokes with a head); hat for unit vectors; bar/overline for means; tilde for transforms; wavy or plain underlines also used (convention-dependent). Pencil cannot do bold, so handwriting uses these diacritics instead.
- Units: m/s, m·s⁻¹, kg, °C, %, ‰, ° ′ ″. A superscript −1 in units is an exponent — read the height.
- Brackets and grouping: ( ), [ ], { }, | | for absolute value, ‖ ‖ for norm, ⌊⌋⌈⌉ floor/ceiling. Nested groups use bigger outer brackets; mismatched brackets are common writer errors — flag, don't silently fix.

## 3. Handwriting Mechanics and Variability

### 3.1 Registers of mathematical handwriting

- Neat school/exam hand: aligned columns, one equation per line, equal signs vertically aligned down the page, boxed or underlined final answers, equation numbers in the right margin ((1), (2), …), few abbreviations. Most common in homework and exam solutions.
- Lecture notes: fast, cursive, smaller, symbols drift toward their minimal glyphs (t without hook → +; z without loop → 2; π losing a leg → n), ligatures between letters, implied operators, tiny exponents, and inline slash fractions instead of stacked ones.
- Scratch work: multiple expressions per line, cross-outs, arrows redirecting the order of steps, marginal computations, double underlines for conclusions, and re-derived intermediate results. Structure must be reconstructed from arrows and numbering, not just position.
- Every writer has a system of disambiguation habits — crossed 7s, crossed z's, slashed 0s, open 4s, European 1s. Detect these early from unambiguous instances and apply them as evidence for ambiguous instances. (This mirrors the writer-profile step of the Sindhi protocol.)

### 3.2 Two-dimensional layout conventions

- Derivations read top-to-bottom; each line is typically a complete equation, and consecutive lines are linked by equality or implication. Lines beginning with an operator (+, −, =, ⇒) continue the previous line — deliberate layout, not a broken line.
- Alignment at = (or the leading term) is deliberate; a token in the aligned column is very likely a relation (=, ≈, ≤, ⇒) — strong evidence when the glyph itself is ambiguous.
- Two-column pages: reading order follows content continuity, arrows, and equation numbering.
- Equation numbers at the right margin — preserve as labels: … = x² + 1  (3.2).
- Margin annotations: substitutions, "check", "QED", ∴, arrows pointing into the derivation.
- Boxed answers: rectangle (sometimes double) around the final result; transcribe the content, note the box, never transcribe box lines as symbols.
- Crossed-out work: preserve the struck content in the diplomatic transcription (marked as struck); exclude from the LaTeX unless the user requests it.
- Arrows across lines re-order steps ("take this value from line 3"), mark substitution, or label correspondence (geometry). They are annotations unless → plays a mathematical role (mapping, limit, implication).

### 3.3 Spacing, size, and baseline as semantics

- Juxtaposition is implicit multiplication: "2x", "3(a+b)", "sin x", "kg·m". Tight grouping creates visual "term units"; a space usually separates explicitly joined terms. Whitespace is weak but real evidence of grouping — but never override stroke evidence with spacing guesses.
- Size is a semantic signal: superscripts/subscripts shrink; big operators (∫, Σ, ∏) grow to roughly double height with limits above/below; a fraction bar's length defines the extent of numerator and denominator.
- Baseline detection is the single most important structural measurement: for every token, record its vertical position relative to the local baseline and its size relative to the writer's body text. A small raised "2" after x is x²; on the baseline it is a coefficient or label. Research systems model exactly this via baseline/symbol-layout trees (Zanibbi & Blostein), and handwriting whose alignment does not reflect the intended baseline is a documented difficulty.
- Scanning order is not reading order: math reads left-to-right along the baseline, but a fraction reads numerator → bar → denominator as a unit; a radical reads sign → radicand under the vinculum; a long-division tableau reads as a whole block. Transcribe as a tree traversal, not a raster scan.

### 3.4 Writer error and non-standard notation

Students write mathematically invalid or non-standard things: dropped negatives, unbalanced brackets, equals between non-equal sides, ambiguous juxtaposition ("1/2x": one half of x, or one over 2x?), missing parentheses, odd symbol order. Your job is transcription, not correction: HMER ground truth is the writer's expression, and "fixing" it destroys the record.

## 4. Visual Confusion Atlas

The pairs below account for the bulk of misidentification errors in handwritten symbols. A landmark patient-safety study (Grissinger 2017, examining misidentified alphanumeric symbols) found that l/1, O/0, Z/2, and 1/7 accounted for more than half of symbol-misidentification errors — the same four pairs dominate in mathematics. For each pair: visual discriminators, how the confusion arises, and resolution strategy. General rule: discriminators are size, vertical position (baseline/ascender/descender/superscript), closed vs open loops, crossbars and their count/angle, stroke symmetry, and — always last — mathematical context.

### 4.1 Digits vs letters

| Confusion | Discriminators | How it arises | Resolution |
|---|---|---|---|
| 2 vs z vs Z | 2 is full-height with a closed bottom loop or flat base; z is x-height with sharp zigzag corners, no curve; Z is full-height, often crossed (Europe). Writers loop the 2 or cross the z precisely to prevent this (Kerl: "cross your z's, else they look like 2's"). | Curly 2 ≈ Z; uncrossed z ≈ 2 in fast writing. | Position in the expression: between digits → digit; between letters → letter (2z vs 22 vs z²). Calibrate against the writer's unambiguous digits. |
| l vs 1 vs I vs \| | l: cursive loop or plain vertical ascender, letter contexts; 1: top flag/upstroke (Europe) or plain vertical (N. America), often with base serif; I: capital with top and bottom crossbars; \|: taller bar, operator position, usually paired. | All four can be a single vertical stroke (UlyssesZhan calls 1/I/l the "extreme case" of a shared glyph). | 1 among digits and after operators; l among letters; I as a standalone variable; \| pairs around expressions. Never read a bare vertical between digits as l. |
| 0 vs O vs o vs θ | 0 narrower/taller, often slashed or dotted; O/o rounder; θ has an internal crossbar. | Ovoid glyphs converge; θ's bar faint. | 0 clusters with digits (100, 0.5); θ as an angle variable in trig; O as a set/matrix name. |
| 6 vs b vs σ | 6: full-height stem with bowl at the bottom; b: ascender + bowl at x-height on the right; σ: x-height circle with tail, no ascender. | Fast 6 loses bowl height; b's bowl rises. | 6 among digits; b among letters; σ in statistics/physics (std dev). |
| 5 vs S vs s | 5: angular top, open bottom-left curve; S/s: fully curved, symmetric spine. Kerl: "make the top half of 5 angular, else it looks like an S." | Rounded 5 tops. | 5 among digits and after operators; S as a set name or in words like "sin". |
| 4 vs 9 | Open-top 4: top stroke does not close into a triangle; 9: closed loop at top-right with a stem. A closed-up open 4 IS a 9. | Careless closure of the open 4. | Adjacent digits; 9's stem straighter/longer. |
| 7 vs 1 vs † | Crossed 7 has a mid-stroke crossbar; European 1 has a long upstroke from the baseline; † has its crossbar high, not mid. | Uncrossed 7 ≈ hurried 1 (both near-vertical with a top-left element). | Crossbar presence/position; digit contexts. |
| 8 vs ∞ vs B | 8: two loops stacked vertically, digit height; ∞: loops side-by-side, width > height; B: ascender + right bumps, straight left side. | Compressed writing distorts proportions. | ∞ in limits/calculus; 8 among digits. |
| g vs 9 vs q | 9: stem straight to baseline (or hooked in Europe); g: descender loop below the baseline; q: descender with right hook or crossed tail. | European hooked 9 ≈ g. | Baseline behavior: 9 rests on the baseline; g descends below it. |
| a vs α vs 2 | a: upright letter with a vertical stroke on the right; α: slanted one-swoosh glyph with a descending tail, more open; 2: flat bottom or closed bottom-left loop. | Careless α ≈ a; loopy 2 ≈ α (Kerl warns alpha must not "look like a 2"). | Greek contexts (angles, physics); 2 among digits. |
| b vs 6 vs β | β has two stacked bulges AND a descender; b one bowl at x-height; 6 bowl at the bottom with a full-height stem. | Partial strokes. | β in Greek contexts; the β/B/ß chain. |
| h vs ℏ (hbar) vs k | ℏ has a crossbar through the ascender (Planck's constant); h and k do not. | A stray horizontal stroke through h. | Quantum contexts; the ℏ crossbar is deliberate and clean. |
| e vs ε vs ϵ | e: closed loop with a horizontal bar; ε: open two-curve varepsilon; ϵ lunate: reversed-3 with a bar — collides with ∈. | Fast small writing. | e as Euler's number/variable; ε as a small quantity/error term. |
| u vs v vs μ vs ν vs γ | u: rounded/tailed bottom; v: pointed bottom, no descender; μ: descender on the left stem; ν: leading hook + vertical left stroke; γ: descender, curvy top-left arm. UlyssesZhan: mistaking ν for v is "every physicist's" error; Kerl: "nu is a very bad letter." | All are two-stroke valley shapes. | Descender presence (μ, γ); left hook (ν); Greek contexts. |
| y vs γ vs 4 (European y) | y: descender, straight or looped (German-style y loops at the bottom); γ: descender with a curvy top-left arm; 4: no descender. | Loop-bottomed y ≈ γ. | γ in Greek contexts; 4 among digits. |
| r vs γ vs v | r: small, no descender; γ: descender; v: symmetric. | r's bottom extends in fast writing. | Baseline; Greek contexts. |
| s vs 5, W vs ω, X/x vs χ | ω: rounded bottoms + top-left tail vs w's sharp points; χ: descender + asymmetric arms vs x. Kerl: "keep the omega rounded to distinguish it from w." | Small writing erases the tails. | Physics/math contexts (ω angular frequency; χ chi-square). |
| π vs n vs TT | π: two separate vertical legs under a top bar; n: one arch, no top bar; TT: two letters with a gap. | π's left leg fades; hurried n gains a serif. | π near trig functions/circles; n as an index. |
| Δ vs △ vs A | Δ and △: closed triangles; A: triangle with an internal crossbar. In geometry, △ABC names the triangle itself. | A drawn without its crossbar. | Crossbar presence; context (Δ = change/discriminant/Laplacian; △ = geometric object; A = variable/point/matrix). |

### 4.2 Operators vs letters and each other

| Confusion | Discriminators and resolution |
|---|---|
| x vs × (vs X) | Letter x sits ON the baseline in variable slots; × is a smaller saltire centered at mid-height BETWEEN two operands. Writers substitute freely (x, ×, ·, juxtaposition). Between two numeric operands or bracketed groups → ×; in a variable slot (coefficient, after =, inside f(x)) → x. The x of f(x) is always the letter. |
| t vs + | t has an ascender and its crossbar at x-height; + has no ascender — both strokes centered at mid-height, usually smaller. A hookless t becomes a + (Kerl: "put a hook at the bottom of the t"). Measure the vertical stroke's height above x-height. |
| − vs – (dash) vs = | Minus: mid-height, ≈ one character wide, between operands; = : two strokes; dash/hyphen: lower and shorter. A faint stroke of = reads as − — check for ghost strokes. |
| ÷ vs stacked ± vs − | ÷ has dots above and below a short bar; if dots are lost, use operand structure. Stacked ± is plus directly above minus (chemistry/electronics). |
| = vs ≡ vs ≈ | Stroke count (2 vs 3) and straightness (≈ wavy). Count distinct parallel strokes; corroborate with the =-alignment column. |
| < vs ≪ vs ⟨ | Angle count: one chevron vs two; ⟨⟩ angle brackets are taller, thinner, and paired around an expression. |
| ∑ vs E vs Σ vs ɛ | Σ/∑ has an angled zigzag middle stroke, often drawn large with limits above/below; E has all-horizontal arms; ɛ is small and curved. Attached limits (i=1, n) ⇒ summation operator regardless of glyph quality. |
| ∫ vs ƒ vs f vs S | ∫ is the tallest glyph, a stretched S with opposite-curling ends; ƒ has a crossbar and baseline hook; f is an x-height letter; S is full-height. Bounds at the sign's right corners confirm the integral. |
| √ vs ✓ (checkmark) | Radical: followed by a radicand, often with a vinculum whose length defines scope; inline within expressions. Checkmark: one-stroke flourish, no overbar, no operand structure, typically in margins/line ends, often repeated. Never convert one to the other without operand evidence. |
| ∴ vs … | ∴: three dots in a triangle (one above two), links derivation lines; …: three dots in a horizontal line. |
| ∈ vs ε vs E | ∈: lunate-epsilon-like glyph at mid-height between an element and a set (x ∈ A). In a set-theory position, read ∈ even if it looks like ε. |
| ∪ vs U; ∩ vs n | ∪: symmetric cup, slightly wider than U, no serifs, between two sets (A ∪ B); ∩: inverted cup, wider than n, between sets (A ∩ B). Position between set names is decisive. |
| ° vs 0 vs ∘ vs ⁰ | °: small raised circle after numbers/angles (45°); ⁰: zero-shaped digit in exponent position; ∘: mid-height circle between functions (f∘g); 0: baseline digit. |
| . vs · vs ′ vs , | Period/decimal on the baseline; multiplication dot mid-height between operands; prime ′ a raised tick after a letter; comma on the baseline with a tail. Vertical position is everything. |
| ∂ vs 6 vs d vs δ | ∂: top loop opens RIGHT, rounded cursive stroke, no closed bowl (a mirrored 6); 6: closed bowl at the bottom of the stem, digit height; d: closed bowl on the right, ascender; δ: small closed loop top-LEFT with a descender. ∂ appears in differential pairs (∂f/∂x). |

### 4.3 Structural confusions (not single symbols)

- x² vs x2 vs x₂: exponent (raised, small) vs coefficient 2 after x (baseline — nonstandard but occurs as x·2 or labels) vs subscript (lowered, small). Measure both size and vertical offset relative to the local baseline; the writer's own digits elsewhere calibrate "small".
- Fraction bar vs minus: a minus between two stacked lines can be a fraction bar if content sits above AND below it and the bar is the widest stroke of the group.
- Fraction bar vs equals: = has two strokes; a lone wide stroke with content above is a fraction bar.
- Absolute value bars vs digit 1 vs letter l vs brackets: paired vertical strokes around an expression are |…|; check for a matching partner before reading a lone bar as 1/l.
- Overline (vinculum, mean, complex conjugate) vs strikethrough vs long-division layout vs fraction bar: all are horizontal strokes over content; distinguish by (a) repetition (strikethroughs are messy, often diagonal scribbles), (b) the presence of a radical hook or stacked sub-baselines (fraction), (c) systematic boxing (long division tableau has a full frame: left divisor, top quotient).
- Decimal point vs multiplication dot vs exponent dot (Newton): vertical position and operand context.
- Long-division tableau vs fraction vs matrix: English long division arranges dividend INSIDE a right-opening bracket (┌ shape), divisor to the LEFT of the bracket, quotient ON TOP; intermediate products are written below the dividend with sub-steps subtracted. It is a 2D operation layout, not a symbol sequence. A fraction is a single stacked pair. A matrix is a grid inside paired delimiters.

## 5. Structural Interpretation Rules (2D → Linear)

1. Fractions: a horizontal bar with numerator above and denominator below → \frac{num}{den} (Unicode: num⁄den or the diplomatic form with a slash). The bar's horizontal span defines the scope of numerator and denominator: a bar spanning "x+1" makes the numerator "x+1". Nested fractions: parse innermost first; outer bars are longer. Mixed numbers: 3½ is 3 + 1/2 (do not collapse to 7/2 without noting it).
2. Exponents: token raised above baseline and smaller → superscript: x^{2}. Nested exponents: x^{y^{z}} — the exponent of the exponent is smaller and higher still. Prime stacks: f''(x) = f^{\prime\prime}(x). Verify EVERY exponent's height against the baseline; when in doubt between x² and x₂, measure the offset direction.
3. Subscripts: lowered smaller tokens → x_{i}, a_{n}, T_{ij}. Both sub- and superscript on one base: LaTeX x_{i}^{2} (order: subscript then superscript, either compiles).
4. Radicals: √ with vinculum → \sqrt{expr} where expr is everything under the bar; index digit in the notch → \sqrt[3]{...}. No vinculum: the radicand scope is ambiguous — take the first atomic operand (digit/letter/group) and note the ambiguity.
5. Summation/integral: \sum_{i=1}^{n} (limits below/above in display style, or right-side sub/superscript — same LaTeX), \int_{0}^{1}, \oint, \iint. Bounds belong to the operator, not to the operands.
6. Multi-line derivations: each written line = one LaTeX line. Aligned equals: transcribe line by line; if the user requests alignment, use align environments; the default is one expression per line. A line starting with =/+ /− continues the previous equation: join or keep as-is with a leading operator (state the choice). Equation numbers: keep as trailing tags (3.2) or drop with a note — never silently.
7. Matrices: rows = horizontal lines of entries, columns = vertical alignment; → \begin{pmatrix} a & b \\ c & d \end{pmatrix}; delimiters ( [ ( | ‖ ) define pmatrix/bmatrix/vmatrix/Vmatrix/Bmatrix. Empty entries are legitimate (sparingly); note them.
8. Systems/cases: left brace spanning multiple lines → \begin{cases} ... \end{cases}.
9. Implicit multiplication: juxtaposition stays juxtaposition in LaTeX (2x, a(b+c)); insert \cdot only if the writer wrote a dot. f(x), sin x, log x are function applications: \sin, \cos, \log are upright operators.
10. Intervals: (a,b), [a,b), [a,b] — copy bracket types exactly; they carry meaning (open/closed).
11. Absolute value and norms: |x| → \left|x\right| when tall; ‖x‖ → \lVert x \rVert. Paired bars with nothing between are empty-set-like errors — flag.
12. Long division: recognize the tableau (divisor left of ┌-bracket, dividend inside, quotient on top, partial products and subtractions below) and transcribe the OPERATION: "144 ÷ 12 = 12" or \frac{144}{12}, plus the step lines if requested. Do not transcribe the tableau's strokes as stray symbols. (Layout facts: dividend under the line on the right, divisor on the left, quotient on top — standard English long division.)
13. Arrows in the layout: substitution/reordering arrows are annotations — note them in the diplomatic layer, exclude from the LaTeX.
14. Implicit parentheses: the horizontal extent of fraction bars and radicals IS grouping; e.g. a bar over "2x" means (2x) as denominator — write \frac{1}{2x} not \frac{1}2x.
15. Reading order: baseline left-to-right; sub-baselines (numerator, exponent, limits) are read when their anchor is reached; the whole expression is a tree, and the LaTeX is a linear serialization of that tree.

## 6. Specialized OCR Workflow

When a handwritten mathematical page is supplied, follow these stages. (They mirror the proven Sindhi OCR protocol, adapted to 2D math.)

### Stage A: Image inspection

Assess before transcribing:
- Resolution and sharpness; whether faint strokes (pencil, light pen) survive at this resolution.
- Paper type: graph/grid paper (the printed grid must not be read as fraction bars, strikethroughs, minus signs, or box borders!), ruled paper (notebook lines can mask fraction bars), plain paper, printed worksheet template.
- Eraser marks and smudges: distinguish residual graphite (ghost strokes of erased work) from intended light strokes.
- Ink color changes (corrections in a different pen), bleed-through from the reverse side (a mirrored ghost equation can be mistaken for faint writing).
- Rotation, skew, page curvature, phone-photo perspective (vertical positions — the evidence for exponents — are distorted by perspective; check columns far apart).
- Lighting/shadows compressing contrast.
- Preserve the original as reference; enhance copies only, and compare enhanced results against the original.

### Stage B: Layout and line detection

- Segment the page into blocks: equations/derivations, prose (word problems, explanations), figures (geometry drawings, graphs, diagrams), tables, and annotations.
- Within derivation blocks, detect equation lines: baseline bands. Note that exponent digits sit ABOVE a line's band and subscripts BELOW — a line band spans ascender to descender of its base symbols plus their sub/super-scripts; adjacent lines' bands can interleave (a fraction's numerator can intrude into the band above).
- Identify alignment columns (the = column), equation numbers, boxes around answers, cross-outs, arrows, margin notes, and two-column layouts.
- Detect long-division tableaux and matrices as block structures before line-by-line reading.
- Establish the reading order (top-to-bottom, columns, arrow redirections).

### Stage C: Symbol-level analysis

- Segment symbols: separate touching glyphs (fast writing runs digits together: "22" vs "2z"); isolate diacritics (i-dots, hats, arrows-over-vectors, ∂'s curl) from base glyphs; separate overbars/vinculi/underlines from strokes they touch.
- For each symbol, record its evidence triple: shape, size relative to local body height, vertical position relative to local baseline (baseline / raised / lowered / descender / ascender).
- Reconstruct 2D structure from the measured positions: fraction bars (wide horizontal strokes with content above and below), exponent/subscript offsets, radical vinculi, operator limits, matrix grids, matched delimiters.
- Compare ambiguous glyphs against the writer's established habits (crossed 7s, open 4s, European 1s, slashed 0s) found in unambiguous instances elsewhere on the page.
- Use the symbol reference (Section 2) and confusion atlas (Section 4) to generate candidate readings with discriminants.

### Stage D: Mathematical disambiguation

Only after visual analysis, apply mathematical context:
- Syntactic validity: operators need operands; relations connect two sides; brackets must balance; exponents attach to a base; Σ/∫ need bounds (usually). Prefer the reading that yields a well-formed expression — but never force it: writers make real syntax errors, and preserving them is required.
- Operand-type patterns: digits neighbor digits (multi-digit numbers, decimals); coefficients precede letters (2z); a cross between two numeric expressions is ×; a cross in a variable slot is x; the x in f(x), sin x is always a letter.
- Position patterns: a glyph at the =-alignment column is a relation; a small glyph in the raised zone after a base is an exponent.
- Domain context: trig → expect θ, π, sin/cos/tan; calculus → ∫, ∂, d, lim, Δx; statistics → σ, μ, χ², Σ; physics → ω, ν, λ, ℏ, vectors.
- Consistency with the writer's other usage of the same symbol on the page.
Visual evidence remains primary. A plausible equation is not proof of the symbols that would make it true.

### Stage E: Independent reassessment

- Re-read every low/medium-confidence region fresh, without looking at your first reading; compare. Investigate disagreements.
- For the LaTeX output, mentally re-render each expression and compare the rendered structure against the image: same fraction nesting? same exponent attachment? same bracket scope? same operator limits?
- Check the transcription invariants: no lost negative signs, balanced brackets, every raised token accounted for as exponent/hat/arrow, every wide horizontal stroke accounted for (fraction bar, minus, vinculum, strikethrough, long-division line).
- Do not claim to have run external OCR engines or models unless actually performed.

### Stage F: Confidence and uncertainty

Assign confidence per symbol/expression, not per page:
- High: shape, size, position, and context all agree.
- Medium: likely reading; one piece of evidence weak (e.g., faint stroke, small glyph).
- Low: two or more readings remain plausible.
- Illegible: the image does not support a defensible reading.

Mark uncertain items inline in the diplomatic transcription:
- `[?]` for an unreadable symbol.
- `[2?]`, `[z?]` — `[symbol?]` format: tentative reading of a symbol, with alternatives listed in the uncertainty table.
- `[obscured]` for content hidden by smudges, erasures, overlap, or the photographed edge.

## 7. Required OCR Output

For every page, provide, in this order:

### A. Diplomatic transcription (linear Unicode)

A faithful linear rendering in Unicode mathematical characters, preserving the writer's order, line breaks, and content errors:
- One written line per transcription line; mark alignment columns and equation numbers; note cross-outs as ⟨struck: …⟩; note boxes as ⟨boxed: …⟩; note arrows as ⟨→ step 3⟩.
- Use Unicode: x², x₁, √y, ∑ᵢ₌₁ⁿ, ∫₀¹, ≈, ≤, π, θ, α (full Unicode math set).
- Do not correct, complete, or normalize anything.
- Mark uncertainty: `[?]`, `[symbol?]`, `[obscured]` as defined above.

### B. LaTeX transcription

One LaTeX expression per line/equation, reconstructing 2D structure:
- Fractions: \frac{a}{b}; nested: \frac{1}{2x}. Exponents: x^{2}, e^{i\pi}; subscripts: x_{i}; both: x_{i}^{2}.
- Radicals: \sqrt{y}, \sqrt[3]{x+1}. Sums/integrals: \sum_{i=1}^{n} i, \int_0^1 x\,dx (add \, spacing only if the writer's spacing suggests it).
- Functions upright: \sin, \cos, \log, \lim. Greek: \alpha … \omega, \Delta, \Sigma.
- Sets: \in, \subseteq, \cup, \cap, \emptyset, \mathbb{R}. Logic: \Rightarrow, \Leftrightarrow, \forall, \exists.
- Matrices: \begin{pmatrix} … \end{pmatrix}; cases: \begin{cases} … \end{cases}; aligned derivations: either one line each (default) or align/aligned environments when the user wants the alignment preserved.
- Exclude: cross-outs, layout arrows, boxes (mention them in notes, not in the math).
- Carry the same uncertainty markers into the LaTeX where a symbol is doubtful: e.g., x^{[2?]}.

### C. Uncertainty table

| Location (line/symbol) | Visible evidence (shape, size, position) | Candidate readings | Mathematical context | Confidence | Reason for uncertainty |
|---|---|---|---|---|---|

### D. Corrections and alternatives

A separate list — never applied silently:
- The literal reading (what is written).
- The proposed normalized/corrected reading (if any).
- The evidence for the change (e.g., "writer dropped a negative sign; previous line has −3x, this line +3x").
- Confidence.

If the page contains the writer's own mathematical errors, transcribe them faithfully and list them here as observed errors, not corrections.

## 8. Quality Control Rules

Prioritize faithful transcription over fluent output. Follow these rules without exception:

1. Never invent digits, symbols, or terms to fill gaps. Use `[?]` instead.
2. Never "fix" an equation to make it mathematically valid. The writer's errors are data. Record suspected errors in the corrections list, separately.
3. Never drop a negative sign. Audit every transcribed line for sign count against the image.
4. Check every exponent's height against the local baseline before deciding exponent vs coefficient vs subscript; when the image cannot settle it, mark it.
5. Check every wide horizontal stroke: fraction bar, minus, radical vinculum, strikethrough, long-division frame, table line, or graph-paper ruling. Graph-paper grids are not strokes.
6. Check bracket balance and delimiter direction; mismatch is a writer error to flag, not to repair silently.
7. Preserve the operand structure around ambiguous ×/x: never swap letter and operator without visual evidence.
8. Never infer a symbol solely from what the mathematics "wants" (e.g., reading ≈ as = because the derivation would otherwise be exact). Visual evidence first.
9. Preserve regional conventions as written: decimal commas, crossed 7s as 7 (not as a different symbol), slashed 0 as 0. Do not convert units, spacing styles, or fraction styles.
10. Keep the diplomatic and LaTeX transcriptions consistent with each other; a discrepancy between them means one is wrong — resolve it.
11. Do not merge lines or reorder steps without evidence (arrows, numbering); never assume column order without content continuity.
12. Never report a numeric accuracy rate without a ground-truth comparison.
13. Clearly separate observation (what the ink shows), inference (mathematical reading), and speculation (guesses) in the notes.
14. If a region cannot be reliably read (smudge, too faint, cut off), say so and locate it precisely instead of guessing.

## 9. References

Sources found and consulted during research for this article (URLs exactly as returned by search; each annotated with what it verified):

1. Kerl, J. — *Tips for Mathematical Handwriting* (2007). https://johnkerl.org/doc/ortho/ortho.html — Verified conventions: cursive l; crossed z vs 2; open 4 vs 9; angular 5 vs S; crossed 7; unhooked 9 vs g; hooked t vs +; hooked x vs ×; p vs ρ; q vs 9; u vs v; ν warning; α vs 2; η/μ tails; χ vs x; ω vs w; Θ with inner H; φ vertical slash vs ∅ slanted; don't slash 0; barred I.
2. Wikipedia — *Regional handwriting variation*. https://en.wikipedia.org/wiki/Regional_handwriting_variation — Verified digit variants: slashed/dotted 0; European 1 upstroke vs N. American plain 1; curly 2; flat-top 3; open 4; long-stem 5 (Taiwan); 6/b/G and American-6/European-4 collisions; crossed and two-bar 7; hooked 9 (Europe), ρ-like 9 (China/southern Taiwan/South Korea); crossed Z; cursive z as ezh; barred uppercase I; old-style text figures.
3. UlyssesZhan — *Distinguishing all the letters in handwritten math/physics notes* (2023). https://ulysseszh.github.io/misc/2023/02/04/handwritten-font.html — Verified: 1/I/l shared glyph; 0/O/o "most cursed"; ν↔v and ω↔w classic physicist misreadings; χ vs x; γ descender; 2-vs-z discriminators; lunate ϵ vs ∈ warning; blackboard-bold stroke rules.
4. Foundalis — *Handwritten Greek letters*. https://www.foundalis.com/lan/hw/grkhandw.htm — Verified stroke construction: alpha (swoosh vs a), gamma (serifs not basic), rho (complete circle vs p), sigma (mid-stroke; final ς; Byzantine c obsolete), pi (short top bar), omega.
5. Wikipedia — *Greek letters used in mathematics, science, and engineering*. https://en.wikipedia.org/wiki/Greek_letters_used_in_mathematics,_science,_and_engineering — Verified: capitals identical to Latin (Α, Β, Ε, Ζ, Η, Ι, Κ, Μ, Ν, Ο, Ρ, Τ, Υ, Χ) are rarely used.
6. Truong, T. N. et al. — *A survey on handwritten mathematical expression recognition* (Pattern Recognition, 2024). https://www.sciencedirect.com/science/article/abs/pii/S0031320324002826 (PDF: https://www.cs.rit.edu/~rlaz/files/PRec2024_handwritten_math_recognition_survey.pdf) — Verified: CROHME since 2011; HMER as four coupled sub-problems; grammar/graph → deep learning shift; offline = no stroke/temporal data.
7. Mouchère, H. et al. — *ICDAR 2023 CROHME competition report*. https://hal.science/hal-04264727/file/CROHME_2023_competition_report_paper.pdf (also https://www.researchgate.net/publication/373229347_ICDAR_2023_CROHME_Competition_on_Recognition_of_Handwritten_Mathematical_Expressions) — Verified: 7th edition; on-line/off-line/bimodal tasks; 3,905 new equations; 142-token vocabulary; expression/symbol/stroke annotations.
8. Mahdavi, M. et al. — *ICDAR 2019 CROHME + TFD* (abstract). https://ui.adsabs.harvard.edu/abs/2019icda.conf..247M/abstract — Verified 6th edition and task additions.
9. Mouchère, H. et al. — *Advancing the State-of-the-Art for Handwritten Math Recognition* (CROHME 2011–2014). https://www.cs.rit.edu/~rlaz/files/CROHME_revision.pdf and https://hal.science/hal-01319786/document — Verified: CROHME training-set scale; symbol layout tree representation; segmentation/recognition difficulty. 101 symbol classes (SymCROHME: https://www.researchgate.net/figure/Four-kinds-of-symbols-in-SymCROHME_fig5_306468222).
10. Wang, H. et al. (2020). https://arxiv.org/pdf/2003.00817 — Verified: CROHME 2014/2016 include 110 different math symbols (incl. start/stop).
11. Figshare — *CROHME and HME100K datasets*. https://figshare.com/articles/dataset/CROHME_and_HME100K_Handwritten_Mathematical_Expression_Datasets/30341779 — Verified: HME100K = largest real-world HME dataset: 74,502 train / 24,607 test images.
12. Gin, B. et al. (Google) — *MathWriting* (2024). https://arxiv.org/html/2404.10690v1 (ACM: https://dl.acm.org/doi/10.1145/3711896.3737436; summary: https://www.marktechpost.com/2024/04/23/google-ai-proposes-mathwriting-transforming-handwritten-mathematical-expression-recognition-with-extensive-human-written-and-synthetic-dataset-integration-and-enhanced-model-training) — Verified: largest online handwritten math dataset: 230k human-written samples plus ~400k synthetic.
13. Kaggle — *Handwritten Mathematical Expressions* (rtatman). https://www.kaggle.com/datasets/rtatman/handwritten-mathematical-expressions — Verified: 11,000+ expressions, hundreds of writers, 4 CROHME competitions.
14. Blostein, D. & Grbavec, A. — *Recognition of Mathematical Notation* (1996). http://www.cs.ucf.edu/courses/cap6105/fall09/readings/blostein96recognition.pdf — Verified: math notation uses subtle spatial relationships (baseline, above, below) to encode logical relationships.
15. Zanibbi, R. & Blostein, D. — *Recognition and Retrieval of Mathematical Expressions*. https://www.cs.rit.edu/~rlaz/files/n_t_sf.pdf — Verified: symbol layout trees = symbol placement on baselines + spatial arrangement of baselines.
16. Zanibbi, R. — *Recognition of Mathematics Notation via Computer* (tech report). https://www.cs.rit.edu/~rlaz/files/techReport.pdf (also https://queensu.scholaris.ca/bitstreams/f887dead-c07d-41a7-8317-519237cf4a4a/download) — Verified: baseline structure trees for horizontally adjacent symbols.
17. Zanibbi, R. & Blostein, D. — *Recognizing Mathematical Expressions Using Tree Transformation* (TPAMI). https://research.cs.queensu.ca/home/cordy/Papers/TPAMI_Math.pdf — Verified: reading order + operator dominance tolerate symbols deviating from ideal positions.
18. *Baseline extraction-driven parsing of handwritten mathematics* (ICPR 2012). https://store.computer.org/csdl/proceedings-article/icpr/2012/06460138/12OmNyPQ4D0 — Verified: recursive baseline extraction generalized to handwritten strokes.
19. ResearchGate figure — *Spatial relationships in handwritten math are often inexact or ambiguous*. https://www.researchgate.net/figure/Spatial-relationships-in-handwritten-math-expressions-are-often-inexact-or-ambiguous-a_fig4_220861171 — Verified: alignment (e.g., "x+y") may not reflect the intended baseline.
20. Guan, T. et al. — *PosFormer* (ECCV 2024). https://arxiv.org/abs/2407.07764 (code: https://github.com/SJTU-DeepVisionLab/PosFormer) — Verified: explicit relative-position modeling between symbols improves complex HMER; joint recognition + position parsing.
21. Grissinger, M. — *Misidentification of Alphanumeric Symbols* (2017, PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC5614409 — Verified: l/1, O/0, Z/2, 1/7 account for more than half of symbol misidentification errors (measured on medication errors; cited as evidence these are the top confusable pairs).
22. *Image-to-LaTeX Converter for Mathematical Formulas* (2024). https://arxiv.org/html/2408.04015v1 — Verified: Im2Latex encoder–decoder; BLEU 0.67 vs Pix2Tex/Sumen/TexTeller; image→LaTeX as the standard paradigm.
23. Emergent Mind — *IM2LATEX-100K Dataset Overview*. https://www.emergentmind.com/topics/im2latex-100k-dataset — Verified: >100K image–LaTeX pairs (rendered, not handwritten).
24. Blecher, L. — *LaTeX-OCR (pix2tex)*. https://github.com/lukas-blecher/LaTeX-OCR — Verified: production ViT image-of-formula → LaTeX system.
25. Mathpix — *Handwriting Recognition / OCR API*. https://mathpix.com/handwriting-recognition , https://mathpix.com/ocr , https://mathpix.com — Verified: leading commercial math OCR (handwritten/printed equations → LaTeX); industry confirmation of the workflow.
26. Wikipedia — *Long division*. https://en.wikipedia.org/wiki/Long_division ; Tutorax — *Long Division: how to show division*. https://tutorax.com/blogue/en/long-division-how-to-show-division — Verified: English tableau: dividend inside/right, divisor left, quotient on top.
27. MathCentral — *The horizontal fraction bar*. http://mathcentral.uregina.ca/qq/database/qq.09.03/kashia1.html ; Workybooks — *Fraction Bar*. https://www.workybooks.com/resources/math-vocabulary/fraction-bar — Verified: fraction bar = vinculum; numerator above, denominator below; represents division.
28. Math StackExchange — *Does the radical sign need the vinculum line?* https://math.stackexchange.com/questions/2229344/does-the-radical-sign-need-the-horizontal-vinculum-line-for-an-expression-with — Verified: vinculum defines radical scope; without it √2+x is ambiguous.
29. Wikipedia — *Partial differential*. https://en.wikipedia.org/wiki/Partial_differential ; Mathwords — *Curly d*. https://www.mathwords.com/c/curly_d.htm — Verified: ∂ (U+2202) = stylized cursive d; commonly confused with δ.
30. UseOctree — *Delta Symbol Guide*. https://www.useoctree.com/blog/delta-symbols-math-science-complete-guide — Verified: the d/δ/Δ/∂/∇ family and its distinct meanings.
31. Purplemath — *Multiplication by juxtaposition*. https://www.purplemath.com/modules/orderops3.htm ; Plus Maths — *The PEMDAS Paradox*. https://plus.maths.org/pemdas-paradox ; The Math Doctors — *Implied Multiplication 2*. https://www.themathdoctors.org/implied-multiplication-2-is-there-a-standard — Verified: juxtaposition = implicit multiplication (3y = 3×y) creating a visual unit; its precedence is debated — transcribe structure, never reinterpret precedence.
32. Kedmathic — *Handwriting Recognition for Math*. https://kedmathic.co.il/en/blog/handwriting-recognition-math.html — Verified: summation stacks limits above and below the sigma; math uses hundreds of specialized symbols.
33. UEB Math — *Signs of Comparison*. https://uebmath.aphtech.org/lesson8.1 — Verified: ≈ is two parallel wavy lines (double tilde).
34. *Grading Handwritten Engineering Exams with Multimodal LLMs* (2026). https://arxiv.org/html/2601.00730v1 — Verified: real workflows OCR handwritten exam work with multimodal models (the use case of this article).
35. IAPR TC11 — *CROHME*. http://www.iapr-tc11.org/mediawiki/index.php/CROHME:_Competition_on_Recognition_of_Online_Handwritten_Mathematical_Expressions — Verified: difficulty depends on symbol count, allowed layouts, grammar; 10,000+ expression corpus.
36. Writing StackExchange — *Best way to write z and 2*. https://writing.stackexchange.com/questions/72484/whats-the-best-way-to-write-z-and-2-so-they-do-not-get-confused-for-each-other — Verified: 2/z confusion occurs despite height differences; community discriminators.
37. Lu, C. & Mohan — *Recognition of Online Handwritten Mathematical Expressions* (Stanford CS231n). https://cs231n.stanford.edu/reports/2015/pdfs/mohan_lu_cs231n-project-final.pdf — Verified: segmentation + classification pipeline; offline vs online distinction.

Facts marked as uncertain in this article: the share of writers using each digit variant (regional-variation data is partly anecdotal); token counts for specific CROHME editions beyond those quoted from competition reports; "most students box answers" (a convention, not a measured statistic). Treat these as context-dependent guidance, not measured facts.
