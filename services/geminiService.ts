
import { GoogleGenAI } from "@google/genai";

// Safely access process.env to prevent "process is not defined" errors in browser
const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;

// Initialize the client safely only when called to avoid init errors if key is missing during build
const getClient = () => {
  if (!apiKey) {
    console.warn("Gemini API Key is missing provided in process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateAgentResponse = async (
  userPrompt: string, 
  history: { role: string; text: string }[]
): Promise<string> => {
  const ai = getClient();
  if (!ai) {
    return "שגיאת מערכת: מפתח API חסר. נא להגדיר את process.env.API_KEY.";
  }

  try {
    const model = "gemini-2.5-flash";
    const systemInstruction = `
      אתה מומחה עולמי להטמעת מערכות מידע, פיתוח סוכני AI חכמים, ופיתוח אפליקציות משחק ארגוניות.
      השם שלך הוא "הארכיטקט".
      
      תפקידך:
      1. לסייע למשתמש לאפיין סוכן AI חדש.
      2. להסביר כיצד AI משתלב במערכות ERP/CRM.
      3. להציע רעיונות למשחוק (Gamification) בארגון.
      4. לענות בעברית מקצועית, רהוטה ואדיבה.
      
      אם המשתמש מבקש לבנות סוכן, תשאל שאלות מנחות: מה המטרה? מי קהל היעד? לאילו מערכות הוא יתחבר?
      לאחר מכן תציג "מפרט טכני" מדומיין של הסוכן.
    `;

    // Convert history format if needed, though for single turns content works well.
    // For simplicity in this demo, we will construct a prompt chain manually or use chat if preserving context is strict.
    // Here using generateContent with system instruction.
    
    // Construct the full conversation context string for the prompt to maintain basic context
    const conversationContext = history.map(h => `${h.role === 'user' ? 'משתמש' : 'ארכיטקט'}: ${h.text}`).join('\n');
    const finalPrompt = `${conversationContext}\nמשתמש: ${userPrompt}`;

    const response = await ai.models.generateContent({
      model,
      contents: finalPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "לא התקבלה תשובה מהמודל.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "אירעה שגיאה בתקשורת עם הבינה המלאכותית. אנא נסה שנית מאוחר יותר.";
  }
};
