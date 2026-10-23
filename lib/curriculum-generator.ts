import { TranscriptionDocument, SupportedLanguage, TextDirection, SectionBlock, QuestionItem } from "@/types/paper";
import { PAKISTAN_CURRICULUM, CurriculumClass, CurriculumSubject } from "@/config/pakistan-curriculum";
import { InterrogatePayload, buildInterrogateXml } from "@/lib/interrogate-parser";

export interface GenerateCurriculumPaperOptions {
  subjectId: string;
  classId: string;
  boardName?: string;
  termTitle?: string;
  marksPresetId?: string;
  numeralStyle?: "western" | "eastern";
}

type QuestionContent = {
  mcqs: Array<{ q: string; opts: string[] }>;
  shorts: string[];
  longs: string[];
};

type LevelBank = {
  primary?: QuestionContent;
  middle?: QuestionContent;
  secondary?: QuestionContent;
  default: QuestionContent;
};

/**
 * Pre-coded authentic Pakistani curriculum question bank for all 10 subjects
 * Covers Primary (Class 1-5), Middle (Class 6-8), and Secondary (Class 9-10 / SSC)
 */
const SUBJECT_QUESTION_BANKS: Record<string, {
  en?: LevelBank;
  ur?: LevelBank;
  sd?: LevelBank;
}> = {
  physics: {
    en: {
      default: {
        mcqs: [
          { q: "The rate of change of displacement is known as:", opts: ["Speed", "Velocity", "Acceleration", "Distance"] },
          { q: "The SI unit of force is:", opts: ["Joule", "Pascal", "Newton", "Watt"] },
          { q: "Work done is zero when angle between force and displacement is:", opts: ["0 degree", "45 degree", "90 degree", "180 degree"] },
          { q: "The value of 'g' on the surface of earth is approximately:", opts: ["8.8 m/s²", "9.8 m/s²", "10.8 m/s²", "11.2 m/s²"] },
          { q: "Which of the following is a scalar quantity?", opts: ["Velocity", "Displacement", "Speed", "Torque"] },
          { q: "Pascal is the unit of:", opts: ["Density", "Pressure", "Viscosity", "Surface Tension"] },
          { q: "Kinetic energy of a body of mass 'm' moving with velocity 'v' is:", opts: ["m v", "1/2 m v²", "m g h", "1/2 m² v"] },
          { q: "One Horsepower (hp) is equal to:", opts: ["500 Watts", "746 Watts", "1000 Watts", "786 Watts"] },
          { q: "Sound waves are:", opts: ["Transverse waves", "Longitudinal waves", "Electromagnetic waves", "Radio waves"] },
          { q: "The refractive index of water is approximately:", opts: ["1.00", "1.33", "1.52", "2.42"] },
        ],
        shorts: [
          "State Newton's Second Law of Motion and derive F = ma.",
          "Differentiate between mass and weight with appropriate SI units.",
          "Define Pascal's Principle and give two everyday applications.",
          "What is friction? State two methods to reduce friction in machinery.",
          "Define power and write its unit. How is 1 Horsepower related to Watts?",
          "Explain the law of conservation of momentum with an example.",
          "Differentiate between scalar and vector quantities with two examples each.",
          "State Hooke's Law and define Elastic limit.",
        ],
        longs: [
          "Define acceleration. Derive the third equation of motion (2as = vf² - vi²) using graphical or algebraic method.",
          "State the Law of Universal Gravitation. How did Henry Cavendish determine the value of 'G'?",
          "What is Pressure in liquids? Derive the hydrostatic pressure equation P = ρgh.",
          "Explain the principle, construction, and working of a Hydraulic Lift with a neat diagram.",
        ],
      },
    },
  },
  chemistry: {
    en: {
      default: {
        mcqs: [
          { q: "The number of moles in 36 grams of pure water (H2O) is:", opts: ["1", "2", "3", "4"] },
          { q: "Which subatomic particle has negligible mass?", opts: ["Proton", "Neutron", "Electron", "Alpha particle"] },
          { q: "The horizontal rows of the periodic table are called:", opts: ["Groups", "Periods", "Blocks", "Families"] },
          { q: "An ionic bond is formed by:", opts: ["Sharing of electrons", "Transfer of electrons", "Metallic bonding", "Van der Waals forces"] },
          { q: "The pH of a neutral aqueous solution at 25°C is:", opts: ["0", "7", "14", "1"] },
          { q: "Which element has the highest electronegativity?", opts: ["Chlorine", "Fluorine", "Oxygen", "Nitrogen"] },
          { q: "Avogadro's number has the numerical value of:", opts: ["6.02 x 10²³", "6.02 x 10²²", "1.66 x 10⁻²⁴", "3.00 x 10⁸"] },
          { q: "The oxidation state of Oxygen in H2O is:", opts: ["+1", "-1", "-2", "+2"] },
        ],
        shorts: [
          "Define isotope and write two uses of radioactive isotopes in medicine.",
          "Differentiate between an empirical formula and a molecular formula.",
          "State Boyle's Law and write its mathematical equation.",
          "Why do elements in the same group possess similar chemical properties?",
          "Define Molarity and calculate molarity of 5g NaOH in 250 cm³ solution.",
          "Explain oxidation and reduction in terms of electron transfer.",
          "Differentiate between saturated and unsaturated solutions.",
          "Define electronegativity and state its trend across a period.",
        ],
        longs: [
          "Describe Rutherford's Alpha Scattering Experiment with diagram and explain its conclusions and defects.",
          "Explain the covalent bond with examples of single, double, and triple bonds (H2, O2, N2).",
          "Define solubility. What factors affect the solubility of a solute in a liquid solvent?",
          "Explain Bohr's Atomic Theory and describe its key postulates for hydrogen atom.",
        ],
      },
    },
  },
  biology: {
    en: {
      default: {
        mcqs: [
          { q: "The powerhouse of the cell is:", opts: ["Ribosome", "Mitochondria", "Nucleus", "Golgi body"] },
          { q: "Enzymes are biologically composed of:", opts: ["Carbohydrates", "Lipids", "Proteins", "Nucleic acids"] },
          { q: "Which blood group is known as the universal donor?", opts: ["Group A", "Group B", "Group AB", "Group O"] },
          { q: "The light-independent reactions of photosynthesis occur in:", opts: ["Thylakoid", "Stroma", "Granum", "Cristae"] },
          { q: "The basic structural and functional unit of the human kidney is:", opts: ["Neuron", "Nephron", "Alveoli", "Villi"] },
          { q: "The process of cell division resulting in four haploid daughter cells is:", opts: ["Mitosis", "Meiosis", "Binary fission", "Budding"] },
        ],
        shorts: [
          "Differentiate between prokaryotic and eukaryotic cells with two diagrams.",
          "Define photosynthesis and write its balanced chemical equation.",
          "What are stomata? How do guard cells control their opening and closing?",
          "Define active transport and compare it with facilitated diffusion.",
          "Describe the role of bile produced by the liver in human digestion.",
          "List the main components of human blood and their primary functions.",
          "Differentiate between aerobic and anaerobic respiration.",
          "Define enzymes and explain the Lock and Key model of enzyme action.",
        ],
        longs: [
          "Describe the stages of Mitosis (Prophase, Metaphase, Anaphase, Telophase) with neat labeled diagrams.",
          "Explain the human heart structure and trace the complete flow of blood through systemic and pulmonary circulations.",
          "Describe aerobic respiration. Detail the events of Glycolysis, Krebs Cycle, and Electron Transport Chain.",
          "Describe the human urinary system and explain the functioning of a nephron.",
        ],
      },
    },
  },
  mathematics: {
    en: {
      primary: {
        mcqs: [
          { q: "What is 45 + 38?", opts: ["73", "83", "85", "93"] },
          { q: "What is 12 x 8?", opts: ["84", "96", "108", "88"] },
          { q: "Which fraction is equivalent to 1/2?", opts: ["2/4", "3/5", "1/4", "2/3"] },
          { q: "The place value of 7 in 4,725 is:", opts: ["Units", "Tens", "Hundreds", "Thousands"] },
          { q: "How many sides does a pentagon have?", opts: ["4", "5", "6", "8"] },
        ],
        shorts: [
          "Add the following numbers: 3,456 + 2,789.",
          "Subtract 1,845 from 5,000.",
          "Find the product of 45 and 15.",
          "Divide 672 by 8 and find the quotient.",
          "Convert 3/4 into a decimal.",
          "Find the perimeter of a rectangle having length 8 cm and breadth 5 cm.",
        ],
        longs: [
          "Ali bought 5 notebooks for Rs. 150 each and 3 pens for Rs. 40 each. He paid Rs. 1000. How much change will he receive?",
          "Draw and label geometric figures: Square, Rectangle, and Triangle, and write their properties.",
        ],
      },
      middle: {
        mcqs: [
          { q: "The square of -7 is:", opts: ["-49", "49", "-14", "14"] },
          { q: "If 3x + 5 = 20, then x is equal to:", opts: ["3", "5", "7", "15"] },
          { q: "The sum of interior angles of a triangle is:", opts: ["90°", "180°", "270°", "360°"] },
          { q: "What is 25% of 200?", opts: ["25", "50", "75", "100"] },
          { q: "The HCF of 12 and 18 is:", opts: ["2", "3", "6", "36"] },
        ],
        shorts: [
          "Find the LCM and HCF of 24 and 36 using prime factorization.",
          "Solve the algebraic linear equation: 4(x - 2) = 2x + 10.",
          "Find the square root of 576 by division method.",
          "Calculate the simple interest on Rs. 5000 at 8% per annum for 3 years.",
          "If the ratio of boys to girls in a class of 40 students is 3:2, find the number of girls.",
          "Find the area and circumference of a circle with radius 7 cm (take π = 22/7).",
        ],
        longs: [
          "Factorize the quadratic expression: x² + 9x + 20 and verify by expansion.",
          "Construct a triangle ABC with AB = 6 cm, BC = 5 cm, and angle B = 60° with steps of construction.",
        ],
      },
      secondary: {
        mcqs: [
          { q: "If A = {1, 2, 3} and B = {3, 4, 5}, then A ∩ B is:", opts: ["{1, 2}", "{3}", "{1, 2, 3, 4, 5}", "Empty set"] },
          { q: "The discriminant of quadratic equation ax² + bx + c = 0 is:", opts: ["b² - 4ac", "b² + 4ac", "-b / 2a", "√(b² - 4ac)"] },
          { q: "log(a × b) is equal to:", opts: ["log a × log b", "log a + log b", "log a - log b", "log a / log b"] },
          { q: "The value of sin²θ + cos²θ is always:", opts: ["0", "1", "2", "Infinity"] },
          { q: "A matrix having only one row is called a:", opts: ["Column Matrix", "Row Matrix", "Square Matrix", "Diagonal Matrix"] },
          { q: "The roots of equation x² - 5x + 6 = 0 are:", opts: ["2, 3", "-2, -3", "1, 6", "-1, -6"] },
        ],
        shorts: [
          "Solve the quadratic equation using quadratic formula: x² - 7x + 12 = 0.",
          "If log 2 = 0.3010 and log 3 = 0.4771, find the value of log 6 without calculator.",
          "Find the determinant and inverse of 2x2 matrix: A = [[4, 2], [3, 1]].",
          "Prove the trigonometric identity: (1 + tan²θ) = sec²θ.",
          "Simplify the algebraic expression: (x² - 9) / (x² + 5x + 6).",
          "Find the distance between the points P(3, 4) and Q(7, 1).",
          "If a:b = c:d, prove by componendo-dividendo theorem that (a+b)/(a-b) = (c+d)/(c-d).",
          "Find the mean and median of the data: 12, 15, 11, 19, 14, 18, 15.",
        ],
        longs: [
          "Solve the system of linear equations using Cramer's Rule:\n2x + y = 5\n3x - 2y = 4",
          "Prove by De Morgan's Laws: (A ∪ B)' = A' ∩ B' using Venn diagrams for universal set U.",
          "The angle of elevation of the top of a tower from a point on the ground 50m away is 45°. Find the height of the tower.",
          "State and prove Pythagoras Theorem with neat geometric diagram and formal proof.",
        ],
      },
      default: {
        mcqs: [
          { q: "If A = {1, 2, 3} and B = {3, 4, 5}, then A ∩ B is:", opts: ["{1, 2}", "{3}", "{1, 2, 3, 4, 5}", "Empty set"] },
          { q: "The discriminant of quadratic equation ax² + bx + c = 0 is:", opts: ["b² - 4ac", "b² + 4ac", "-b / 2a", "√(b² - 4ac)"] },
          { q: "log(a × b) is equal to:", opts: ["log a × log b", "log a + log b", "log a - log b", "log a / log b"] },
          { q: "The value of sin²θ + cos²θ is always:", opts: ["0", "1", "2", "Infinity"] },
          { q: "A matrix having only one row is called a:", opts: ["Column Matrix", "Row Matrix", "Square Matrix", "Diagonal Matrix"] },
        ],
        shorts: [
          "Solve the quadratic equation using quadratic formula: x² - 7x + 12 = 0.",
          "If log 2 = 0.3010 and log 3 = 0.4771, find the value of log 6 without calculator.",
          "Find the determinant and inverse of 2x2 matrix: A = [[4, 2], [3, 1]].",
          "Prove the trigonometric identity: (1 + tan²θ) = sec²θ.",
          "Simplify the algebraic expression: (x² - 9) / (x² + 5x + 6).",
          "Find the distance between the points P(3, 4) and Q(7, 1).",
        ],
        longs: [
          "Solve the system of linear equations using Cramer's Rule:\n2x + y = 5\n3x - 2y = 4",
          "Prove by De Morgan's Laws: (A ∪ B)' = A' ∩ B' using Venn diagrams for universal set U.",
          "The angle of elevation of the top of a tower from a point on the ground 50m away is 45°. Find the height of the tower.",
        ],
      },
    },
  },
  computer_science: {
    en: {
      default: {
        mcqs: [
          { q: "Which memory is volatile and loses contents when power is switched off?", opts: ["ROM", "RAM", "Hard Disk", "Flash Drive"] },
          { q: "1 Gigabyte (GB) is equivalent to:", opts: ["1024 Bytes", "1024 Kilobytes", "1024 Megabytes", "1024 Gigabits"] },
          { q: "In C language, which symbol is used to terminate a statement?", opts: [":", ";", ".", ","] },
          { q: "Which protocol is primarily used for secure browsing on the World Wide Web?", opts: ["FTP", "SMTP", "HTTPS", "DNS"] },
          { q: "A graphical representation of an algorithm is known as:", opts: ["Pseudocode", "Flowchart", "Program", "Data Dictionary"] },
          { q: "Which device operates at the Network Layer of OSI model?", opts: ["Hub", "Switch", "Router", "Repeater"] },
        ],
        shorts: [
          "Differentiate between system software and application software with examples.",
          "What is a flowchart? Explain the purpose of Oval and Diamond symbols.",
          "Explain the role of an Operating System as a resource manager.",
          "Differentiate between Compiler and Interpreter.",
          "What is an IP address? Differentiate between IPv4 and IPv6.",
          "Explain primary key and foreign key in relational databases.",
          "Define computer bus. Differentiate between data bus and address bus.",
          "What is phishing? State two safety measures against email spoofing.",
        ],
        longs: [
          "Write a C program to find the largest of three numbers entered by the user.",
          "Explain Network Topologies (Star, Bus, Ring, Mesh) with diagrams and relative advantages.",
          "Describe computer virus and malware threats and list 4 essential cybersecurity measures.",
          "Explain the software development life cycle (SDLC) phases in detail.",
        ],
      },
    },
  },
  english: {
    en: {
      primary: {
        mcqs: [
          { q: "Choose the correct plural form of 'Child':", opts: ["Childs", "Children", "Childrens", "Childes"] },
          { q: "Identify the noun in the sentence: 'The cat slept on the mat.'", opts: ["Slept", "On", "Cat", "The"] },
          { q: "Choose the opposite of 'Happy':", opts: ["Sad", "Glad", "Joyful", "Pleasant"] },
          { q: "Fill in the blank: 'She ___ a nice story yesterday.'", opts: ["reads", "read", "reading", "will read"] },
        ],
        shorts: [
          "Write five lines on 'My Best Friend'.",
          "Identify the verbs in the following sentences.",
          "Write the plurals of: (a) Leaf (b) City (c) Tooth (d) Box.",
          "Make sentences using: (a) Beautiful (b) School (c) Garden.",
        ],
        longs: [
          "Write a short essay of 100 words on 'My Pet Animal'.",
          "Write an application to your class teacher for one day leave.",
        ],
      },
      secondary: {
        mcqs: [
          { q: "Choose the correct passive voice: 'The teacher praised the student.'", opts: ["The student was praised by the teacher.", "The student is praised.", "The teacher had praised.", "The student has praised."] },
          { q: "Choose the synonym of 'Diligent':", opts: ["Lazy", "Hardworking", "Careless", "Timid"] },
          { q: "Which word is an adverb in: 'He ran remarkably fast'?", opts: ["He", "Ran", "Remarkably", "Fast"] },
          { q: "Identify the tense: 'They have been working since morning.'", opts: ["Present Perfect", "Present Continuous", "Present Perfect Continuous", "Past Perfect"] },
          { q: "The antonym of 'Abundant' is:", opts: ["Plentiful", "Scarce", "Rich", "Lavish"] },
          { q: "Identify the figure of speech: 'The classroom was a zoo.'", opts: ["Simile", "Metaphor", "Personification", "Hyperbole"] },
        ],
        shorts: [
          "Read the provided stanza from poem 'The Daffodils' and explain its main theme.",
          "Change into Indirect Speech: He said to me, 'Where are you going tomorrow?'",
          "Use the following idioms in meaningful sentences: (a) Break the ice, (b) At the eleventh hour.",
          "Fill in the blanks with correct prepositions: (a) He is fond ___ reading. (b) She agreed ___ my proposal.",
          "Write four sentences on the importance of punctuality in student life.",
          "Correct the grammatical errors in: 'Neither he nor his friends was present.'",
          "Change the voice: 'They built a grand bridge over the Indus river.'",
          "Form nouns from the given adjectives: (a) Brave (b) Honest (c) Strong.",
        ],
        longs: [
          "Write a formal essay of 150-200 words on 'The Role of Technology in Modern Education'.",
          "Write an application to the Principal requesting three days sick leave.",
          "Translate the following paragraph from Urdu/Sindhi into correct English.",
          "Write a letter to your younger brother advising him to focus on conceptual study and avoid cramming.",
        ],
      },
      default: {
        mcqs: [
          { q: "Choose the correct passive voice: 'The teacher praised the student.'", opts: ["The student was praised by the teacher.", "The student is praised.", "The teacher had praised.", "The student has praised."] },
          { q: "Choose the synonym of 'Diligent':", opts: ["Lazy", "Hardworking", "Careless", "Timid"] },
          { q: "Which word is an adverb in: 'He ran remarkably fast'?", opts: ["He", "Ran", "Remarkably", "Fast"] },
          { q: "Identify the tense: 'They have been working since morning.'", opts: ["Present Perfect", "Present Continuous", "Present Perfect Continuous", "Past Perfect"] },
          { q: "The antonym of 'Abundant' is:", opts: ["Plentiful", "Scarce", "Rich", "Lavish"] },
        ],
        shorts: [
          "Read the provided stanza from poem 'The Daffodils' and explain its main theme.",
          "Change into Indirect Speech: He said to me, 'Where are you going tomorrow?'",
          "Use the following idioms in meaningful sentences: (a) Break the ice, (b) At the eleventh hour.",
          "Fill in the blanks with correct prepositions: (a) He is fond ___ reading. (b) She agreed ___ my proposal.",
          "Write four sentences on the importance of punctuality in student life.",
        ],
        longs: [
          "Write a formal essay of 150-200 words on 'The Role of Technology in Modern Education'.",
          "Write an application to the Principal requesting three days sick leave.",
          "Translate the following paragraph from Urdu/Sindhi into correct English.",
        ],
      },
    },
  },
  urdu: {
    ur: {
      default: {
        mcqs: [
          { q: "لفظ 'شمس' کا متضاد کیا ہے؟", opts: ["قمر", "فلک", "انجم", "سحر"] },
          { q: "اسمِ معرفہ کی نشاندہی کریں:", opts: ["شہر", "دریا", "کراچی", "پہاڑ"] },
          { q: "مسدس کے ہر بند میں کتنے مصرعے ہوتے ہیں؟", opts: ["چار", "پانچ", "چھ", "آٹھ"] },
          { q: "نظم 'حمد' میں کس کی تعریف بیان کی جاتی ہے؟", opts: ["حضور ﷺ کی", "اللہ تعالیٰ کی", "صحابہ کرام کی", "اولیاء کرام کی"] },
          { q: "فعل 'جائے گا' زمانے کے لحاظ سے ہے:", opts: ["ماضی", "حال", "مستقبل", "مضارع"] },
          { q: "لفظ 'شجاعت' کے معنی ہیں:", opts: ["بہادری", "سخاوت", "حکمت", "دیانت"] },
        ],
        shorts: [
          "درج ذیل اشعار کی تشریح شاعر کے حوالے کے ساتھ لکھیے۔",
          "مترادف الفاظ لکھیے: (الف) گلشن (ب) آفتاب (ج) مسرت (د) ظلمت",
          "درج ذیل محاورات کو جملوں میں استعمال کیجیے: (الف) باغ باغ ہونا (ب) آسمان سر پر اٹھانا۔",
          "سابقے اور لاحقے لگا کر دو دو الفاظ بنائیے: (با۔۔۔)، (۔۔۔دار)۔",
          "خط بنام والد صاحب: امتحانی تیاری اور نصابی کتب کے اخراجات کی تفصیل بتائیں۔",
          "اسمِ نکرہ اور اسمِ معرفہ میں فرق دو دو مثالوں سے واضح کریں۔",
          "درج ذیل جملوں کو درست کر کے لکھیے: (الف) میں نے اخبار کو پڑھا۔ (ب) پانی پر برف تیرتی ہے۔",
          "لفظوں کی ضد لکھیے: (الف) اول (ب) روشن (ج) فراخ (د) غریب۔",
        ],
        longs: [
          "کسی ایک عنوان پر جامع مضمون تحریر کیجیے: (الف) حب الوطنی (ب) محنت کی برکات (ج) کمپیوٹر کے فوائد و نقصانات۔",
          "سبق کا خلاصہ اپنے الفاظ میں تحریر کیجیے اور مصنف کا بنیادی پیغام واضح کیجیے۔",
          "درج ذیل پیراگراف کی آسان اور سلیس اردو میں تلخیص (خلاصہ) کیجیے۔",
          "سندھ کے تاریخی و ثقافتی ورثے پر تفصیلی مضمون لکھیے۔",
        ],
      },
    },
  },
  sindhi: {
    sd: {
      default: {
        mcqs: [
          { q: "سنڌي ٻوليءَ جي الف-ب ۾ ڪل ڪيترا اکر آهن؟", opts: ["36", "48", "52", "54"] },
          { q: "لفظ 'ڏينهن' جو ضد (متضاد) ڇا آهي؟", opts: ["رات", "صبح", "شام", "منجهند"] },
          { q: "اسم عام جي سڃاڻپ ڪريو:", opts: ["سنڌوءَ ندي", "شاهه لطيف", "شاگرد", "حيدرآباد"] },
          { q: "شاهه عبداللطيف ڀٽائيءَ جي رسالي جي سرن جو تعداد لڳ ڀڳ ڪيترو آهي؟", opts: ["20", "30", "40", "50"] },
          { q: "جملي ۾ ڪم ڪندڙ کي ڇا چئبو آهي؟", opts: ["فاعل", "مفعول", "فعل", "حرف"] },
          { q: "سنڌي رسم الخط ڪهڙي لپيءَ مان ورتل آهي؟", opts: ["ديوناگري", "عربي-فارسي", "رومن", "گورمکي"] },
        ],
        shorts: [
          "هيٺ ڏنل شعر جي معنيٰ ۽ سٽاءَ بيان ڪريو.",
          "لفظن جا ضد لکو: (الف) علم (ب) ڏاهو (ج) اڀرڻ (د) آسودو.",
          "هيٺ ڏنل پهاڪن کي جملن ۾ استعمال ڪريو: (الف) ٻه ته ٻارهن (ب) جت گھوڙا ات ئي گھوٽ.",
          "اسم ۽ ان جي قسمن جي وصف مثالن سان بيان ڪريو.",
          "هيڊماستر صاحب ڏانهن بيماريءَ جي سبب ٽن ڏينهن جي موڪل جي درخواست لکو.",
          "ضد لکو: (الف) ڏک (ب) امير (ج) نرم (د) سچ.",
          "سنڌي ٻوليءَ جي مخصوص اکرن (ٻ، ڄ، ڳ، ڱ، ڻ) وارا پنج لفظ لکو.",
          "جملن ۾ درست حرف جر لڳايو.",
        ],
        longs: [
          "ڪنهن به هڪ عنوان تي تفصيلي مضمون لکو: (الف) وقت جي پابندي (ب) سنڌ جي ثقافت (ج) علم جا فائدا.",
          "سبق جو خلاصو پنهنجن لفظن ۾ لکو ۽ ليکڪ جو پيغام واضع ڪريو.",
          "شاهه لطيف جي شاعريءَ ۾ حب الوطنيءَ ۽ امن جي پيغام تي تفصيل سان روشني وجهو.",
          "سنڌو درياءَ جي تاريخي اهميت ۽ زراعت تي تفصيلي نوٽ لکو.",
        ],
      },
    },
  },
  pakistan_studies: {
    ur: {
      default: {
        mcqs: [
          { q: "قراردادِ لاہور کس سال منظور کی گئی؟", opts: ["1930", "1940", "1946", "1947"] },
          { q: "پاکستان کا پہلا دارالحکومت کونسا شہر تھا؟", opts: ["لاہور", "اسلام آباد", "کراچی", "راولپنڈی"] },
          { q: "پاکستان کا آئین 1973 کس کی حکومت میں نافذ ہوا؟", opts: ["ایوب خان", "ذوالفقار علی بھٹو", "ضیاء الحق", "پرویز مشرف"] },
          { q: "کے ٹو (K2) پہاڑ کس پہاڑی سلسلے میں واقع ہے؟", opts: ["ہمالیہ", "قراقرم", "ہندوکش", "کوہِ سلیمان"] },
          { q: "سندھ طاس معاہدہ کن دو ممالک کے درمیان ہوا؟", opts: ["پاکستان و بھارت", "پاکستان و چین", "پاکستان و ایران", "پاکستان و افغانستان"] },
          { q: "پاکستان کی پہلی دستور ساز اسمبلی کے صدر کون تھے؟", opts: ["لیاقت علی خان", "قائد اعظم محمد علی جناح", "خواجہ ناظم الدین", "مولوی تمیز الدین"] },
        ],
        shorts: [
          "نظریہ پاکستان کی تعریف اور علامہ اقبال کا نقطہ نظر بیان کریں۔",
          "تحریکِ علی گڑھ کے دو اہم تعلیمی و سیاسی مقاصد بیان کریں۔",
          "پاکستان کے محل وقوع کی جغرافیائی و اسٹریٹجک اہمیت کے دو نکات لکھیے۔",
          "معاہدہ تاشقند 1966 کے اہم نکات مختصراً بیان کریں۔",
          "پاکستان کے چاروں صوبوں کے نام اور ان کے دارالحکومت لکھیے۔",
          "پاکستان میں زراعت کو درپیش پانی کے بحران کے دو حل بتائیں۔",
          "1956 کے آئین کی دو بنیادی خصوصیات تحریر کیجیے۔",
          "سندھ طاس معاہدہ (1960) پر مختصر نوٹ لکھیے۔",
        ],
        longs: [
          "قائداعظم محمد علی جناح کے چودہ نکات (1929) کی تفصیل اور برصغیر کی سیاست پر ان کے اثرات بیان کیجیے۔",
          "پاکستان کے زرعی شعبے کو درپیش مسائل اور ان کے حل کے لیے تجاویز تفصیلاً لکھیے۔",
          "سرسید احمد خان کی تعلیمی، ادبی اور سیاسی خدمات کا جامع جائزہ پیش کیجیے۔",
          "پاکستان کی خارجہ پالیسی کے بنیادی اصول تفصیل سے بیان کیجیے۔",
        ],
      },
    },
  },
  islamiat: {
    ur: {
      default: {
        mcqs: [
          { q: "قرآن مجید میں کل کتنے پارے ہیں؟", opts: ["25", "30", "35", "40"] },
          { q: "اسلام کا پہلا رکن کونسا ہے؟", opts: ["نماز", "توحید و رسالت", "روزہ", "زکوٰۃ"] },
          { q: "غزوہِ بدر کس ہجری میں پیش آیا؟", opts: ["2 ہجری", "3 ہجری", "5 ہجری", "8 ہجری"] },
          { q: "زکوٰۃ کے مصارف کی تعداد قرآن مجید میں کتنی بتائی گئی ہے؟", opts: ["6", "7", "8", "10"] },
          { q: "قرآن مجید کی سب سے طویل سورت کونسی ہے؟", opts: ["سورۃ البقرہ", "سورۃ آل عمران", "سورۃ النساء", "سورۃ المائدہ"] },
          { q: "حضرت محمد ﷺ پر پہلی وحی کس غار میں نازل ہوئی؟", opts: ["غارِ حرا", "غارِ ثور", "غارِ کہف", "کوہِ طور"] },
        ],
        shorts: [
          "عقیدہِ توحید سے کیا مراد ہے؟ انسانی زندگی پر اس کے دو اثرات لکھیے۔",
          "حقوق العباد کی اہمیت قرآنی آیات کی روشنی میں واضح کیجیے۔",
          "طہارت اور پاکیزگی کی اہمیت پر ایک مختصر نوٹ لکھیے۔",
          "علم کی فضیلت پر ایک حدیثِ نبوی ﷺ اور اس کا مفہوم تحریر کیجیے۔",
          "صبر اور شکر کے مفہوم کی وضاحت دو سطروں میں کیجیے۔",
          "والدین کے ساتھ حسنِ سلوک پر ایک قرآنی آیت کا ترجمہ لکھیے۔",
          "امانت اور دیانت کی اہمیت پر دو جملے لکھیے۔",
          "نماز باجماعت کے دو معاشرتی فوائد بیان کریں۔",
        ],
        longs: [
          "سیرتِ نبوی ﷺ کی روشنی میں اخوت اور رواداری پر تفصیلی نوٹ تحریر کیجیے۔",
          "نماز کے انفرادی اور اجتماعی فوائد پر تفصیلی مضمون لکھیے۔",
          "زکوٰۃ کا معاشی نظام اور معاشرے سے غربت کے خاتمے میں اس کا کردار واضح کیجیے۔",
          "قرآن مجید کے اعجاز اور فضائل پر تفصیلی مضمون لکھیے۔",
        ],
      },
    },
  },
};

/**
 * Deterministically generates complete curriculum paper without invoking LLM
 */
export function generateCurriculumDocument(options: GenerateCurriculumPaperOptions): TranscriptionDocument {
  const subj = PAKISTAN_CURRICULUM.SUBJECTS.find((s) => s.id === options.subjectId) || PAKISTAN_CURRICULUM.SUBJECTS[0];
  const cls = PAKISTAN_CURRICULUM.CLASSES.find((c) => c.id === options.classId) || PAKISTAN_CURRICULUM.CLASSES[8]; // Class 9 default
  const board = options.boardName || "BISE Hyderabad (Sindh)";
  const term = options.termTitle || "Midterm Examination 2026";
  const preset = PAKISTAN_CURRICULUM.MARKS_PRESETS.find((p) => p.id === options.marksPresetId) || PAKISTAN_CURRICULUM.MARKS_PRESETS[0];

  const lang = subj.language;
  const isUrdu = lang === "ur";
  const isSindhi = lang === "sd";

  const subjectTitle = isSindhi ? subj.nameSd : isUrdu ? subj.nameUr : subj.nameEn;
  const classTitle = isSindhi ? cls.nameSd : isUrdu ? cls.nameUr : cls.nameEn;

  // Retrieve questions from pre-coded bank
  const bank = SUBJECT_QUESTION_BANKS[subj.id] || SUBJECT_QUESTION_BANKS.physics;
  const langBank = (isSindhi ? bank.sd : isUrdu ? bank.ur : bank.en) || bank.en || SUBJECT_QUESTION_BANKS.physics.en!;

  // Select level-appropriate questions
  const classLevel = cls.level?.toLowerCase() as "primary" | "middle" | "secondary" | undefined;
  const contentSet = (classLevel && langBank[classLevel]) || langBank.default || SUBJECT_QUESTION_BANKS.physics.en!.default;

  // Build Section A: MCQs
  const mcqQuestions: QuestionItem[] = Array.from({ length: preset.mcqCount }).map((_, idx) => {
    const item = contentSet.mcqs[idx % contentSet.mcqs.length];
    return {
      id: `sec_a_q_${idx + 1}`,
      number: options.numeralStyle === "eastern" ? toEasternNumber(idx + 1) : `Q${idx + 1}`,
      text: item.q,
      marks: "1",
      language: lang,
      direction: subj.direction,
      confidence: 1.0,
      options: item.opts.map((optText, oIdx) => ({
        key: String.fromCharCode(65 + oIdx),
        text: optText,
      })),
    };
  });

  // Build Section B: Short Questions
  const shortQuestions: QuestionItem[] = Array.from({ length: preset.shortCount }).map((_, idx) => {
    const item = contentSet.shorts[idx % contentSet.shorts.length];
    return {
      id: `sec_b_q_${idx + 1}`,
      number: options.numeralStyle === "eastern" ? toEasternNumber(idx + 1) : `Q${idx + 1}`,
      text: item,
      marks: isShortQuestionMark(preset.marks),
      language: lang,
      direction: subj.direction,
      confidence: 1.0,
    };
  });

  // Build Section C: Long Questions
  const longQuestions: QuestionItem[] = Array.from({ length: preset.longCount }).map((_, idx) => {
    const item = contentSet.longs[idx % contentSet.longs.length];
    return {
      id: `sec_c_q_${idx + 1}`,
      number: options.numeralStyle === "eastern" ? toEasternNumber(idx + 1) : `Q${idx + 1}`,
      text: item,
      marks: isLongQuestionMark(preset.marks),
      language: lang,
      direction: subj.direction,
      confidence: 1.0,
    };
  });

  const sections: SectionBlock[] = [
    {
      id: "section_a",
      title: isSindhi ? "حصو الف: چونڊ سوال (MCQs)" : isUrdu ? "حصہ اول: کثیر الانتخابی سوالات (MCQs)" : "Section A: Multiple Choice Questions (MCQs)",
      instructions: isSindhi ? "سڀئي سوال حل ڪرڻ لازمي آهن. هر سوال جو 1 مارڪ آهي." : isUrdu ? "تمام سوالات حل کرنا لازمی ہیں۔ ہر سوال کا ایک نمبر ہے۔" : "Attempt all questions. Each carries 1 mark.",
      direction: subj.direction,
      language: lang,
      questions: mcqQuestions,
    },
    {
      id: "section_b",
      title: isSindhi ? "حصو ب: مختصر جوابي سوال" : isUrdu ? "حصہ دوم: مختصر جوابات کے سوالات" : "Section B: Short Answer Questions",
      instructions: isSindhi ? `ڪي به ${preset.shortCount - 1} سوال حل ڪريو.` : isUrdu ? `کوئی سے ${preset.shortCount - 1} سوالات کے جوابات دیجیے۔` : `Attempt any ${preset.shortCount - 1} questions.`,
      direction: subj.direction,
      language: lang,
      questions: shortQuestions,
    },
    {
      id: "section_c",
      title: isSindhi ? "حصو ج: تفصيلي جوابي سوال" : isUrdu ? "حصہ سوم: مفصل جوابات کے سوالات" : "Section C: Detailed / Long Answer Questions",
      instructions: isSindhi ? "ڪي به ٻه سوال تفصيل سان حل ڪريو." : isUrdu ? "کوئی سے دو سوالات کے جوابات تفصیل سے دیجیے۔" : "Attempt any two questions in detail.",
      direction: subj.direction,
      language: lang,
      questions: longQuestions,
    },
  ];

  return {
    version: "1.0",
    metadata: {
      title: term,
      subject: subjectTitle,
      gradeClass: classTitle,
      totalMarks: preset.marks,
      timeAllowed: preset.timeAllowed,
      instituteOrBoard: board,
      primaryLanguage: lang,
      primaryDirection: subj.direction,
      dateStr: new Date().toISOString().split("T")[0],
    },
    sections,
    overallConfidence: 1.0,
    notes: "Pre-coded standardized Pakistani curriculum document.",
  };
}

/**
 * Intelligent parser: Maps human prompts or wizard answers to pre-coded Pakistani curriculum definitions
 */
export function matchCurriculumFromText(
  prompt: string,
  answers?: Record<string, string>
): GenerateCurriculumPaperOptions | null {
  const combinedText = `${prompt} ${Object.values(answers || {}).join(" ")}`.toLowerCase();

  // 1. Identify Subject
  let matchedSubject: CurriculumSubject | undefined;

  // Direct lookup from answers keys
  if (answers?.q_subject) {
    const directSubj = PAKISTAN_CURRICULUM.SUBJECTS.find(
      (s) => s.id === answers.q_subject || s.nameEn.toLowerCase() === answers.q_subject.toLowerCase()
    );
    if (directSubj) matchedSubject = directSubj;
  }

  if (!matchedSubject) {
    const subjectPatterns: Array<{ id: string; keywords: string[] }> = [
      { id: "physics", keywords: ["physic", "طبیعیات", "فزڪس"] },
      { id: "chemistry", keywords: ["chem", "کیمیا", "ڪيمسٽري"] },
      { id: "biology", keywords: ["bio", "حیاتیات", "حياتيات"] },
      { id: "mathematics", keywords: ["math", "ریاضی", "حساب", "الجبر"] },
      { id: "computer_science", keywords: ["comp", "کمپیوٹر", "ڪمپيوٽر", "cs", "it"] },
      { id: "english", keywords: ["english", "انگریزی", "انگريزي", "grammar", "poetry"] },
      { id: "urdu", keywords: ["urdu", "اردو", "نظم", "غزل"] },
      { id: "sindhi", keywords: ["sindhi", "سنڌي", "سنڌ"] },
      { id: "pakistan_studies", keywords: ["pakistan studies", "pak studies", "مطالعہ پاکستان", "مطالعو پاڪستان", "pst"] },
      { id: "islamiat", keywords: ["islam", "اسلامیات", "اسلاميات", "deen", "quran"] },
    ];

    for (const pattern of subjectPatterns) {
      if (pattern.keywords.some((kw) => combinedText.includes(kw))) {
        matchedSubject = PAKISTAN_CURRICULUM.SUBJECTS.find((s) => s.id === pattern.id);
        break;
      }
    }
  }

  // 2. Identify Class (Class 1 to 10)
  let matchedClass: CurriculumClass | undefined;

  if (answers?.q_class || answers?.q_grade) {
    const classVal = answers.q_class || answers.q_grade;
    matchedClass = PAKISTAN_CURRICULUM.CLASSES.find(
      (c) => c.id === classVal || c.nameEn.toLowerCase().includes(classVal.toLowerCase())
    );
  }

  if (!matchedClass) {
    const classPatterns: Array<{ id: string; keywords: string[] }> = [
      { id: "class_1", keywords: ["class 1", "grade 1", "اول", "پهريون", "1st"] },
      { id: "class_2", keywords: ["class 2", "grade 2", "دوم", "ٻيون", "2nd"] },
      { id: "class_3", keywords: ["class 3", "grade 3", "سوم", "ٽيون", "3rd"] },
      { id: "class_4", keywords: ["class 4", "grade 4", "چہارم", "چوٿون", "4th"] },
      { id: "class_5", keywords: ["class 5", "grade 5", "پنجم", "پنجون", "5th"] },
      { id: "class_6", keywords: ["class 6", "grade 6", "ششم", "ڇهون", "6th"] },
      { id: "class_7", keywords: ["class 7", "grade 7", "ہفتم", "ستون", "7th"] },
      { id: "class_8", keywords: ["class 8", "grade 8", "ہشتم", "اٺون", "8th"] },
      { id: "class_9", keywords: ["class 9", "grade 9", "نہم", "نائين", "ssc-1", "ssc 1", "ssc-i", "9th"] },
      { id: "class_10", keywords: ["class 10", "grade 10", "دہم", "ڏهين", "ssc-2", "ssc 2", "ssc-ii", "matric", "10th"] },
    ];

    for (const pattern of classPatterns) {
      if (pattern.keywords.some((kw) => combinedText.includes(kw))) {
        matchedClass = PAKISTAN_CURRICULUM.CLASSES.find((c) => c.id === pattern.id);
        break;
      }
    }
  }

  // 3. Identify Board
  let matchedBoard = "BISE Hyderabad (Sindh)";
  for (const b of PAKISTAN_CURRICULUM.BOARDS) {
    if (combinedText.includes(b.name.toLowerCase()) || combinedText.includes(b.region.toLowerCase()) || combinedText.includes(b.id)) {
      matchedBoard = b.name;
      break;
    }
  }

  // 4. Identify Term
  let matchedTerm = "Midterm Examination 2026";
  for (const t of PAKISTAN_CURRICULUM.TERMS) {
    if (
      combinedText.includes(t.titleEn.toLowerCase()) ||
      combinedText.includes(t.titleUr) ||
      combinedText.includes(t.titleSd) ||
      combinedText.includes(t.id)
    ) {
      matchedTerm = t.titleEn;
      break;
    }
  }

  // 5. Identify Marks Preset
  let matchedMarksPresetId = "marks_75";
  if (combinedText.includes("25") || combinedText.includes("marks_25")) {
    matchedMarksPresetId = "marks_25";
  } else if (combinedText.includes("50") || combinedText.includes("marks_50")) {
    matchedMarksPresetId = "marks_50";
  } else if (combinedText.includes("100") || combinedText.includes("marks_100")) {
    matchedMarksPresetId = "marks_100";
  }

  // 6. Numeral style
  const numeralStyle = combinedText.includes("eastern") || combinedText.includes("عربی") || combinedText.includes("سنڌي انگ")
    ? "eastern"
    : "western";

  // If at least subject OR class was identified, we can compile pre-coded document
  if (matchedSubject || matchedClass) {
    return {
      subjectId: matchedSubject?.id || "physics",
      classId: matchedClass?.id || "class_9",
      boardName: matchedBoard,
      termTitle: matchedTerm,
      marksPresetId: matchedMarksPresetId,
      numeralStyle,
    };
  }

  return null;
}

/**
 * Builds a standardized pre-coded Sequential Interrogate Wizard payload with all 10 subjects and 10 classes
 */
export function getCurriculumInterrogatePayload(sessionId: string, originalPrompt: string): InterrogatePayload {
  const questions = [
    {
      id: "q_subject",
      step: 1,
      total: 4,
      text: "Select Subject from the Pakistani National / Provincial Curriculum:",
      options: [
        { id: "physics", label: "Physics (طبیعیات)" },
        { id: "chemistry", label: "Chemistry (کیمیا)" },
        { id: "biology", label: "Biology (حیاتیات)" },
        { id: "mathematics", label: "Mathematics (ریاضی / حساب)" },
        { id: "computer_science", label: "Computer Science (کمپیوٹر سائنس)" },
        { id: "urdu", label: "Urdu Lazmi (اردو لازمی)" },
        { id: "sindhi", label: "Sindhi Lazmi (سنڌي لازمي)" },
        { id: "english", label: "English Compulsory" },
        { id: "pakistan_studies", label: "Pakistan Studies (مطالعہ پاکستان)" },
        { id: "islamiat", label: "Islamiat Compulsory (اسلامیات لازمی)" },
      ],
    },
    {
      id: "q_class",
      step: 2,
      total: 4,
      text: "Select Class / Grade Level (Class 1 to Class 10):",
      options: [
        { id: "class_9", label: "Class 9 (SSC-I / نہم / نائين)" },
        { id: "class_10", label: "Class 10 (SSC-II / دہم / ڏهين)" },
        { id: "class_8", label: "Class 8 (Middle / ہشتم / اٺون)" },
        { id: "class_7", label: "Class 7 (Middle / ہفتم / ستون)" },
        { id: "class_6", label: "Class 6 (Middle / ششم / ڇهون)" },
        { id: "class_5", label: "Class 5 (Primary / پنجم / پنجون)" },
        { id: "class_4", label: "Class 4 (Primary / چہارم / چوٿون)" },
        { id: "class_3", label: "Class 3 (Primary / سوم / ٽيون)" },
        { id: "class_2", label: "Class 2 (Primary / دوم / ٻيون)" },
        { id: "class_1", label: "Class 1 (Primary / اول / پهريون)" },
      ],
    },
    {
      id: "q_board",
      step: 3,
      total: 4,
      text: "Select Examination Board / System:",
      options: [
        { id: "bise_hyd", label: "BISE Hyderabad (Sindh)" },
        { id: "bsek_khi", label: "BSEK Karachi (Sindh)" },
        { id: "bise_suk", label: "BISE Sukkur (Sindh)" },
        { id: "fbise_isb", label: "Federal FBISE Islamabad" },
        { id: "bise_lhr", label: "BISE Lahore (Punjab)" },
        { id: "school_internal", label: "School Terminal Examination" },
      ],
    },
    {
      id: "q_marks",
      step: 4,
      total: 4,
      text: "Select Total Marks and Duration:",
      options: [
        { id: "marks_75", label: "75 Marks (2.5 Hours - Standard Board Pattern)" },
        { id: "marks_50", label: "50 Marks (1.5 Hours - Midterm / Term Paper)" },
        { id: "marks_100", label: "100 Marks (3.0 Hours - Full Comprehensive Exam)" },
        { id: "marks_25", label: "25 Marks (45 Minutes - Unit Test / Quiz)" },
      ],
    },
  ];

  return {
    sessionId,
    originalInstruction: originalPrompt,
    questions,
  };
}

function isShortQuestionMark(totalMarks: string): string {
  if (totalMarks === "25") return "3";
  if (totalMarks === "50") return "4";
  if (totalMarks === "100") return "6";
  return "5"; // 75 marks
}

function isLongQuestionMark(totalMarks: string): string {
  if (totalMarks === "25") return "6";
  if (totalMarks === "50") return "8";
  if (totalMarks === "100") return "12";
  return "10"; // 75 marks
}

function toEasternNumber(num: number): string {
  const easternDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .split("")
    .map((ch) => easternDigits[parseInt(ch, 10)] || ch)
    .join("");
}
