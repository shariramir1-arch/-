"""
הגדרות מרכזיות למערכת יצירת סרטונים אוטומטית
"""
import os
from pathlib import Path

# === נתיבים ===
BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "output"
SCRIPTS_DIR = OUTPUT_DIR / "scripts"
NARRATIONS_DIR = OUTPUT_DIR / "narrations"
VIDEOS_DIR = OUTPUT_DIR / "videos"
THUMBNAILS_DIR = OUTPUT_DIR / "thumbnails"
LOGS_DIR = OUTPUT_DIR / "logs"
CONFIG_DIR = BASE_DIR / "config"
DB_PATH = BASE_DIR / "data" / "videos.db"

# === Groq API ===
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# === YouTube API ===
YOUTUBE_CLIENT_SECRETS_FILE = CONFIG_DIR / "client_secrets.json"
YOUTUBE_TOKEN_FILE = CONFIG_DIR / "youtube_token.json"
YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
# העלאה כ"לא רשום" כברירת מחדל (unlisted) - לבטיחות
YOUTUBE_DEFAULT_PRIVACY = "unlisted"

# === TTS (טקסט לדיבור) ===
TTS_VOICE = "he-IL-AvriNeural"  # קול גברי בעברית
TTS_RATE = "-5%"  # קצת יותר איטי מהרגיל
TTS_VOLUME = "+0%"

# === וידאו ===
VIDEO_WIDTH = 1920
VIDEO_HEIGHT = 1080
VIDEO_FPS = 24
VIDEO_BG_COLOR = (15, 23, 42)  # כחול כהה
SUBTITLE_FONT_SIZE = 42
SUBTITLE_COLOR = "white"
TITLE_FONT_SIZE = 64
TITLE_COLOR = "#60A5FA"  # כחול בהיר

# === סטטוסים ===
class VideoStatus:
    IDEA = "רעיון"
    SCRIPT_READY = "תסריט מוכן"
    IN_PRODUCTION = "בהפקה"
    VIDEO_READY = "וידאו מוכן"
    PENDING_APPROVAL = "ממתין לאישור"
    APPROVED = "מאושר"
    SCHEDULED = "מתוזמן"
    UPLOADED = "הועלה"
    ERROR = "שגיאה"

    ALL = [
        IDEA, SCRIPT_READY, IN_PRODUCTION, VIDEO_READY,
        PENDING_APPROVAL, APPROVED, SCHEDULED, UPLOADED, ERROR
    ]

    # מעברים מותרים - לא ניתן לדלג על "ממתין לאישור"
    TRANSITIONS = {
        IDEA: [SCRIPT_READY, ERROR],
        SCRIPT_READY: [IN_PRODUCTION, ERROR],
        IN_PRODUCTION: [VIDEO_READY, ERROR],
        VIDEO_READY: [PENDING_APPROVAL, ERROR],
        PENDING_APPROVAL: [APPROVED, SCRIPT_READY, ERROR],  # אישור או החזרה לעריכה
        APPROVED: [SCHEDULED, UPLOADED, ERROR],
        SCHEDULED: [UPLOADED, ERROR],
        UPLOADED: [],
        ERROR: [IDEA, SCRIPT_READY, IN_PRODUCTION, VIDEO_READY],  # אפשרות לחזור לכל שלב
    }

# === סוגי סרטונים ===
class VideoType:
    LONG = "ארוך"       # סרטון עומק
    MEDIUM = "בינוני"   # סרטון הדגמה
    SHORT = "קצר"       # סרטון קצר

    ALL = [LONG, MEDIUM, SHORT]

    # משכי זמן משוערים בשניות
    DURATIONS = {
        LONG: (480, 720),     # 8-12 דקות
        MEDIUM: (180, 300),   # 3-5 דקות
        SHORT: (30, 60),      # 30-60 שניות
    }

# === ניסיונות חוזרים ===
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5

# === שרת אישורים ===
APPROVAL_SERVER_HOST = "127.0.0.1"
APPROVAL_SERVER_PORT = 5555

# === יצירת תיקיות ===
def ensure_directories():
    """יוצר את כל התיקיות הנדרשות"""
    for directory in [SCRIPTS_DIR, NARRATIONS_DIR, VIDEOS_DIR, THUMBNAILS_DIR, LOGS_DIR, DB_PATH.parent]:
        directory.mkdir(parents=True, exist_ok=True)
