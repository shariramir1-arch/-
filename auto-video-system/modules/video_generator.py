"""
מודול ד: יצירת וידאו
יוצר סרטון עם רקע, כתוביות, וקריינות
"""
import platform
import textwrap
from pathlib import Path

from config.settings import (
    VideoStatus, VideoType, VIDEOS_DIR, THUMBNAILS_DIR,
    VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, VIDEO_BG_COLOR,
    SUBTITLE_FONT_SIZE, SUBTITLE_COLOR, TITLE_FONT_SIZE,
    ensure_directories,
)
from core.database import Database
from core.models import Video
from core.logger import log_action
from core.retry import retry_operation


def _find_font(bold: bool = False) -> str:
    """מוצא פונט מתאים בהתאם למערכת ההפעלה"""
    system = platform.system()

    if system == "Windows":
        fonts_dir = Path("C:/Windows/Fonts")
        if bold:
            candidates = ["arialbd.ttf", "arial.ttf", "tahoma.ttf"]
        else:
            candidates = ["arial.ttf", "tahoma.ttf"]
        for font_name in candidates:
            font_path = fonts_dir / font_name
            if font_path.exists():
                return str(font_path)
        return "Arial"
    elif system == "Darwin":  # macOS
        if bold:
            return "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        return "/System/Library/Fonts/Supplemental/Arial.ttf"
    else:  # Linux
        if bold:
            candidates = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
            ]
        else:
            candidates = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/TTF/DejaVuSans.ttf",
            ]
        for path in candidates:
            if Path(path).exists():
                return path
        return "DejaVu-Sans-Bold" if bold else "DejaVu-Sans"


class VideoGenerator:
    """מחולל וידאו עם כתוביות וקריינות"""

    def __init__(self, db: Database = None):
        self.db = db or Database()

    def _split_script_to_segments(self, script: str, segment_duration: float = 5.0,
                                   total_duration: float = 60.0) -> list[dict]:
        """
        מחלק תסריט לקטעי כתוביות.
        כל קטע כולל: text, start, end
        """
        # פירוק לפסקאות ומשפטים
        sentences = []
        for paragraph in script.split("\n"):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            # פירוק למשפטים
            for sep in [".", "!", "?"]:
                paragraph = paragraph.replace(sep, sep + "|")
            parts = [s.strip() for s in paragraph.split("|") if s.strip()]
            sentences.extend(parts)

        if not sentences:
            return [{"text": script[:100], "start": 0, "end": total_duration}]

        # חלוקה שווה על פני הזמן
        time_per_sentence = total_duration / len(sentences)
        segments = []
        current_time = 0

        for sentence in sentences:
            # שבירת שורות ארוכות
            wrapped = textwrap.fill(sentence, width=40)
            segments.append({
                "text": wrapped,
                "start": round(current_time, 2),
                "end": round(current_time + time_per_sentence, 2),
            })
            current_time += time_per_sentence

        return segments

    def generate_video(self, video: Video) -> str:
        """
        מייצר סרטון מלא עם קריינות וכתוביות.
        מחזיר נתיב לקובץ הווידאו.
        """
        from moviepy import (
            AudioFileClip, ColorClip, CompositeVideoClip, TextClip,
            concatenate_videoclips,
        )

        ensure_directories()

        if not video.narration_path or not Path(video.narration_path).exists():
            raise FileNotFoundError(f"קובץ קריינות לא נמצא: {video.narration_path}")

        # יצירת תיקייה
        week_dir = VIDEOS_DIR / f"week_{video.week_number}"
        week_dir.mkdir(parents=True, exist_ok=True)
        output_path = week_dir / f"{video.video_type}_{video.id}.mp4"

        log_action("יצירת וידאו", f"סוג: {video.video_type}", video_id=video.id)

        # טעינת אודיו
        audio = AudioFileClip(video.narration_path)
        duration = audio.duration

        # יצירת רקע
        bg = ColorClip(
            size=(VIDEO_WIDTH, VIDEO_HEIGHT),
            color=VIDEO_BG_COLOR,
        ).with_duration(duration)

        # יצירת כותרת
        title_clip = TextClip(
            text=video.title,
            font_size=TITLE_FONT_SIZE,
            color="#60A5FA",
            font=_find_font(bold=True),
            size=(VIDEO_WIDTH - 200, None),
            method="caption",
            text_align="center",
        ).with_duration(min(5.0, duration)).with_position(("center", 100))

        # פירוק תסריט לכתוביות
        segments = self._split_script_to_segments(video.script, total_duration=duration)

        # יצירת כתוביות
        subtitle_clips = []
        for seg in segments:
            txt = TextClip(
                text=seg["text"],
                font_size=SUBTITLE_FONT_SIZE,
                color=SUBTITLE_COLOR,
                font=_find_font(bold=False),
                size=(VIDEO_WIDTH - 200, None),
                method="caption",
                text_align="center",
            )
            txt = txt.with_start(seg["start"]).with_end(seg["end"])
            txt = txt.with_position(("center", VIDEO_HEIGHT - 250))
            subtitle_clips.append(txt)

        # הרכבת הסרטון
        clips = [bg, title_clip] + subtitle_clips
        final = CompositeVideoClip(clips, size=(VIDEO_WIDTH, VIDEO_HEIGHT))
        final = final.with_audio(audio)

        # ייצוא
        final.write_videofile(
            str(output_path),
            fps=VIDEO_FPS,
            codec="libx264",
            audio_codec="aac",
            logger=None,  # שקט
        )

        # ניקוי
        audio.close()
        final.close()

        if not output_path.exists():
            raise FileNotFoundError(f"קובץ וידאו לא נוצר: {output_path}")

        log_action("וידאו נוצר בהצלחה", f"נשמר ב: {output_path}", video_id=video.id)

        return str(output_path)

    def generate_thumbnail(self, video: Video) -> str:
        """מייצר תמונת תצוגה לסרטון"""
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            log_action("דילוג על תמונת תצוגה", "PIL לא מותקן", video_id=video.id)
            return ""

        ensure_directories()

        week_dir = THUMBNAILS_DIR / f"week_{video.week_number}"
        week_dir.mkdir(parents=True, exist_ok=True)
        output_path = week_dir / f"{video.video_type}_{video.id}.png"

        # יצירת תמונה
        img = Image.new("RGB", (1280, 720), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        # ניסיון טעינת פונט
        try:
            font = ImageFont.truetype(_find_font(bold=True), 48)
            small_font = ImageFont.truetype(_find_font(bold=False), 32)
        except (OSError, IOError):
            font = ImageFont.load_default()
            small_font = font

        # כתיבת טקסט
        title_text = video.title[:50]
        draw.text((640, 300), title_text, fill="#60A5FA", font=font, anchor="mm")

        type_text = f"סרטון {video.video_type}"
        draw.text((640, 400), type_text, fill="white", font=small_font, anchor="mm")

        img.save(str(output_path))

        log_action("תמונת תצוגה נוצרה", f"נשמר ב: {output_path}", video_id=video.id)
        return str(output_path)

    def produce_videos(self, videos: list[Video]) -> list[Video]:
        """
        מייצר וידאו לכל הסרטונים שבשלב הפקה (עם קריינות).
        """
        updated = []

        for video in videos:
            if video.status != VideoStatus.IN_PRODUCTION:
                continue
            if not video.narration_path:
                log_action(
                    "דילוג על וידאו",
                    "אין קריינות",
                    video_id=video.id,
                )
                continue

            try:
                # יצירת וידאו
                video_path = retry_operation(
                    self.generate_video,
                    action_name="יצירת וידאו",
                    video_id=video.id,
                    video=video,
                )

                self.db.update_video_field(video.id, "video_path", video_path)

                # יצירת תמונת תצוגה
                thumb_path = self.generate_thumbnail(video)
                if thumb_path:
                    self.db.update_video_field(video.id, "thumbnail_path", thumb_path)

                # עדכון סטטוס -> וידאו מוכן -> ממתין לאישור
                self.db.update_video_status(video.id, VideoStatus.VIDEO_READY)
                self.db.update_video_status(video.id, VideoStatus.PENDING_APPROVAL)

                video.video_path = video_path
                video.thumbnail_path = thumb_path
                video.status = VideoStatus.PENDING_APPROVAL
                updated.append(video)

                log_action(
                    "סרטון מוכן לאישור",
                    f"ממתין לאישור ידני",
                    video_id=video.id,
                )

            except Exception as e:
                self.db.update_video_status(video.id, VideoStatus.ERROR, str(e))
                log_action(
                    "שגיאה ביצירת וידאו",
                    video_id=video.id,
                    success=False,
                    error=str(e),
                )

        return updated
