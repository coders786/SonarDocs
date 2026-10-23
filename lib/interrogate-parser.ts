export interface InterrogateOption {
  id: string;
  label: string;
}

export interface InterrogateQuestion {
  id: string;
  step: number;
  total: number;
  text: string;
  options: InterrogateOption[];
}

export interface InterrogatePayload {
  sessionId: string;
  questions: InterrogateQuestion[];
  originalInstruction?: string;
}

/**
 * Parses <interrogate session_id="..."> XML strings into structured InterrogatePayload
 */
export function parseInterrogateXml(xmlString: string): InterrogatePayload | null {
  if (!xmlString || typeof xmlString !== "string") return null;

  try {
    // Extract session_id attribute
    const sessionMatch = xmlString.match(/<interrogate\s+[^>]*session_id=["']([^"']+)["']/i) ||
                         xmlString.match(/session_id=["']([^"']+)["']/i);
    const sessionId = sessionMatch ? sessionMatch[1] : `session_${Date.now()}`;

    // Extract all <question> blocks
    const questionRegex = /<question\s+([^>]*)\s*>([\s\S]*?)<\/question>/gi;
    const questions: InterrogateQuestion[] = [];

    let qMatch: RegExpExecArray | null;
    while ((qMatch = questionRegex.exec(xmlString)) !== null) {
      const attrStr = qMatch[1];
      const qInner = qMatch[2];

      // Parse question attributes (id, step, total)
      const idMatch = attrStr.match(/id=["']([^"']+)["']/i);
      const stepMatch = attrStr.match(/step=["']([^"']+)["']/i);
      const totalMatch = attrStr.match(/total=["']([^"']+)["']/i);

      const qId = idMatch ? idMatch[1] : `q_${questions.length + 1}`;
      const step = stepMatch ? parseInt(stepMatch[1], 10) : questions.length + 1;
      const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

      // Extract <text>
      const textMatch = qInner.match(/<text>([\s\S]*?)<\/text>/i);
      const text = textMatch ? textMatch[1].trim() : "Clarification question:";

      // Extract all <option> elements
      const optionRegex = /<option\s+id=["']([^"']+)["']\s*>([\s\S]*?)<\/option>/gi;
      const options: InterrogateOption[] = [];

      let optMatch: RegExpExecArray | null;
      while ((optMatch = optionRegex.exec(qInner)) !== null) {
        options.push({
          id: optMatch[1],
          label: optMatch[2].trim(),
        });
      }

      if (options.length > 0) {
        questions.push({
          id: qId,
          step,
          total: total || 1,
          text,
          options,
        });
      }
    }

    if (questions.length === 0) return null;

    // Normalize step/total numbers if total was 0
    const finalTotal = questions[0].total || questions.length;
    const normalizedQuestions = questions.map((q, idx) => ({
      ...q,
      step: q.step || idx + 1,
      total: finalTotal,
    }));

    return {
      sessionId,
      questions: normalizedQuestions,
    };
  } catch (err) {
    console.error("Error parsing interrogate XML:", err);
    return null;
  }
}

/**
 * Formats structured questions into standard <interrogate> XML block string
 */
export function buildInterrogateXml(
  sessionId: string,
  questions: Array<{ id: string; question: string; options: string[] }>
): string {
  const total = questions.length;
  let xml = `<interrogate session_id="${sessionId}">\n`;

  questions.forEach((q, idx) => {
    const step = idx + 1;
    xml += `  <question id="${q.id || step}" step="${step}" total="${total}">\n`;
    xml += `    <text>${q.question}</text>\n`;
    q.options.forEach((opt, optIdx) => {
      const optionId = String.fromCharCode(97 + optIdx); // 'a', 'b', 'c'...
      xml += `    <option id="${optionId}">${opt}</option>\n`;
    });
    xml += `  </question>\n`;
  });

  xml += `</interrogate>`;
  return xml;
}
