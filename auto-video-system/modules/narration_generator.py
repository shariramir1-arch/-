"""
מודול ג: יצירת קריינות
מייצר קובץ קול לפי התסריט באמצעות edge-tts
"""
import asyncio
import subprocess
from pathlib import Path

from config.settings import (
    VideoStatus, TTS_VOICE, TTS_RATE, TTS_VOLUME,
    NARRATIONS_DIR, ensure_directories,
)
from core.database import Database
from core.models import Video
from core.logger import log_action
from core.retry import retry_operation


class NarrationGenerator:
    """מחולל קריינות באמצעות edge-tts"""

    def __init__(self, db: Database = None):
        self.db = db or Database()
        self.voice = TTS_VOICE
        self.rate = TTS_RATE
        self.volume = TTS_VOLUME

    async def _generate_tts(self, text: str, output_path: Path) -> Path:
        """מייצר קובץ שמע מטקסט"""
        import edge_tts

        communicate = edge_tts.Communicate(
            text=text,
            voice=self.voice,
            rate=self.rate,
            volume=self.volume,
        )
        await communicate.save(str(output_path))
        return output_path

    def generate_narration(self, video: Video) -> str:
        """
        מייצר קריינות לסרטון בודד.
        מחזיר את הנתיב לקובץ הקול.
        """
        if not video.script:
            raise ValueError(f"סרטון {video.id} אין לו תסריט")

        ensure_directories()

        # יצירת תיקייה לשבוע
        week_dir = NARRATIONS_DIR / f"week_{video.week_number}"
        week_dir.mkdir(parents=True, exist_ok=True)

        output_path = week_dir / f"{video.video_type}_{video.id}.mp3"

        log_action("יצירת קריינות", f"סוג: {video.video_type}", video_id=video.id)

        # הרצת TTS
        asyncio.run(self._generate_tts(video.script, output_path))

        if not output_path.exists():
            raise FileNotFoundError(f"קובץ קריינות לא נוצר: {output_path}")

        log_action(
            "קריינות נוצרה בהצלחה",
            f"נשמר ב: {output_path}",
            video_id=video.id,
        )

        return str(output_path)

    def generate_narrations_for_videos(self, videos: list[Video]) -> list[Video]:
        """
        מייצר קריינות לכל הסרטונים עם תסריט מוכן.
        מעדכן את מסד הנתונים.
        """
        updated = []

        for video in videos:
            if video.status != VideoStatus.SCRIPT_READY:
                log_action(
                    "דילוג על קריינות",
                    f"סרטון לא בסטטוס 'תסריט מוכן' (סטטוס: {video.status})",
                    video_id=video.id,
                )
                continue

            # העבר לסטטוס בהפקה
            self.db.update_video_status(video.id, VideoStatus.IN_PRODUCTION)

            try:
                narration_path = retry_operation(
                    self.generate_narration,
                    action_name="יצירת קריינות",
                    video_id=video.id,
                    video=video,
                )

                self.db.update_video_field(video.id, "narration_path", narration_path)
                video.narration_path = narration_path
                video.status = VideoStatus.IN_PRODUCTION
                updated.append(video)

            except Exception as e:
                self.db.update_video_status(video.id, VideoStatus.ERROR, str(e))
                log_action(
                    "שגיאה ביצירת קריינות",
                    video_id=video.id,
                    success=False,
                    error=str(e),
                )

        return updated

    @staticmethod
    def get_audio_duration(audio_path: str) -> float:
        """מחזיר את משך הזמן של קובץ שמע בשניות"""
        try:
            from mutagen.mp3 import MP3
            audio = MP3(audio_path)
            return audio.info.length
        except ImportError:
            # fallback עם ffprobe
            try:
                result = subprocess.run(
                    ["ffprobe", "-v", "quiet", "-show_entries",
                     "format=duration", "-of", "csv=p=0", audio_path],
                    capture_output=True, text=True, timeout=10,
                )
                return float(result.stdout.strip())
            except Exception:
                return 0.0
