"""
מודול ב: מחולל תסריטים
יוצר תסריטים לפי סוג הסרטון באמצעות Groq AI
"""
import json
import os
from datetime import datetime
from pathlib import Path

from config.settings import (
    GROQ_API_KEY, VideoStatus, VideoType,
    SCRIPTS_DIR, ensure_directories,
)
from core.database import Database
from core.models import Video
from core.logger import log_action
from core.retry import retry_operation


# תבניות תסריטים לפי סוג
SCRIPT_TEMPLATES = {
    VideoType.LONG: """
אתה כותב תסריט לסרטון יוטיוב ארוך (8-12 דקות) בעברית.
הנושא השבועי: {topic}
כותרת הסרטון: {title}
קהל יעד: {audience}
מטרה עסקית: {goal}

מבנה התסריט חייב להיות:
1. פתיחה חדה (30 שניות) - שאלה או טענה פרובוקטיבית שמושכת תשומת לב
2. הצגת בעיה רחבה בתחום (1-2 דקות) - תיאור הכאב שקהל היעד חווה
3. הסבר שיטתי (4-5 דקות) - פירוק הפתרון לשלבים ברורים
4. דוגמה מעשית (2-3 דקות) - תיאור מפורט של מקרה אמיתי / יישום
5. מסקנה (30 שניות) - סיכום התובנות העיקריות
6. קריאה רגועה לפעולה (30 שניות) - הזמנה לשיחת התאמה (לא אגרסיבי)

כתוב תסריט מלא, מילה במילה, כאילו מדובר בטקסט לקריינות.
הטון: מקצועי, ידידותי, מלא ערך.
אל תכתוב הוראות בימוי, רק את הטקסט עצמו.

בנוסף, צור:
- כותרת ליוטיוב (עד 60 תווים, מושכת)
- תיאור (150-200 מילים עם מילות מפתח)
- 10 תגיות רלוונטיות מופרדות בפסיקים
""",

    VideoType.MEDIUM: """
אתה כותב תסריט לסרטון יוטיוב בינוני (3-5 דקות) בעברית - סרטון הדגמה.
הנושא השבועי: {topic}
כותרת הסרטון: {title}
קהל יעד: {audience}
מטרה עסקית: {goal}

מבנה התסריט חייב להיות:
1. בעיה נקודתית (30 שניות) - הצגת בעיה ספציפית שאנשים מתמודדים איתה
2. שלושה צעדים (2 דקות) - הסבר של 3 שלבים ברורים לפתרון
3. הדגמה (1-2 דקות) - תיאור מפורט של איך מבצעים את זה בפועל
4. תוצאה (30 שניות) - מה צפוי לקרות אחרי היישום

כתוב תסריט מלא, מילה במילה, כאילו מדובר בטקסט לקריינות.
הטון: מעשי, ישיר, עם אנרגיה.
אל תכתוב הוראות בימוי, רק את הטקסט עצמו.

בנוסף, צור:
- כותרת ליוטיוב (עד 60 תווים, מושכת)
- תיאור (100-150 מילים עם מילות מפתח)
- 10 תגיות רלוונטיות מופרדות בפסיקים
""",

    VideoType.SHORT: """
אתה כותב תסריט לסרטון קצר (30-60 שניות) בעברית - YouTube Short / Reel.
הנושא השבועי: {topic}
כותרת הסרטון: {title}
קהל יעד: {audience}
מטרה עסקית: {goal}

מבנה התסריט חייב להיות:
1. פתיחה חדה (5 שניות) - משפט אחד שעוצר את הגלילה
2. טעות אחת (15 שניות) - הצגת טעות נפוצה שאנשים עושים
3. פתרון אחד (15 שניות) - הפתרון הפשוט לטעות
4. הפניה לסרטון הארוך (5 שניות) - "לינק לסרטון המלא בתיאור"

כתוב תסריט מלא, מילה במילה, כאילו מדובר בטקסט לקריינות.
הטון: אנרגטי, קצר, ממוקד.
אל תכתוב הוראות בימוי, רק את הטקסט עצמו.

בנוסף, צור:
- כותרת ליוטיוב (עד 60 תווים, מושכת)
- תיאור (50-80 מילים)
- 10 תגיות רלוונטיות מופרדות בפסיקים
""",
}

RESPONSE_FORMAT = """
החזר את התשובה בפורמט JSON הבא בלבד (בלי markdown, בלי ```, רק JSON טהור):
{
    "script": "הטקסט המלא של התסריט",
    "title": "כותרת ליוטיוב",
    "description": "תיאור ליוטיוב",
    "tags": "תגית1, תגית2, תגית3, ..."
}
"""


class ScriptGenerator:
    """מחולל תסריטים באמצעות Groq AI"""

    def __init__(self, db: Database = None):
        self.db = db or Database()
        self.api_key = GROQ_API_KEY

    def _call_llm(self, prompt: str) -> str:
        """קורא ל-Groq API ומחזיר תשובה"""
        try:
            from groq import Groq

            client = Groq(api_key=self.api_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except ImportError:
            # Fallback: שימוש ב-requests ישירות
            import requests
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
                "max_tokens": 4096,
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def _parse_response(self, response_text: str) -> dict:
        """מפרסר את התשובה מ-JSON"""
        text = response_text.strip()
        if text.startswith("```"):
            # הסרת markdown code blocks
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # ניסיון לחלץ JSON מתוך הטקסט
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            raise ValueError(f"לא ניתן לפרסר את התשובה כ-JSON: {text[:200]}")

    def generate_script(self, video: Video) -> dict:
        """
        מייצר תסריט לסרטון בודד.
        מחזיר dict עם: script, title, description, tags
        """
        if not self.api_key:
            raise ValueError("GROQ_API_KEY לא מוגדר. הגדר את המשתנה בסביבה.")

        template = SCRIPT_TEMPLATES.get(video.video_type)
        if not template:
            raise ValueError(f"סוג סרטון לא מוכר: {video.video_type}")

        prompt = template.format(
            topic=video.weekly_topic,
            title=video.title,
            audience=video.target_audience,
            goal=video.business_goal,
        ) + RESPONSE_FORMAT

        log_action("יצירת תסריט", f"סוג: {video.video_type}", video_id=video.id)

        response_text = self._call_llm(prompt)
        result = self._parse_response(response_text)

        return result

    def generate_scripts_for_week(self, videos: list[Video]) -> list[Video]:
        """
        מייצר תסריטים לכל סרטוני השבוע.
        מעדכן את מסד הנתונים ומחזיר סרטונים מעודכנים.
        """
        ensure_directories()
        updated = []

        for video in videos:
            if video.status != VideoStatus.IDEA:
                log_action(
                    "דילוג על תסריט",
                    f"סרטון לא בסטטוס 'רעיון' (סטטוס: {video.status})",
                    video_id=video.id,
                )
                continue

            try:
                result = retry_operation(
                    self.generate_script,
                    action_name="יצירת תסריט",
                    video_id=video.id,
                    video=video,
                )

                # שמירת תסריט לקובץ
                week_dir = SCRIPTS_DIR / f"week_{video.week_number}"
                week_dir.mkdir(parents=True, exist_ok=True)
                script_file = week_dir / f"{video.video_type}_{video.id}.txt"
                script_file.write_text(result["script"], encoding="utf-8")

                # עדכון מסד נתונים
                self.db.update_video_fields(video.id, {
                    "script": result["script"],
                    "title": result.get("title", video.title),
                    "description": result.get("description", ""),
                    "tags": result.get("tags", ""),
                })
                self.db.update_video_status(video.id, VideoStatus.SCRIPT_READY)

                video.script = result["script"]
                video.title = result.get("title", video.title)
                video.description = result.get("description", "")
                video.tags = result.get("tags", "")
                video.status = VideoStatus.SCRIPT_READY
                updated.append(video)

                log_action(
                    "תסריט נוצר בהצלחה",
                    f"נשמר ב: {script_file}",
                    video_id=video.id,
                )

            except Exception as e:
                self.db.update_video_status(video.id, VideoStatus.ERROR, str(e))
                log_action(
                    "שגיאה ביצירת תסריט",
                    video_id=video.id,
                    success=False,
                    error=str(e),
                )

        return updated
