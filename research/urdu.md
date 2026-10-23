# MASTER RESEARCH ARTICLE: The Urdu Script, Nastaliq Handwriting, and High-Accuracy Handwritten Urdu OCR

## 1. Role, Expertise, and Objective

Act as a multidisciplinary expert combining the knowledge and working methods of:

- An Urdu language linguist and orthography researcher (tak̲h̲alluṣ: grammar, izafat, verb morphology, loanword strata).
- A Nastaliq paleographer expert in the Perso-Arabic script as written in Pakistan and India — letterforms, ligatures, calligraphic conventions, and their degradation in fast handwriting.
- A handwriting text recognition (HTR) researcher specializing in low-resource, cursive, dot-dense scripts (Urdu HTR is an open research problem; recent surveys attribute the difficulty to cursive joining, complex ligatures, and highly variable character shapes).
- A forensic transcription analyst who separates visible pixel evidence from linguistic inference, and who never allows a plausible word to override ambiguous strokes.

Your objective: transcribe handwritten Urdu notes — written primarily in Nastaliq, sometimes in Naskh-style hands or mixed individual styles — with maximum defensible accuracy, flagging every uncertainty.

**Urdu is NOT Arabic.** Urdu is an Indo-Aryan language written in a modified Perso-Arabic script. Knowledge of Arabic or Persian is only a supporting reference. Urdu adds letters absent from Arabic (ٹ ڈ ڑ ں ے and the aspirate digraphs with ھ), pronounces several Arabic letters differently, retains four distinct letters for /z/ and three for /s/ only as etymological spellings of loanwords, and is written — in Pakistan nearly universally — in the Nastaliq style, whose diagonal, stacked, ligature-rich geometry differs fundamentally from the flat Naskh used for Arabic. Never output Arabic codepoints (ي ه ك) or Arabic spellings for Urdu text; use the Urdu characters (ی ہ ک) throughout.

---

## 2. The Urdu Script: Complete Reference

### 2.1 Overview and letter count

- The Urdu alphabet (اُردُو حُرُوفِ تَہَجِّی, urdū ḥurūf-i tahajjī) is a right-to-left abjad: short vowels are normally not written.
- Authoritative counts differ and should be reported as such: **38 letters** (UNC Urdu Alphabet project), **39 letters** (alphabet standardized in 2004 by Pakistan's National Language Authority, per W3C orthography notes; also the count when hamza ء is included, as in the Zero Zabar reference table), or "up to 39 or 40" (Wikipedia, counting alif-madd ā or tāʼ marbūṭah ۃ as marginal 40th). **The letter inventory itself is stable; only the counting convention varies.**
- Standard dictionary order (verified against the UNC project, Wikipedia's letter table, and the Zero Zabar appendix):

**ا ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن ں و ہ ھ ء ی ے**

- Letters are grouped into **families (series) that share the same base skeleton and differ only in dots or a small stroke**; each series is named after its first letter (be-series, jeem-series, dāl-series, re-series…). This family structure is the foundation of the confusion atlas in §4.
- Urdu has ten vowels and ten nasalized vowels, written with a mixture of letters (ا آ و ی ے ہ) as matres lectionis and optional diacritics.
- **No Urdu word begins with ں, ھ, ڑ, or ے** (commonly stated rule from the Urdu letter tables; useful as a soft constraint, not absolute proof).

### 2.2 Letter-by-letter reference

Conventions: forms are shown as **initial · medial · final · isolated**. "—" = form does not exist (right-joining-only letters have no initial/medial form). Examples are illustrative common vocabulary unless noted as sourced. "Nukta" = dot(s).

#### Alif family

| Letter | Name | Sound | Forms | Joins left? | Confusions | Example |
|---|---|---|---|---|---|---|
| ا | alif | /ɑː/; carries initial short a/i/u; often silent | ا · — · ـا · ا | No | ل (rushed hands); آ | اردو Urdū 'Urdu' |
| آ | alif-madd (الف مدہ) | /ɑː/ (long) | آ · — · ـآ · آ | No | ا + stray mark; م loop | آرام ārām 'rest' |

Handwriting notes: alif is a simple vertical stroke whose height varies with the writer; in Nastaliq it often leans. Word-initial alif is a vowel carrier (اب ab, اسم ism, اردو Urdū); the diacritic that names its short vowel is usually omitted. Alif-madd carries a small tilde-like madd (ٓ) above — check for it before reading a long ā. Words beginning with a vowel always start with alif (or ع in Arabic loans), never with a bare diacritic.

#### Be family (tooth + dots) — the highest-risk family in OCR

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| ب | be | /b/ | none | بـ · ـبـ · ـب · ب | بات bāt 'word' |
| پ | pe | /p/ | 3 below | پـ · ـپـ · ـپ · پ | پانی pānī 'water' |
| ت | te | /t/ (dental) | 2 above | تـ · ـتـ · ـت · ت | تاش tāsh 'cards' |
| ٹ | ṭe | /ʈ/ (retroflex) | small ṭoʼē mark above (not dots) | ٹـ · ـٹـ · ـٹ · ٹ | ٹوٹنا ṭūṭnā 'to break' |
| ث | se (s̱ē) | /s/ | 3 above | ثـ · ـثـ · ـث · ث | Arabic loans only, e.g. تفصیل tafseel 'detail' |

Handwriting notes: all five share one tooth. In fast writing the 3 dots of پ may fuse into a short bar or arc below; the 2 dots of ت fuse into a dash; the 3 dots of ث into a dash or triangle above. The retroflex mark of ٹ is a **small ṭoʼē (tiny ط-like loop, drawn down–up–down)** — it can look like a flat sign ♭, a tiny "v", or, when degraded, a single dot or two dots, making ٹ ↔ ت/ث a chronic confusion. ث appears almost only in Arabic loanwords — a dotless-teeth + 3-dots-above reading should be checked against an Arabic etymon before accepting. Medial be-family teeth followed by a re-series letter are often **smoothed out** (تیرا terā, چھتری chhatrī), erasing the tooth boundary.

#### Jeem family (bowl + dots)

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| ج | jeem (jīm) | /d͡ʒ/ | 1 inside/below the bowl | جـ · ـجـ · ـج · ج | جی jī 'yes/heart' |
| چ | che (cē) | /t͡ʃ/ | 3 below (often 2+1) | چـ · ـچـ · ـچ · چ | چاہیئے chāhie 'should' |
| ح | baṛī he (ḥē) | /h/ | none | حـ · ـحـ · ـح · ح | حال hāl 'condition' (sourced) |
| خ | khe (k͟hē) | /x/ | 1 above | خـ · ـخـ · ـخ · خ | خود khud 'self' (sourced) |

Handwriting notes: ح "looks exactly like jeem but without any dot" (Zero Zabar) — a faint or omitted jeem dot turns ج into ح and vice versa; resolve with etymology (ح is essentially restricted to Arabic-derived words: حال، محبت، محل، روح، مسیح). In Nastaliq the ج dot typically sits inside the bowl; if the bowl is closed quickly the dot may be trapped or displaced. چ's three dots below are frequently written as a compact triangle or as 2+1.

#### Dāl family (right-joining only)

| Letter | Name | Sound | Mark | Forms | Example |
|---|---|---|---|---|---|
| د | dāl | /d/ (dental) | none | — · — · ـد · د | مدد madad 'help' (sourced) |
| ڈ | ḍāl | /ɖ/ (retroflex) | small ṭoʼē above | — · — · ـڈ · ڈ | ڈھاکہ Ḍhāka 'Dhaka' (sourced) |
| ذ | zāl (ẕāl) | /z/ | 1 dot above | — · — · ـذ · ذ | Arabic/Persian loans |

Handwriting notes (Nastaliq, from Zero Zabar): dāl should not drop below the line; the independent form folds over itself or at most forms a 90° angle; the **final form clearly rises up before descending**. ڈ is dāl + ṭoʼē mark; when that mark degrades to a dot, ڈ ↔ ذ is unresolvable visually — use etymology (ڈ is Indic/English stratum: ڈر، ڈبل روٹی; ذ is Arabic stratum). د and ڈ never join to the following letter — a gap after them is normal, not a word boundary.

#### Re family (right-joining only)

| Letter | Name | Sound | Mark | Forms | Example |
|---|---|---|---|---|---|
| ر | re | /r~ɾ/ | none | — · — · ـر · ر | درد dard 'pain' (sourced) |
| ڑ | ṛe | /ɽ/ (retroflex flap) | small ṭoʼē above | — · — · ـڑ · ڑ | پڑھنا paṛhnā 'to read' (sourced) |
| ز | ze | /z/ | 1 dot above | — · — · ـز · ز | زید Zaid (name) |
| ژ | zhe (zhē) | /ʒ/ | 3 dots above | — · — · ـژ · ژ | ژالہ zhāla 'hail' (Persian stratum) |

Handwriting notes: independent re = a downward line curving left; **final re drops sharply to the lower left without rising** (unlike final dāl, which rises first — the single most reliable د/ر discriminator in Nastaliq). The ز dot is frequently displaced toward the previous letter, merged with its dots, or lost to ink fade — ر/ز is among the most common Urdu OCR errors. ڑ never begins a word. Sequence-level trap: adjacent letters can create or destroy readings — ایکٹر aikṭar 'actor' (ک+ٹ+ر) vs ایکڑ ekaṛ 'acre' (ک+ڑ) look nearly identical (Zero Zabar); likewise ز can masquerade as ن+ر.

#### Sīn family

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| س | sīn | /s/ | none | سـ · ـسـ · ـس · س | سال sāl 'year' (sourced) |
| ش | shīn | /ʃ/ | 3 above (pyramid: two below, one nestled on top) | شـ · ـشـ · ـش · ش | شادی shādī 'wedding' (sourced) |

Handwriting notes: sīn has **three teeth, smaller and closer together than be-series teeth**; final/isolated forms add a bowl like lām's. Crucially, sīn in handwriting is **often written toothless, as one long gentle curve** (common when two sīns adjoin, e.g. سستا sastā 'cheap') — do not mistake a smooth stroke for an elongated connector or vice versa; calligraphers disambiguate a stretched/kashida stroke from a toothless sīn by writing a **small sīn glyph above or below the line** (Zero Zabar). ش's three dots are centered above the letter; fused, they look like a bar — compare with ث (3 dots above a tooth) and ش's longer base.

#### Swād, Zwād, Ṭoʼē, Zoʼē (loop letters; Arabic stratum)

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| ص | swād (ṣwād) | /s/ | none | صـ · ـصـ · ـص · ص | صبح subah 'morning' |
| ض | zwād (ẓwād) | /z/ | 1 above | ضـ · ـضـ · ـض · ض | Arabic loans |
| ط | toʼē (t̤oʼē) | /t/ (dental in Urdu) | none | طـ · ـطـ · ـط · ط | طالبِ علم ṭālib-e-ʿilm 'student' (sourced) |
| ظ | zoʼē (z̤oʼē) | /z/ | 1 above | ظـ · ـظـ · ـظ · ظ | Arabic loans |

Handwriting notes: ص/ض have a closed loop head with a long flat tail; ط/ظ have a loop with a distinctive upright/m-shaped stroke. In hurried writing the tails shorten, so ص can resemble س's bowl or even ط. These four occur almost exclusively in Arabic-derived words (Urdu pronounces them as ordinary s/z/t — the letter choice is purely etymological spelling). Remember also that the **miniature toʼē shape is the mark used above ٹ, ڈ, ڑ** — a "tiny ط" above a tooth/dāl/re is a retroflex marker, not the letter ط itself.

#### ʿAin family

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| ع | ʿain | silent or vowel-supporting /ʔ~ʕ/ | none | عـ · ـعـ · ـع · ع | علم ʿilm 'knowledge'; عادت ʿādat 'habit' (sourced) |
| غ | ghain (ġhain) | /ɣ/ | 1 above | غـ · ـغـ · ـغ · غ | Arabic/Persian loans |

Handwriting notes: ʿain looks like an open "c" (initial/medial) or a hooked bowl (final). In Urdu, ع is frequently **not pronounced** — it supports vowels (عرب ʿarab vs ارب arab 'crores', homophone-distinguishing) or lengthens them (بعد bād, شعر sher, شعلہ shola — sourced from W3C notes). Writers often shrink it or merge it into the preceding stroke; a faint "c" between vowels is usually ع. غ = ع + one dot above.

#### Fe family

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| ف | fe | /f/ | 1 above | فـ · ـفـ · ـف · ف | فیصلہ faisla 'decision' (sourced) |
| ق | qāf | /q/ | 2 above | قـ · ـقـ · ـق · ق | فرق farq 'difference' (sourced) |

Handwriting notes: fe's head is a rounded loop **above** the line (always looped in handwriting; may be solid in calligraphy/print); its final tail is more curved than kāf's but shallower than nūn's bowl. Qāf's final/independent bowl is **deeper and more rounded** than fe's. Missing one of qāf's two dots yields ف — check vocabulary. Per Zero Zabar, fe is specifically confusable with **م** (mīm: no dot, drawn counterclockwise and below the line, while fe is clockwise and above) and with **ض** (zwād: elongated with a tooth; fe is rounder, no tooth).

#### Kāf family

| Letter | Name | Sound | Mark | Forms | Example |
|---|---|---|---|---|---|
| ک | kāf | /k/ | none | کـ · ـکـ · ـک · ک | دلچسپی dilchaspi 'interest' (sourced) |
| گ | gāf | /ɡ/ | short slanted stroke (bahī) above | گـ · ـگـ · ـگ · گ | گاڑی gāṛī 'vehicle' |

Handwriting notes: ک + ا forms the special ligature shape کا (W3C notes). The gāf stroke above ک is a diagonal line, not a dot; in rushed hands it shrinks to a tick and can be missed (→ ک) or exaggerated. In Nastaliq the initial/medial kāf is a large angular zigzag; the isolated/final ک sweeps down-left into a hook. Distinguish a short isolated ک from ل by height and by lām's round bottom bowl.

#### Single-skeleton letters: lām, mīm

- **ل lām** /l/ — tall upright stroke with a bowl below the baseline in final/isolated position; joins both sides (لـ · ـلـ · ـل · ل). لـ + ا produces the mandatory ligature **لا**. In fast writing a short alif and a lam can be confused — check for the small head/hook and greater height of lām. Examples (sourced): لہسن 'garlic', بول 'speech', دودھ والا 'milkman'.
- **م mīm** /m/ — small counterclockwise loop drawn **below** the main line; joins both sides (مـ · ـمـ · ـم · م). In Nastaliq, a word-final mīm conventionally **starts above the baseline** even though nothing follows (W3C notes, e.g. اسلام). Confusable with fe (see above) — fe has the dot and sits above the line. Examples: محبت 'love', محنت 'labor', تمھیں 'you (oblique)'.

#### Nūn and nūn-e ghunna

| Letter | Name | Sound | Dot | Forms | Example |
|---|---|---|---|---|---|
| ن | nūn | /n/ (+ retroflex /ɳ/, /ŋ/ allophones) | 1 above | نـ · ـنـ · ـن · ن | نانی nānī 'grandmother' (sourced) |
| ں | nūn-e ghunna (nūn ghunna) | nasalization ◌̃ (no /n/ sound) | **none** | — · ـںـ · ـں · ں | میں, نہیں, ہیں, کریں (all sourced) |

Handwriting notes: initial/medial ن is a be-series tooth with one dot above; final/isolated ن is a bowl below the baseline with its dot near the baseline itself. **Final ں is exactly that bowl without the dot** — the single most important word-final distinction in Urdu (مکان 'building' with ن vs مکاں 'dwelling' with ں; کریں 'would do' vs کرین). Initial/medial ں is written identically to ن (occasionally marked with a sukūn or small semicircle; the diacritic U+0658 "ghunna/ulta jazm" exists but is rare). Because suffixes are written in full even when they double a consonant (بننا bannā 'to become', سننا sunnā 'to hear'), **double ن is normal and must not be "corrected"**. A final/independent ں can appear mid-word where a suffix boundary intervenes: کیوں کہ kyoñki 'because'; and the future suffix گا/گے/گی is written as a **separate word** after a final ں: چلیں گے, میں چلوں گی (sourced).

#### Wāw

- **و wāw** — /ʋ~v~w/, /uː/, /ʊ/, /oː/, /ɔː/; right-joining only (— · — · ـو · و). In handwriting the head is a **loop** (solid and thick in calligraphy/print) — a rounder, thicker head than dāl's angle. Example words (sourced): وہ 'that/those', بول 'speech', اردو, تو 'so/you'. As a consonant it appears word-initially (وہ) or between vowels (دیوار 'wall'); as a vowel it appears medially/finally (بھول 'mistake'). A bare initial و read as "o" = the Persian conjunction 'and' in set phrases (آب و ہوا 'environment', در و دیوار 'surroundings' — sourced). **Silent wāw** occurs after خ in Persian loans (خود khud, خواب khāb — sourced). و vs د vs ر final confusion: check head shape (loop vs fold vs plain drop).

#### The two hes and the hamza system

| Letter | Name | Use | Forms | Example |
|---|---|---|---|---|
| ہ | chhoṭī he / gol he | /h/; final /ɑː~eː/ in Arabic/Persian loans | ہـ · ـہـ · ـہ · ہ | یہ ye 'this'; رہنا rehnā 'to stay' |
| ھ | do-chashmī he | aspiration marker (digraphs); never word-initial in native words | ھـ · ـھـ · ـھ · ھ | بھی bhī 'also' |
| ء / ٔ / ئ / ؤ / ۂ / ۓ | hamza family | vowel hiatus, izafat | context-dependent | کوئی 'someone'; آؤ 'come!' |

Handwriting notes (Zero Zabar, detailed): chhoṭī he's forms differ more from each other than any other letter — **initial/medial dip down into a small divot with a mark like a number 6 below (occasionally omitted in medial form); isolated form is an oval/teardrop; final form is a small curve or squiggle going up then down**. Do-chashmī he ("two-eyed he") is written as a loop (as in Naskh) and in medial position is **visually identical to the Arabic letter ه (U+0647)** — an encoding trap for output (always emit U+06BE for ھ, U+06C1 for ہ). ہ and ھ are to a degree interchangeable after nasals: منھ/منہ muñh 'mouth', تمھارا/تمہارا 'your', انھیں/انہیں 'to them' — preserve the writer's choice. Word-final ہ in Arabic/Persian loans is pronounced /ɑː/ (مکہ Makka) or /eː/; at the end of native words it is /h/. Final ہ + izafat = ۂ (U+06C2).

**Hamza mechanics (W3C + Wikipedia):** hamza separates adjacent vowels. Word-medially it sits "on a chair" as ئ before ی/ے (کئی kaī 'some', کوئی koī, گئے ga'e 'went', گائے gā'e 'sang', تیئیس 'twenty-three', لائن 'line', کوئلہ 'koel'), or on و as ؤ for u/o hiatus (آؤ āo 'come', جاؤں jāũñ 'I may go'); often it is simply omitted in iː-a/o sequences (لڑکیاں, چلیے). Isolated ء appears in e.g. انشاءاللہ. Izafat spellings: **ِ** zer (usually unwritten) after consonants (شیرِ پنجاب, طالبِ علم, براہِ راست); **ۂ** after silent ہ (قطرۂ آب, درجۂ حرارت); **ئ** after ی/ے (آزادئ مذہب); **ئے** after ا/و (صدائے بلند, روئے زمین). **Critical handwriting fact: in Nastaliq the hamza glyph closely resembles two dots above** — exactly the dot pattern of ت and ق (Wikipedia) — so a "two dots" reading near a vowel boundary must consider hamza. Hamza can also render like a small initial-ʿain or an italic "s" depending on the writer's style (W3C).

#### The two yes

| Letter | Name | Sound | Dots | Forms | Example |
|---|---|---|---|---|---|
| ی | chhoṭī ye | /j/, /iː/ (final), /eː~ɛː~ɪ/ (medial with diacritics) | 2 below — **initial/medial only** | یـ · ـیـ · ـی · ی | یا yā 'or'; پیالہ pyāla 'cup' |
| ے | baṛī ye | /eː/, /ɛː/ | none; final-only letter | — · — · ـے · ے | بے be 'without'; ہے hai 'is' |

Handwriting notes — **this is the most important word-final shape rule in Urdu**: in initial/medial position, ye is a be-series tooth with two dots below; in final/isolated position, chhoṭī ye is an **S-shaped curve without dots**, while baṛī ye **folds backward underneath the preceding letters** in a deep returning bowl (Zero Zabar). Word-final ی vs ے is decided by **stroke geometry, never by looking for dots**. Baṛī ye never begins a word. Dots belonging to *other* letters may be displaced above or below a baṛī ye depending on available space (اچّھے achchhe 'good' — sourced). A final ye with zer = ī (میل mīl 'mile'); with zabar = ai (مَیلا mailā 'dirty'); undiacritized میلہ melā 'fair' — diacritics usually omitted, so use vocabulary. Note also ی + madd (یٰ, alif maqsūra) in a few Arabic words: اعلیٰ, دعویٰ.

### 2.3 Aspirate digraphs (do-chashmī he series)

Urdu writes aspiration as a digraph: base letter + ھ. Core set (Wikipedia letter table, with sourced examples):

**بھ** bh (بھاری 'heavy') · **پھ** ph (پھول 'flower') · **تھ** th (تھیلا 'bag') · **ٹھ** ṭh (ٹھنڈا 'cold') · **جھ** jh (جھاڑی 'thicket') · **چھ** chh (چھتری 'umbrella') · **دھ** dh (دھوبی 'washerman') · **ڈھ** ḍh (ڈھول 'drum') · **رھ** rh (تیرھواں 'thirteenth') · **ڑھ** ṛh (اڑھائی) · **کھ** kh (کھانسی 'cough') · **گھ** gh (گھوڑا 'horse') · **لھ** lh (دولھا 'groom', variant of دُلہا) · **مھ** mh (تمھیں 'you') · **نھ** nh (ننھا 'little one')

The W3C orthography notes additionally count **وھ** and **یھ** in a total of 18 digraphs (the count varies 15–18 by source — context-dependent). The digraph is a *single consonant phonologically* but two *written* letters; the ھ may be squeezed into a tiny loop in fast writing or, conversely, written large. Frequent misspellings/confusions: بھ vs بھی vs به (Arabic ه); کھ vs ک; گھ vs گ; and digraph vs sequence readings in words like دلھ/دلہا.

### 2.4 Nuqta (dot) logic — the master table

| Mark | Letters |
|---|---|
| 1 dot below | ج (inside/below the bowl in Nastaliq) |
| 2 dots below | ی (initial/medial positions only) |
| 3 dots below | پ، چ |
| 1 dot above | خ، ذ، ز، ض، ظ، غ، ف، ن |
| 2 dots above | ت، ق |
| 3 dots above (pyramid: two below, one on top) | ث، ش، ژ |
| Small ṭoʼē mark above (a mini ط loop, not dots) | ٹ، ڈ، ڑ |
| No mark | ا، ب، ح، د، ر، س، ص، ط، ع، ک، ل، م، ں، و، ہ، ھ، ے |

**Dot position is measured relative to the letter's own tooth/bowl, and in Nastaliq dots migrate**: fonts and calligraphers move dots vertically to avoid collisions — the yeh dots in تصدیق shift under the following qāf; dots stack vertically in دلچسپی; diacritics before baṛī ye render below it (all documented in the W3C notes). In handwriting, count dots conservatively: a faded dot, a paper speck, a bleed-through spot, or a compressed dash may represent 1–3 dots.

### 2.5 Diacritics (usually omitted)

| Mark | Name | Value | Notes |
|---|---|---|---|
| ـَ | zabar (fatḥah) | /ə~a/ | written above; omitted in normal text |
| ـِ | zer (kasrah) | /ɪ~i/ | below; also signals izafat |
| ـُ | pesh (dammah) | /ʊ~u/ | above |
| ـٗ | ulta pesh (U+0657) | ū/o marker | rare; emphasizes و as /uː~oː/ (ہندو) |
| ـْ | jazm / sukūn | no vowel (cluster) | shapes vary: small circle, pesh-like stroke, or inverted-v/circumflex (Nastaliq default per Noto Nastaliq Urdu with Urdu language tagging) |
| ـّ | tashdīd (shaddah) | gemination | verbs excepted: suffixes double letters in full (بننا) |
| ـً | do zabar (tanvīn) | /-an/ | Arabic adverbs: یقیناً, مثلاً |
| ـٰ | khari zabar (dagger alif) | /ɑː/ | Arabic loans: اعلیٰ, دعویٰ (as یٰ) |
| ٘ | ghunna (U+0658) | nasalization marker over medial ن | rare; dictionary convention |
| ٓ | madd (on alif) | /ɑː/ | distinguishes آ from ا |

Ordinary handwritten Urdu omits all of these except that writers *do* usually distinguish آ (madd) from ا, and hamza over baṛī ye/gol he/wāw is normally written (Wikipedia). Diacritics appearing in handwriting are often partial, decorative, or wrong — transcribe them if asked, but never use their absence as evidence of a consonant cluster.

### 2.6 Numerals and punctuation

- Urdu uses **Extended Arabic-Indic digits ۰۱۲۳۴۵۶۷۸۹** (U+06F0–06F9), read and written left-to-right inside RTL text. Urdu digit shapes differ from Arabic ones for ۴،۵،۷ and from Persian for ۴،۶،۷ (W3C). ۲ resembles a 2 rotated 90° (Zero Zabar). Handwritten ۴،۶،۷ are heavily style-dependent.
- Punctuation: Arabic comma **،**, full stop **۔** (like an inverted ۹ or small circle), semicolon **؛**, question mark **؟**, plus ASCII ! ( ) : . Poetry marks: ؎ (verse start), ؏ (misra marker). Dates: ہجری abbreviation ھ, عیسوی abbreviation ء, date separator ؍.

---

## 3. Cursive Mechanics of Urdu Handwriting

### 3.1 Direction and flow

Urdu runs right-to-left in horizontal lines; each word starts at its right edge; embedded digits and Latin text run left-to-right (bidirectional text). Reading order on a page: top line first, rightmost word first. In handwriting, pen movement within a ligature cascades down-left; word-final strokes often sweep below the following (lower-left) words.

### 3.2 The Nastaliq diagonal cascade — the defining feature

- In Nastaliq, **each word cascades down from the upper right to the lower left** (UNC Urdu Alphabet project); letters do not sit on a flat baseline but descend along a strong diagonal.
- Nastaliq is written such that the **last character of each ligature rests on the (horizontal) baseline** while earlier characters stack above it (published Nastaliq/Naskh font metrics studies); the visual result is a "hanging" diagonal word with the base at the left end.
- **Sloping sequences overlap**: adjacent words' baselines can overlap vertically (W3C notes, with font examples); the style needs **generous line height** (Google Fonts engineering blog), and lines of running text interleave vertically far more than in Latin or Naskh.
- Words are **horizontally compact** (Nastaliq consumes less horizontal space than Naskh — OCR literature), so inter-word gaps are small and word-boundary cues are weaker.
- Consequences for OCR (all documented in the Urdu OCR literature): text lines have **no fixed baseline**, characters and ligatures **overlap**, line segmentation suffers from **ligature touching and inter-line overlap**, and character shapes are **context-sensitive** (the same letter takes different shapes depending on neighbors). Nastaliq employs a very large ligature inventory (the Nastaliq calligraphic tradition uses on the order of 20,000 ligatures; even non-decorative Nastaliq uses more than the standard four positional forms per letter).

### 3.3 Ligatures and stacking

- Mandatory ligature: **لا** (lām + alif). Common special shapes: **کا** (kāf + alif). Sequences like ٹھ، کر، بر، لہ frequently fuse into single gestures.
- Vertical stacking: multi-part ligatures in Nastaliq are arranged **vertically as well as horizontally** — e.g. دلچسپی 'interest' renders as a highly vertical arrangement with dots stacked together (W3C, Nafees Nastaleeq example). Do not interpret a vertically stacked component as two lines or as a diacritic.
- **Dot displacement**: dots move to avoid collisions — the two yeh dots in تصدیق shift under the following qāf; diacritics of letters before baṛī ye render below it; the two dots of a yeh and an initial heh can separate from their base glyphs (چاہیئے). In handwriting this is worse: dots drift leftward (following the writing direction), merge into dashes, pile into dot-clusters, or vanish.

### 3.4 Kasheeda (elongation)

Kasheeda (کشیدہ, "pulled") is the elongation of a letter's connecting stroke, traditionally used to justify lines (instead of adjusting spaces) and for ornament (Zero Zabar glossary; Wikipedia "Kashida"). In handwriting it appears in titles, headings, and decorative lines. OCR implications: (1) a stretched stroke is **not** a toothless س or a ل; (2) calligraphers disambiguate by writing a **small sīn above/below** a kashida-stretched sīn; (3) digital Nastaliq fonts largely ignore the tatweel character U+0640, so a kashida in handwriting has no single Unicode representation — transcribe the letters, not the stretch.

### 3.5 Register and style variation

- **School handwriting / primers**: careful Nastaliq with full dots, wide spacing, often larger letterforms; letters near their canonical shapes.
- **Adult fast notes**: simplified Nastaliq — teeth smoothed, dots fused or omitted, sīn toothless, final ye abbreviated, ھ reduced to a tick, words run together; mixed with Naskh habits (e.g., final re written with an upward hook, which in canonical Nastaliq it should not have — Zero Zabar notes the Naskh/Nastaliq difference for re/dāl).
- **Literary/manuscript styles**: classical Nastaliq and its cursive descendant **Shikaste** (dense, heavily ligated, broken forms) — if encountered, treat as a separate recognition problem and flag it.
- **Digital-era hands**: many writers' hands are now influenced by Naskh fonts on phones/computers (the "War of Fonts" phenomenon — Naskh dominates digital text while Nastaliq dominates print/handwriting). Expect hybrid forms: Naskh-like re/dāl with Nastaliq stacking.
- Handwriting lacks a uniform style even among fluent writers (noted in the Urdu HTR literature, e.g. the PLOS ONE 2024 transformer study); build a per-writer profile (§6, Stage D).

### 3.6 Naskh vs Nastaliq — quick discriminator

| Feature | Nastaliq (Urdu standard) | Naskh (Arabic standard; digital) |
|---|---|---|
| Baseline | Strongly sloping diagonal per word; hanging | Horizontal |
| Word shape | Compact, stacked, vertical components | Wide, flat |
| Line height | Large; lines interleave | Compact |
| re/dāl finals | final د rises then falls; final ر drops without rising | final ر rises; د folds sharply |
| ہ | gol he: divot + "6"-shaped mark; final squiggle | plain loop ه-style |
| Letters per form | More than four contextual forms common | Four standard forms |

---

## 4. Visual Confusion Atlas

For each group: distinguishing features → how confusion arises in cursive → resolution strategy → example words. **Visual evidence is primary; language is the tiebreaker.**

1. **ب / پ / ت / ٹ / ث (+ ن initial/medial)** — one tooth, six readings. Features: dot count (0/3 below/2 above/ṭoʼē/3 above/1 above). Arises: dot fusion into dashes; ṭoʼē degrading to 1–2 dots; displacement toward adjacent letters. Resolve: zoom to count dots individually; check position above vs below; apply etymology (ث = Arabic stratum; ٹ = Indic/English stratum); check vocabulary. Examples: تین 'three' vs ٹین 'tin'; تال 'rhythm/lock' vs ٹال 'to defer'.
2. **ج / چ / ح / خ** — one bowl. Features: dot inside/below (ج), 3 below (چ), none (ح), 1 above (خ). Arises: closed bowls trap dots; ح/ج confusion when dot faint; خ's dot merging with previous letter's dots. Resolve: etymology (ح خ almost only in Arabic/Persian loans; چ is native stratum); word-initial ح is rare outside Arabic loans. Examples: حال 'condition' vs جال 'net'; خواب 'dream' vs جواب 'answer'.
3. **د / ڈ / ذ** — right-joining shoulder. Features: ڈ has ṭoʼē above; ذ has single dot above. Arises: ṭoʼē degrades to a dot → ڈ/ذ visually identical; both then differ from د only by a mark. Resolve: stratum (ڈ Indic/English; ذ Arabic). Examples: دروازہ 'door' vs ڈر 'fear'; ذرا 'a little'.
4. **ر / ڑ / ز / ژ (+ و، د cross-family)** — the descending stroke. Features: none / ṭoʼē / 1 dot / 3 dots; و has a looped head; د has an angular fold (and in final Nastaliq, rises first). Arises: dot loss (ر↔ز — the most frequent single error); dot drift into previous letter; و's loop written open → looks like ر. Resolve: dot evidence first; then phonotactics (ڑ never word-initial; ژ only in Persian stratum); check if the stroke has a head-loop (و) or fold (د). Examples: بار 'load/time' (ر) vs باز 'falcon/again' (ز); درد 'pain' vs دزد 'thief' (two re-series letters, dots decide).
5. **س / ش (and the toothless-sīn trap)** — Features: ش = 3 pyramid dots above. Arises: toothless sīn variant (a smooth curve) in fast hands; shīn's dots fusing to a bar; a kashida-elongated stroke mimicking a toothless س. Resolve: check for the calligrapher's miniature-sīn marker; count dots (bar vs 3 separate); look at word length and vocabulary. Examples: سستا 'cheap' (one toothed + one toothless sīn); سال vs شال.
6. **ص / ض / ط / ظ** — loop letters, Arabic stratum only. Features: ص/ض loop + long flat tail; ض/ظ one dot above; ط/ظ loop + upright stroke. Arises: tail shortening makes ص→س-like or ط-like; dot loss ض↔ص, ظ↔ط. Resolve: etymology; check tail length and loop shape; these letters never appear in native Indic words. Examples: صبح 'morning'; طالب 'student'; ضرب 'strike'; ظلم 'cruelty'.
7. **ع / غ** — open "c". Features: غ has one dot above. Arises: ع often silent → writers shrink it; غ's dot merging with previous letter's marks. Resolve: vowel hiatus patterns (ع between vowels); loanword etymology. Examples: علم 'knowledge' vs غم 'grief'; عادت 'habit'.
8. **ف / ق / م (+ ض)** — the looped-head triangle. Features: ف 1 dot, ق 2 dots, م no dot; م drawn counterclockwise **below** the line; ف/ق heads sit **above** the line; qāf's final bowl is deeper/rounder than fe's; ض is elongated with a tooth. Arises: missing one qāf dot → ف; م's loop mistaken for fe's head; final ف/ق bowls confused with ن's bowl (ن has a dot near the baseline). Resolve: head position relative to line; bowl depth; dot count; vocabulary. Examples: فال 'omen' (ف) vs قال 'he said' (ق); فرق farq 'difference'; مکہ 'Mecca' (م, no dot, head below the line).
9. **ک / گ** — Features: گ has a short diagonal stroke above. Arises: stroke shrinks to a tick, missed → ک. Resolve: look for any upward tick above the kāf head; vocabulary (both letters common in all strata). Examples: کام 'work' vs گام 'step'.
10. **ن / ں (final)** — bowl with vs without dot. Arises: final ن's dot is small and near the baseline; ink fade kills it. Resolve: hunt for the dot; then grammar (final ں is a nasalization suffix on verbs/plurals; final ن is a consonant). Examples: مکان 'building' (ن) vs مکاں 'dwelling' (ں); the frequent function words میں، نہیں، ہیں، کریں all end in ں.
11. **ہ / ھ / ه / ھ-ی finals** — Features: ہ's forms are highly irregular (divot + "6" mark; teardrop; final up-down squiggle); ھ is a loop, identical medially to Arabic ه. Arises: medial ہ vs ھ is often genuinely undecidable in handwriting (they interchange after nasals: منھ/منہ); final ھ loop vs ہ squiggle; final ہ read as the vowel /eː/ (ہے) vs consonant. Resolve: aspiration phonology (does the word have an aspirated consonant?); interchangeability means either spelling may be the writer's choice — transcribe the visible form. Examples: کہنا 'to say' (ہ) vs کھانا 'to eat' (کھ digraph — one ھ changes everything); منھ/منہ 'mouth' (either spelling valid).
12. **ی / ے / ں finals (and ۂ)** — Final-position quadrilateral. Features: ی = S-curve, dotless; ے = folded-back returning bowl, dotless; ں = bowl without dot; ۂ = ہ-squiggle with hamza above. Arises: abbreviated final strokes; S-curve closed into a loop → looks like ے; displaced dots near the ye. Resolve: trace the terminal stroke direction (S-descent vs fold-back-under); grammar (ی = ī or the ہے/کے/کی function words use ے/ی distinctly: کی fem. vs کے masc.); izafat context for ۂ. Examples: کی 'of (fem.)' vs کے 'of (masc.)'; بھی bhī 'also' vs بھے bhe 'fearless (poetic)'; ملکۂ 'queen of' (ۂ).
13. **Hamza vs two dots** — In Nastaliq the hamza glyph resembles two dots above (the pattern of ت/ق). Near a vowel boundary or word-end, "two dots" may be ء/ٔ/ئ. Examples: کوئی 'someone' (ئ = chair + hamza, dotless chair); تیئیس '23'.
14. **Sequence-level confusions** — (a) ٹ + ر vs ڑ: ایکٹر 'actor' vs ایکڑ 'acre'; (b) ن + ر vs ز; (c) tooth-smoothing before ر-series: تیرا، چھتری lose tooth boundaries; (d) لا ligature vs independent ل + ا; (e) ھ after ن/م merging into the bowl (تمھیں); (f) double-letter suffixes (بننا، سننا، جیتتا) — do not delete the "extra" letter.
15. **Encoding-level confusables (for output, not vision)** — ی (U+06CC) vs Arabic ي (U+064A); ہ (U+06C1) vs ه (U+0647) vs ھ (U+06BE); ک (U+06A9) vs ك (U+0643); ۂ (U+06C2) vs ۀ (U+06C0). Emitting the Arabic look-alikes corrupts searchability (documented with Shakespear's dictionary 'بهارت/بھارت' example). Always output Urdu codepoints.

---

## 5. Reading and Spelling Rules (Linguistic Support for OCR)

Urdu is Subject-Object-Verb, postpositional, and heavily suffixing. The following patterns are high-value for disambiguation **after** visual analysis.

### 5.1 Verb morphology

- Infinitive: stem + **نا** (karnā 'to do', honā 'to be', likhnā 'to write', paṛhnā 'to read'). Suffixes are written in full even when they create doubled consonants: **بننا bannā, سننا sunnā, جیتتا jīttā** — never "correct" these.
- Habitual present: stem + **تا/تی/تے/تیں** + **ہے/ہو/ہیں/ہوں** (وہ سکول جاتا ہے 'he goes to school'; وہ سکول جاتا تھا 'he used to go').
- Future: stem + **گا/گے/گی/گیں**, written as a separate word after final ں: **چلیں گے، بلیاں چلیں گی، میں چلوں گی**.
- Perfect/ergative: transitive subjects take **نے**; the verb agrees with the object (انھوں نے 'they (erg.)').
- Common verb endings to expect word-finally: **نا، تا، تی، تے، یا، ہے، ہیں، ہوں، گا، گے، گی، وں**.

### 5.2 Nouns and plurals

- Masculine plural: **ے** (لڑکے 'boys'); oblique/plural postposition form **وں** (لڑکوں کا).
- Feminine plural: **یاں** (لڑکیاں 'girls', بلیاں 'cats'; oblique لڑکیوں کا).
- Nasal-final plurals/verbs use ں (بہنیں 'sisters', کریں).

### 5.3 Particles and high-frequency words

Function words (task-verified frequency list; CLE Pakistan publishes a 5,000-word Urdu frequency list as a resource):

ہے 'is' · اور 'and' · کے / کی / کا 'of' · یہ 'this' · کو 'to' · سے 'from/with' · نے (ergative) · لیے 'for' · پر 'on' · ہو 'be' · ہوں 'am/are' · وہ 'that/he' · مگر / لیکن 'but' · ایک 'one' · بھی 'also' · کہ 'that' · تاکہ 'so that' · میں 'in/I' · نہیں 'not' · کیا 'what/did' · تھا/تھی/تھے 'was/were' · ہیں 'are' · ہی 'only' · جو 'which' · یا 'or' · تو 'then' · ہر 'every' · سب 'all' · اب 'now' · پھر 'again'

These short words are disproportionately frequent and disproportionately damaged by dot ambiguities (کے/کی/کا، ہے/ہیں، کو/سے/نے) — treat them as the first place to check dot evidence, and the last place to guess.

### 5.4 Izafat

Connects two nouns ("X of Y"): zer (usually unwritten) after consonants; ۂ after ہ; ئ after ی/ے; ئے after ا/و. Examples: شیرِ پنجاب، طالبِ علم، قطرۂ آب، آزادئ مذہب، صدائے بلند، روئے زمین. In handwriting the izafat mark is usually invisible — infer it only when the construction is certain.

### 5.5 Etymological strata (spelling priors)

- **Indic (native/tatsama)**: retroflexes ٹ ڈ ڑ common; bh/dh aspirates; ے finals common; no ح ص ض ط ظ ع غ except in loans.
- **Persian**: پ چ ژ گ خ غ ث ذ ق; silent و after خ; conjunction و = "o".
- **Arabic**: ح ص ض ط ظ ع غ; tanvīn; dagger alif; ال article with assimilation (السلام، بالکل); 3 letters for /s/ (س ص ث) and 4 for /z/ (ز ض ذ ظ) — the most common letters being س and ز.
- **English**: retroflex ٹ ڈ systematically for t/d (سینٹرل، ریسٹورانٹ، ڈاکٹر); ف/و for f/v; ک/گ/س common.

### 5.6 Word boundaries

- Words are separated by spaces (W3C), but in handwriting spacing is unreliable: short particles (کو، سے، کے، نے، ہے، ہیں) are often attached to the previous word or ambiguously spaced; conversely, the small gap after a right-joining letter (ا د ڈ ذ ر ڑ ز ژ و) inside a word is **not** a word boundary (this is why line-breaking rules ignore such gaps).
- Components that may be spaced or joined: future **گا/گے/گی**; ergative **نے**; **کیوں کہ** (internal ں); reduplications like **کہہ** (from کہنا 'to say') and doubled-letter stems; ہوں/ہیں after چلیں.
- Nastaliq's horizontal compactness makes genuine inter-word gaps small; judge boundaries by syntactic units and ligature cohesion, and mark uncertain boundaries as uncertain.

---

## 6. Specialized OCR Workflow

### Stage A: Image inspection

Assess resolution and sharpness (dot-level detail requires high effective resolution — dots are the script's primary information carrier); lighting, contrast, ink fade, bleed-through (show-through from the reverse side creates phantom dots); rotation, skew, page curvature; paper texture and ruling; whether the hand is Nastaliq, Naskh, hybrid, or calligraphic (§3.6); line height and inter-line overlap (Nastaliq needs large line spacing; overlap is normal, not noise). Preserve the original; enhance copies only; compare enhanced against original.

### Stage B: Layout and line detection

Establish reading order: top-to-bottom, right-to-left; digits/Latin runs read left-to-right. Identify text regions vs diagrams/tables/stamps. **Nastaliq-specific cautions (documented in the Urdu OCR literature):** lines have no fixed baseline and **overlap vertically**; ligatures touch across word boundaries; a word's stacked ligature components must not be split between lines; a deep descender of line N may interleave with ascenders of line N+1 — attribute strokes to the correct line by tracing the diagonal cascade, not by horizontal banding. Detect headings (often kasheeda-stretched), lists, margins, insertions/corrections. Do not merge adjacent lines; do not split one word's vertical stack.

### Stage C: Character-level analysis

Work strictly right-to-left within each word. For each difficult word:

1. Identify the skeleton: tooth/bowl/descender/loop sequence; mark non-joining boundaries (after ا د ڈ ذ ر ڑ ز ژ و the connection breaks — a gap there is structural).
2. Assign positional forms (initial/medial/final/isolated) and remember Nastaliq uses more than four contextual forms.
3. Inventory every dot and mark: count, above/below, pyramid vs row, ṭoʼē vs dots, hamza vs dots; note faded or displaced dots as uncertain evidence.
4. Generate candidate letters per skeleton slot (use the family tables §2.2 and atlas §4).
5. Apply tooth-smoothing awareness (teeth before ر-series vanish) and toothless-sīn/kashida checks.
6. Check joining legality to prune candidates.
7. Produce the candidate word set; check against vocabulary/morphology (§5) only after this.
8. Re-inspect the original image before finalizing.

Do not reverse character order during internal processing; the output must be in logical (reading) order.

### Stage D: Linguistic disambiguation (secondary)

Apply, in order: character-shape compatibility → dot/stroke evidence → positional-form legality → joining behavior → lexical validity → morphology and agreement (gender/number endings; ergative نے) → sentence context → writer's habits elsewhere on the page. A plausible sentence is not proof of a reading; visual evidence outranks fluency.

### Stage E: Independent reassessment

Re-read uncertain regions fresh, without the first transcription. Compare readings; investigate disagreements, especially dot counts, final ye forms, hamza-vs-dots, and word boundaries. If external OCR/HTR tools are available, compare outputs as candidate suggestions only. Do not claim tools were used if they were not.

### Stage F: Confidence and uncertainty

Assign confidence per word/short span, not per page: **High** (shapes + context agree), **Medium** (likely but a visual detail is unresolved), **Low** (multiple readings plausible), **Illegible** (image does not support a defensible reading). Mark:

- `[غیر واضح]` — unreadable span.
- `[لفظ؟]` — tentative reading (give alternatives).
- `[مطموس]` — obscured text (damage, overwriting, bleed-through).

These are editorial annotations, never writer's text. Show alternatives rather than silently choosing.

---

## 7. Required OCR Output

For every page, provide in order:

**A. Diplomatic transcription** — exactly what is visibly written: original wording, spelling, line breaks, abbreviations; no silent corrections; uncertainty markers per §6-F.

**B. Normalized Urdu text** — standardized spacing and paragraphing; spelling corrected only on explicit request, in a separate layer, never overwriting A.

**C. Transliteration** — on request; state the system (ALA-LC is the most accurate standard and is supported by Pakistan's National Language Authority; Hunterian and JUS (Journal of Urdu Studies) alternatives exist — Zero Zabar tabulates all three). Preserve Urdu distinctions (ṭ/ḍ/ṛ vs t/d/r; ḳh/gh vs kh/g; retroflex vs dental).

**D. English translation** — only after the Urdu reading is established; keep separate; mark translations dependent on uncertain readings.

**E. Uncertainty table**

| Location | Visible evidence | Candidate reading(s) | Linguistic evidence | Confidence | Reason for uncertainty |
|---|---|---|---|---|---|

**F. Corrections and alternatives** — literal reading → proposed normalized reading → evidence → confidence. Never make silent corrections.

---

## 8. Quality Control Rules

1. Never invent text to fill gaps; use `[غیر واضح]` instead.
2. Never treat Arabic or Persian vocabulary, spelling, or letterforms as a substitute for Urdu analysis (do not emit ي ه ك; do not "Arabize" spellings; do not apply Persian dotless-final-ye conventions to Urdu text).
3. Never infer a letter from expected meaning alone.
4. Never assume a dot is absent because it is faint — flag it as uncertain evidence.
5. Never assume a dot is present because vocabulary suggests it — a speck, bleed-through, or paper flaw is not a nukta.
6. Never decide final ی vs ے by looking for dots — use stroke geometry.
7. Never "correct" doubled suffix consonants (بننا، سننا، جیتتا) or variant spellings (منھ/منہ، تمھارا/تمہارا).
8. Never merge lines or reorder text without evidence; respect the Nastaliq cascade when attributing strokes to lines.
9. Never treat a small gap after a non-joining letter as a word boundary.
10. Never report accuracy numbers without ground truth; never claim certainty when the image is ambiguous.
11. Preserve the original layer; keep corrections and normalization in separate layers.
12. Distinguish observation (pixels), linguistic inference, and speculation — explicitly.

If the handwriting cannot be reliably read, identify the precise region needing a better image rather than producing plausible text.

---

## 9. References

All URLs below appeared in the web research for this article (searches + page fetches). Each is annotated with what it verified.

**Script reference / alphabet**
1. Urdu Alphabet (UNC, Afroz Taj): https://urdualphabet.unc.edu/introduction/the-alphabet — 38-letter count; family grouping of letters; letter names.
2. Urdu alphabet (Wikipedia): https://en.wikipedia.org/wiki/Urdu_alphabet — letter table with names, forms, IPA, Unicode, order; 39/40 counting variants; aspirate digraph list with examples; hamza-in-Nastaliq "resembles two dots" note; izafat forms; retroflex-mark history (four dots → ṭoʼē); Unicode confusables (ی/ي، ہ/ه، ک/ك).
3. Arabic (Urdu) Nastaliq orthography notes v32 (Richard Ishida, W3C): https://r12a.github.io/scripts/arab/ur.html — NLA-2004 39-letter standard; 18 aspirate digraphs; full joining-forms tables; izafat and hamza encoding rules; nasalization (ں، ن٘); sukūn/jazm shape variants; Nastaliq sloping baselines, overlapping cascades, dot displacement examples (تصدیق، دلچسپی، چاہیئے، ویکیپیڈیا); justification via stretching/repositioning; numerals comparison; punctuation.
4. Zero Zabar: An Urdu Alphabet Workbook (Boyk & Majchrowicz, Northwestern Univ.): https://openbooks.library.northwestern.edu/zerozabar/chapter/the-urdu-alphabet — abjad series structure; full alphabet appendix with names, sounds, abjad values, JUS/LOC transliteration: https://openbooks.library.northwestern.edu/zerozabar/chapter/chhoti-he-do-chashmi-he-chhoti-ye-bari-ye — chhoṭī he form descriptions, do-chashmī he, chhoṭī ye (S-curve final) vs baṛī ye (folded-back final), kashida definition: https://openbooks.library.northwestern.edu/zerozabar/chapter/dal-re-and-waw — dāl/re/wāw handwriting rules (final dāl rises, final re doesn't; wāw looped head; tooth smoothing): https://openbooks.library.northwestern.edu/zerozabar/chapter/sin-shin-bari-he-nun-nun-ghunna/ — toothless sīn variant; shīn dot pyramid; baṛī he = dotless jeem; nūn vs nūn-e ghunna; verb suffix doubling; future گا as separate word; ergative نے: https://openbooks.library.northwestern.edu/zerozabar/chapter/fe-qaf-te-dal-re/ — fe/qāf/ṭe/ḍāl/ṛe forms; fe–mīm–zwād confusions; ایکٹر/ایکڑ proximity trap; English-loan retroflexes: https://openbooks.library.northwestern.edu/zerozabar/chapter/numbers-and-dates — Urdu numerals.
5. MSU Open Textbook Urdu 1.6: https://openbooks.lib.msu.edu/urdu/chapter/1-6 — chhoṭī/baṛī ye and do-chashmī he digraph list (پھ تھ ٹھ …).
6. UNC Introduction: https://urdualphabet.unc.edu/introduction — "each word tends to cascade down from the upper right to the lower left" (Nastaliq).
7. UNC Do-Chashmi Hay: https://urdualphabet.unc.edu/do-chashmi-hay — aspiration function of ھ.
8. Library of Congress Urdu romanization table: https://www.loc.gov/catdir/cpso/roman_urdu_proposal.pdf — initial/medial/final/isolated forms per letter.
9. Baṛī ye (Wikipedia): https://en.wikipedia.org/wiki/Ba%E1%B9%9B%C4%AB_ye — baṛī ye phonemes /eː ɛː/, final/isolated only; ۓ izafat form.
10. Wiktionary ی: https://en.wiktionary.org/wiki/%DB%8C — U+06CC forms and presentation forms.
11. Unicode L2/23-120 (Farsi yeh dot behavior): https://www.unicode.org/L2/L2023/23120-arabic-farsi-yeh.pdf — Unicode annotation "initial and medial forms of this letter have dots" for U+06CC.
12. Urdu Script & Pronunciation (UT Austin): https://urdu.la.utexas.edu/resources/urdu-script-pronunciation — Perso-Arabic base of Urdu.
13. Persian vs Arabic alphabet: https://persianwithel.com/learning-guides/persian-alphabet-vs-arabic — 32 vs 28 letters; Persian additions پ چ ژ گ (context for Urdu's further additions).

**Nastaliq / handwriting mechanics**
14. Nastaliq (Wikipedia): https://en.wikipedia.org/wiki/Nastaliq — ligature inventory on the order of 20,000; Naskh+Ta'liq origin.
15. Noto Nastaliq Urdu (Google Fonts): https://fonts.google.com/noto/specimen/Noto+Nastaliq+Urdu — sloping Nastaliq design.
16. Why are there so few digital Nasta'liq Urdu fonts? (Google Fonts blog): https://fonts.googleblog.com/2023/03/why-are-there-so-few-digital-nastaliq.html — vertical space needs; dot/diacritic collision and displacement engineering.
17. Baseline and Descender lines for Nastaliq and Naskh (ResearchGate figure): https://www.researchgate.net/figure/Baseline-and-Descender-lines-for-Nastaliq-and-Naskh-font-for-Urdu-33_fig17_261478481 — last character of each Nastaliq ligature rests on baseline; diacritics placement.
18. Nasta'liq Palaeography Exercise (Leiden): https://mouse.digitalscholarship.nl/lessons/nastaliq — Nastaliq as Naskh+Ta'liq synthesis; historical forms.
19. Nasta'liq: The Genius of Persian Calligraphy (Smithsonian): https://asia.si.edu/whats-on/exhibitions/nastaliq-the-genius-of-persian-calligraphy — diagonal quatrain layout.
20. War of Fonts (ResearchGate): https://www.researchgate.net/publication/374145351_War_of_Fonts_Analyzing_The_Reasons_Behind_The_Success_of_Arabic_Naskh_Script_And_The_Defeat_of_Urdu's_Nastaliq_In_The_Digital_Age — Naskh dominance on digital devices; hybrid handwriting implications.
21. Kashida (Wikipedia): https://en.wikipedia.org/wiki/Kashida — elongation justification mechanics.
22. Nastaliq vs Naskh for Urdu fonts: https://write-urdu.com/urdu-fonts-nastaliq-vs-naskh — diagonal rhythm; stacked forms need generous line height.
23. From Dakhni Manuscripts to Unicode Nastaʿliq (Medium): https://medium.com/@adnanmasood/from-dakhni-manuscripts-to-unicode-nasta%CA%BFliq-an-illustrated-field-guide-to-urdu-writing-396a5cb5625b — RTL/LTR bidirectional behavior in mixed text.

**Urdu OCR / HTR research**
24. A Survey on Urdu Handwritten Text Recognition (BRAIN, 2025): https://www.brainetwork.org/index.php/jcai/article/view/144 (also https://www.researchgate.net/publication/395861738_A_Survey_on_Urdu_Handwritten_Text_Recognition_State_of_the_Art_Challenges_and_Future_Directions) — challenges: cursive style, complex ligatures, shape diversity.
25. Transformer model for Urdu handwriting (PLOS ONE, 2024): https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0302590 — handwriting lacks uniform style.
26. Urdu Katib historical handwritten dataset (arXiv): https://arxiv.org/html/2606.19139v1 — historical HTR dataset; script challenges and dataset scarcity.
27. NUST-UHWR dataset (NIH dataset catalog): https://datasetcatalog.nlm.nih.gov/dataset?q=0003216459 — unconstrained handwritten Urdu text lines with ground truth.
28. UOHTD (Springer): https://www.springerprofessional.de/en/uohtd-urdu-offline-handwritten-text-dataset/23752772 — 800-sample offline handwritten dataset.
29. PUCIT ICFHR 2020 attention-based Urdu HTR: http://faculty.pucit.edu.pk/nazarkhan/work/urdu_ohtr/ICFHR2020_presentation.pdf — 7,309-line handwritten dataset.
30. Offline Urdu OCR using ligature-based segmentation (Indian J. Sci. Tech.): https://indjst.org/articles/offline-urdu-ocr-using-ligature-based-segmentation-for-nastaliq-script — challenges: compactness, diagonal orientation, context shape sensitivity.
31. Segmentation-Free Nastalique Urdu OCR (WASET): https://publications.waset.org/13019/segmentation-free-nastalique-urdu-ocr — "written diagonally with no fixed baseline; overlap present in characters and ligatures".
32. Issues & Challenges in Urdu OCR (ResearchGate): https://www.researchgate.net/publication/333117928_Issues_Challenges_in_Urdu_OCR — line segmentation problems: ligature touching and overlapping.
33. Choice of recognizable units for Urdu OCR (Academia.edu): https://www.academia.edu/109939938/Choice_of_recognizable_units_for_URDU_OCR — Nastaliq consumes less horizontal space; segmentation difficulty.
34. Segmentation-free OCR for printed Urdu Nastaliq (Springer): https://link.springer.com/article/10.1186/s13640-017-0208-z — ligature-based recognition units.
35. Ligature Segmentation for Urdu OCR (Semantic Scholar): https://www.semanticscholar.org/paper/Ligature-Segmentation-for-Urdu-OCR-Lehal/dcf5f274b89b7a5dea549a9fc7304b28fed75485 — modified header/baseline detection for line segmentation.
36. From Press to Pixels (arXiv 2025): https://arxiv.org/html/2505.13943v2 — end-to-end Urdu newspaper OCR pipeline.
37. UTRNet (arXiv 2023): https://arxiv.org/html/2306.15782v1 — high-resolution Urdu text recognition; UrduDoc benchmark.
38. Large-scale Urdu OCR benchmark dataset (ScienceDirect): https://www.sciencedirect.com/science/article/pii/S2352340926004890 — confusion-weighted evaluation of structurally similar character pairs.
39. Long-Range Spatial Modeling for Handwritten Urdu (Wiley): https://onlinelibrary.wiley.com/doi/full/10.1002/eng2.71015 — fully cursive script difficulty.
40. UPTI 2.0 / MMU-OCR-21 statistics (PLOS figshare): https://plos.figshare.com/articles/dataset/UPTI_2_0_and_MMU-OCR-21_data_statistics_/25849328 — handwritten Urdu word error rates (~19% WER range) for a transformer system.
41. CRULP/CLE Offline Urdu Nastaliq OCR thesis: https://www.cle.org.pk/Publication/theses/2013/danish-thesis.pdf — segmentation stages for Nastaliq OCR.

**Language resources**
42. CLE Linguistic Resources: https://www.cle.org.pk/software/ling_resources — Urdu 5,000 most frequent words list; Urdu verb list; corpora (frequency-word support).
43. Urdu verb conjugation guides: https://www.urdupod101.com/blog/2020/10/05/urdu-conjugations ; https://preply.com/en/blog/urdu-verb-conjugation ; https://en.wikibooks.org/wiki/Urdu/Verbs ; https://taj.oasis.unc.edu/urdu/lesson2/2.3verbinfinitiveandroot.html — infinitive نا; future گا/گے formation.
44. Additional notes on the sounds of Urdu (TPL): https://tplsites.s3.amazonaws.com/resources/URDpk-ENGus/grammar/Additional%20Notes%20on%20the%20Sounds%20of%20Urdu.htm — aspirated consonant inventory and transcription.
45. Eastern Arabic numerals (Wikipedia): https://en.wikipedia.org/wiki/Eastern_Arabic_numerals — numeral variants across Arabic/Persian/Urdu.

*Facts flagged in the text as "context-dependent" (letter-count conventions, exact digraph count, spacing habits in handwriting) reflect genuine source disagreement and should be treated as soft constraints.*

---

## 46. ENGINEERING APPENDIX — MODEL LIMITATION & ENSEMBLE PROTOCOL (measured in this system)

Controlled testing of the production vision model on Urdu Nastaliq (this system's OCR engine) produced a critical, reproducible finding:

- Given a clean 1600×260 px rendered Nastaliq sentence (no noise, no skew, no paper texture), the model returned fluent but **entirely wrong** Urdu — and self-reported confidence "high".
- Binarisation (Otsu), larger zoom, and letter-by-letter decoding prompts did **not** fix it; the model still confused basic letter shapes (صبح→غہ, سورج→مورچہ).
- The same model transcribes Latin handwriting and mathematics reliably; the failure is specific to Nastaliq's diagonal cascade.

**Protocol consequence (enforced in this system's read pass):**
1. Every Nastaliq/Arabic-script band is read **three times** from independent zoom variants (scale 3, scale 4, and a vertically-grown variant).
2. Text that agrees across samples is accepted, but self-reported "high" is **capped to "medium"** — a vision model's fluent Nastaliq reading must never pass unverified on its own word.
3. When the three samples disagree, the line is forced to **"low"** and all rival readings are surfaced as alternatives.

**Editor consequence:** the Verify step is not a formality for Urdu — it is the actual OCR engine. Treat every model reading as a hypothesis to confirm against the crop thumbnail, not as an answer. This matches the published state of the art: the best reported handwritten-Urdu systems still operate near ~19% word error rate (ref. 40), and none are trusted without human adjudication.
