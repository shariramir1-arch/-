"""
מודול מסד נתונים - SQLite
ניהול טבלת סרטונים ויומן פעילות
"""
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from config.settings import DB_PATH, VideoStatus, ensure_directories
from core.models import Video, ActivityLog
from core.logger import log_action


class Database:
    """ניהול מסד הנתונים של המערכת"""

    def __init__(self, db_path: Path = None):
        self.db_path = db_path or DB_PATH
        ensure_directories()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self):
        """יוצר את הטבלאות אם לא קיימות"""
        conn = self._get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS videos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    week_number INTEGER NOT NULL,
                    week_date TEXT NOT NULL,
                    weekly_topic TEXT NOT NULL,
                    video_type TEXT NOT NULL,
                    target_audience TEXT DEFAULT '',
                    business_goal TEXT DEFAULT '',
                    script TEXT DEFAULT '',
                    title TEXT DEFAULT '',
                    description TEXT DEFAULT '',
                    tags TEXT DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'רעיון',
                    youtube_url TEXT DEFAULT '',
                    error_message TEXT DEFAULT '',
                    updated_at TEXT NOT NULL,
                    narration_path TEXT DEFAULT '',
                    video_path TEXT DEFAULT '',
                    thumbnail_path TEXT DEFAULT '',
                    topic_index INTEGER DEFAULT -1,
                    scheduled_date TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    video_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT DEFAULT '',
                    success INTEGER NOT NULL DEFAULT 1,
                    error_message TEXT DEFAULT '',
                    FOREIGN KEY (video_id) REFERENCES videos(id)
                );

                CREATE TABLE IF NOT EXISTS weekly_state (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    week_number INTEGER NOT NULL,
                    week_date TEXT NOT NULL,
                    topic_index INTEGER NOT NULL,
                    topic_name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
                CREATE INDEX IF NOT EXISTS idx_videos_week ON videos(week_number);
                CREATE INDEX IF NOT EXISTS idx_activity_video ON activity_log(video_id);
            """)
            conn.commit()
            log_action("אתחול מסד נתונים", "טבלאות נוצרו/אומתו בהצלחה")
        finally:
            conn.close()

    # === פעולות סרטונים ===

    def create_video(self, video: Video) -> int:
        """יוצר רשומת סרטון חדשה ומחזיר את ה-ID"""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            cursor = conn.execute("""
                INSERT INTO videos (
                    created_at, week_number, week_date, weekly_topic, video_type,
                    target_audience, business_goal, script, title, description,
                    tags, status, youtube_url, error_message, updated_at,
                    narration_path, video_path, thumbnail_path, topic_index, scheduled_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now, video.week_number, video.week_date, video.weekly_topic,
                video.video_type, video.target_audience, video.business_goal,
                video.script, video.title, video.description, video.tags,
                video.status, video.youtube_url, video.error_message, now,
                video.narration_path, video.video_path, video.thumbnail_path,
                video.topic_index, video.scheduled_date,
            ))
            conn.commit()
            video_id = cursor.lastrowid
            self.log_activity(video_id, "יצירת סרטון", f"סוג: {video.video_type}, נושא: {video.weekly_topic}")
            return video_id
        finally:
            conn.close()

    def get_video(self, video_id: int) -> Optional[Video]:
        """מחזיר סרטון לפי ID"""
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
            if row:
                return self._row_to_video(row)
            return None
        finally:
            conn.close()

    def get_videos_by_status(self, status: str) -> list[Video]:
        """מחזיר את כל הסרטונים בסטטוס מסוים"""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM videos WHERE status = ? ORDER BY id", (status,)
            ).fetchall()
            return [self._row_to_video(r) for r in rows]
        finally:
            conn.close()

    def get_videos_by_week(self, week_number: int) -> list[Video]:
        """מחזיר את כל הסרטונים של שבוע מסוים"""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM videos WHERE week_number = ? ORDER BY id", (week_number,)
            ).fetchall()
            return [self._row_to_video(r) for r in rows]
        finally:
            conn.close()

    def get_all_videos(self) -> list[Video]:
        """מחזיר את כל הסרטונים"""
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT * FROM videos ORDER BY id DESC").fetchall()
            return [self._row_to_video(r) for r in rows]
        finally:
            conn.close()

    def update_video_status(self, video_id: int, new_status: str, error_message: str = "") -> bool:
        """מעדכן סטטוס של סרטון עם בדיקת מעברים מותרים"""
        video = self.get_video(video_id)
        if not video:
            log_action("עדכון סטטוס", f"סרטון {video_id} לא נמצא", success=False)
            return False

        # בדיקת מעבר מותר
        allowed = VideoStatus.TRANSITIONS.get(video.status, [])
        if new_status not in allowed:
            log_action(
                "עדכון סטטוס",
                f"מעבר אסור: {video.status} -> {new_status}",
                video_id=video_id,
                success=False,
                error=f"מעברים מותרים מ-{video.status}: {allowed}",
            )
            return False

        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE videos SET status = ?, error_message = ?, updated_at = ? WHERE id = ?",
                (new_status, error_message, now, video_id),
            )
            conn.commit()
            self.log_activity(video_id, "עדכון סטטוס", f"{video.status} -> {new_status}")
            return True
        finally:
            conn.close()

    def update_video_field(self, video_id: int, field: str, value: str) -> bool:
        """מעדכן שדה ספציפי בסרטון"""
        allowed_fields = {
            "script", "title", "description", "tags", "narration_path",
            "video_path", "thumbnail_path", "youtube_url", "scheduled_date",
            "error_message",
        }
        if field not in allowed_fields:
            return False

        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            conn.execute(
                f"UPDATE videos SET {field} = ?, updated_at = ? WHERE id = ?",
                (value, now, video_id),
            )
            conn.commit()
            self.log_activity(video_id, f"עדכון {field}", f"שדה {field} עודכן")
            return True
        finally:
            conn.close()

    def update_video_fields(self, video_id: int, fields: dict) -> bool:
        """מעדכן מספר שדות בסרטון"""
        allowed_fields = {
            "script", "title", "description", "tags", "narration_path",
            "video_path", "thumbnail_path", "youtube_url", "scheduled_date",
            "error_message", "status",
        }
        fields = {k: v for k, v in fields.items() if k in allowed_fields}
        if not fields:
            return False

        now = datetime.now().isoformat()
        fields["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [video_id]

        conn = self._get_conn()
        try:
            conn.execute(f"UPDATE videos SET {set_clause} WHERE id = ?", values)
            conn.commit()
            self.log_activity(video_id, "עדכון שדות", f"שדות: {', '.join(fields.keys())}")
            return True
        finally:
            conn.close()

    # === יומן פעילות ===

    def log_activity(self, video_id: int = None, action: str = "", details: str = "",
                     success: bool = True, error_message: str = ""):
        """רושם פעולה ביומן הפעילות"""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT INTO activity_log (timestamp, video_id, action, details, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (now, video_id, action, details, 1 if success else 0, error_message))
            conn.commit()
        finally:
            conn.close()

    def get_activity_log(self, video_id: int = None, limit: int = 100) -> list[dict]:
        """מחזיר את יומן הפעילות"""
        conn = self._get_conn()
        try:
            if video_id:
                rows = conn.execute(
                    "SELECT * FROM activity_log WHERE video_id = ? ORDER BY id DESC LIMIT ?",
                    (video_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
                ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    # === מצב שבועי ===

    def save_weekly_state(self, week_number: int, week_date: str, topic_index: int, topic_name: str):
        """שומר את המצב השבועי"""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT INTO weekly_state (week_number, week_date, topic_index, topic_name, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (week_number, week_date, topic_index, topic_name, now))
            conn.commit()
        finally:
            conn.close()

    def get_used_topic_indices(self) -> list[int]:
        """מחזיר את אינדקסי הנושאים שכבר נוצלו"""
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT topic_index FROM weekly_state ORDER BY id").fetchall()
            return [r["topic_index"] for r in rows]
        finally:
            conn.close()

    def get_latest_week_number(self) -> int:
        """מחזיר את מספר השבוע האחרון"""
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT MAX(week_number) as max_week FROM videos").fetchone()
            return row["max_week"] or 0
        finally:
            conn.close()

    # === עזר ===

    def _row_to_video(self, row: sqlite3.Row) -> Video:
        """ממיר שורת DB למודל Video"""
        return Video(
            id=row["id"],
            created_at=row["created_at"],
            week_number=row["week_number"],
            week_date=row["week_date"],
            weekly_topic=row["weekly_topic"],
            video_type=row["video_type"],
            target_audience=row["target_audience"],
            business_goal=row["business_goal"],
            script=row["script"],
            title=row["title"],
            description=row["description"],
            tags=row["tags"],
            status=row["status"],
            youtube_url=row["youtube_url"],
            error_message=row["error_message"],
            updated_at=row["updated_at"],
            narration_path=row["narration_path"],
            video_path=row["video_path"],
            thumbnail_path=row["thumbnail_path"],
            topic_index=row["topic_index"],
            scheduled_date=row["scheduled_date"],
        )
