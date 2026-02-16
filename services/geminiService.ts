
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

import { CustomsDeclarationData } from '../types';

export const extractCustomsDeclaration = async (
  imageBase64: string,
  mimeType: string,
  shipmentRequestNumber: string
): Promise<{ success: boolean; data?: CustomsDeclarationData; error?: string }> => {
  const ai = getClient();
  if (!ai) {
    return { success: false, error: "שגיאת מערכת: מפתח API חסר. נא להגדיר את process.env.API_KEY." };
  }

  try {
    const model = "gemini-2.5-flash";
    const systemInstruction = `
      אתה סוכן חכם לעמילות מכס. תפקידך לחלץ נתונים מהצהרות מכס ישראליות.
      עליך לחלץ את השדות הבאים בדיוק מהמסמך:
      - תאריך הגשה (submissionDate) - בפורמט DD/MM/YYYY
      - שם סוכן (agentName) - שם הסוכן/עמיל המכס
      - שם יבואן (importerName) - שם היבואן
      - מספר הצהרה מלא (fullDeclarationNumber) - מספר בקשת השינוע המלא
      - 4 ספרות אחרונות (lastFourDigits) - 4 הספרות האחרונות של מספר ההצהרה
      - כמות (quantity) - כמות יחידות + יחידת מידה
      - משקל (weight) - משקל כולל בפורמט XX,XXX.XX
      - מעבר פנימי (internalTransit) - שדה "מעבר פנימי" מההצהרה
      - תאריך שטר מטען (billOfLadingDate) - תאריך BL בפורמט DD/MM/YYYY
      - תיאור מטען (cargoDescription) - תיאור הסחורה

      מספר בקשת השינוע שיש לאמת: ${shipmentRequestNumber}

      החזר את התשובה אך ורק בפורמט JSON הבא, ללא טקסט נוסף:
      {
        "verified": true/false,
        "submissionDate": "...",
        "agentName": "...",
        "importerName": "...",
        "fullDeclarationNumber": "...",
        "lastFourDigits": "...",
        "quantity": "...",
        "weight": "...",
        "internalTransit": "...",
        "billOfLadingDate": "...",
        "cargoDescription": "..."
      }

      אם מספר בקשת השינוע לא תואם למסמך, החזר verified: false.
      אם שדה לא נמצא במסמך, רשום "לא נמצא".
    `;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text: `חלץ את כל הנתונים מהצהרת המכס הזו. מספר בקשת שינוע לאימות: ${shipmentRequestNumber}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    const responseText = response.text || "";

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: "לא ניתן היה לפרסר את תשובת המודל." };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.verified === false) {
      return { success: false, error: "מספר בקשת השינוע אינו תואם למסמך שהועלה. נא להעלות את המסמך הנכון." };
    }

    return {
      success: true,
      data: {
        submissionDate: parsed.submissionDate || "לא נמצא",
        agentName: parsed.agentName || "לא נמצא",
        importerName: parsed.importerName || "לא נמצא",
        fullDeclarationNumber: parsed.fullDeclarationNumber || "לא נמצא",
        lastFourDigits: parsed.lastFourDigits || "לא נמצא",
        quantity: parsed.quantity || "לא נמצא",
        weight: parsed.weight || "לא נמצא",
        internalTransit: parsed.internalTransit || "לא נמצא",
        billOfLadingDate: parsed.billOfLadingDate || "לא נמצא",
        cargoDescription: parsed.cargoDescription || "לא נמצא",
      },
    };
  } catch (error) {
    console.error("Gemini Customs Extraction Error:", error);
    return { success: false, error: "אירעה שגיאה בעיבוד המסמך. אנא נסה שנית." };
  }
};
