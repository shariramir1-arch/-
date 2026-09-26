// מסווג מבוסס Gemini (הספק שכבר בשימוש בפרויקט). הפלט עובר תמיד את parseClassification.
import { GoogleGenAI } from '@google/genai';
import type { Classifier } from './classifier.ts';
import { buildClassifierPrompt } from './classifier.ts';

export function createGeminiClassifier(apiKey: string, treatments: readonly string[], model = 'gemini-2.5-flash'): Classifier {
  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildClassifierPrompt(treatments);
  return {
    async classify({ text, channel, treatmentHint }) {
      const response = await ai.models.generateContent({
        model,
        contents: `ערוץ: ${channel}\nטיפול שנבחר בטופס: ${treatmentHint || 'אין'}\nתוכן הפנייה:\n"""${text}"""`,
        config: { systemInstruction, temperature: 0, responseMimeType: 'application/json' },
      });
      return response.text ?? '';
    },
  };
}
