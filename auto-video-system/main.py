#!/usr/bin/env python3
"""
מערכת יצירת סרטונים אוטומטית עם אישור לפני העלאה ליוטיוב
===================================================================
קובץ ראשי - נקודת כניסה למערכת

מצבי עבודה:
1. create   - יצירת תוכן לשבוע הבא (נושא + 3 תסריטים)
2. produce  - הפקת וידאו לכל סרטון מוכן
3. upload   - העלאה ליוטיוב (רק סרטונים מאושרים)
4. approve  - הפעלת ממשק אישור ידני (שרת וב)
5. run-once - הרצה מלאה: יצירה + הפקה + עצירה לאישור
6. daily    - בדיקה יומית: בודק מה צריך לעשות ומבצע
7. status   - הצגת סטטוס נוכחי
"""
import sys
import argparse
from datetime import datetime

from config.settings import ensure_directories, VideoStatus
from core.database import Database
from core.logger import log_action, logger
from modules.topic_generator import TopicGenerator
from modules.script_generator import ScriptGenerator
from modules.narration_generator import NarrationGenerator
from modules.video_generator import VideoGenerator
from modules.youtube_uploader import YouTubeUploader
from modules.approval_ui import run_approval_server


def cmd_create(db: Database):
    """מצב 1: יצירת תוכן לשבוע הבא"""
    print("\n=== יצירת תוכן שבועי ===\n")
    log_action("התחלת יצירת תוכן שבועי")

    # שלב 1: בחירת נושא ויצירת סרטונים
    topic_gen = TopicGenerator(db)
    videos = topic_gen.generate_weekly_content()
    print(f"נוצרו {len(videos)} סרטונים חדשים:")
    for v in videos:
        print(f"  [{v.id}] {v.video_type}: {v.title}")

    # שלב 2: יצירת תסריטים
    print("\nמייצר תסריטים...")
    script_gen = ScriptGenerator(db)
    updated = script_gen.generate_scripts_for_week(videos)
    print(f"נוצרו {len(updated)} תסריטים")

    log_action("סיום יצירת תוכן שבועי", f"נוצרו {len(updated)} תסריטים")
    print("\nסיום! כעת הרץ 'produce' להפקת הסרטונים.")


def cmd_produce(db: Database):
    """מצב 2: הפקת וידאו לכל סרטון מוכן"""
    print("\n=== הפקת סרטונים ===\n")
    log_action("התחלת הפקת סרטונים")

    # שלב 1: קריינות
    script_ready = db.get_videos_by_status(VideoStatus.SCRIPT_READY)
    if script_ready:
        print(f"מייצר קריינות ל-{len(script_ready)} סרטונים...")
        narr_gen = NarrationGenerator(db)
        narrated = narr_gen.generate_narrations_for_videos(script_ready)
        print(f"נוצרו {len(narrated)} קריינויות")
    else:
        print("אין סרטונים עם תסריט מוכן")
        narrated = []

    # שלב 2: יצירת וידאו
    in_production = db.get_videos_by_status(VideoStatus.IN_PRODUCTION)
    if in_production:
        print(f"\nמייצר וידאו ל-{len(in_production)} סרטונים...")
        vid_gen = VideoGenerator(db)
        produced = vid_gen.produce_videos(in_production)
        print(f"נוצרו {len(produced)} סרטונים")
        for v in produced:
            print(f"  [{v.id}] {v.title} -> ממתין לאישור")
    else:
        print("אין סרטונים בהפקה")

    log_action("סיום הפקת סרטונים")
    print("\nסיום! כעת הרץ 'approve' לפתיחת ממשק האישור.")


def cmd_upload(db: Database):
    """מצב 3: העלאה ליוטיוב (רק סרטונים מאושרים)"""
    print("\n=== העלאה ליוטיוב ===\n")

    approved = db.get_videos_by_status(VideoStatus.APPROVED)
    if not approved:
        print("אין סרטונים מאושרים להעלאה.")
        return

    print(f"נמצאו {len(approved)} סרטונים מאושרים להעלאה:")
    for v in approved:
        print(f"  [{v.id}] {v.title}")

    log_action("התחלת העלאה ליוטיוב", f"{len(approved)} סרטונים")

    uploader = YouTubeUploader(db)
    uploaded = uploader.upload_approved_videos()

    print(f"\nהועלו {len(uploaded)} סרטונים:")
    for v in uploaded:
        print(f"  [{v.id}] {v.title} -> {v.youtube_url}")

    log_action("סיום העלאה ליוטיוב", f"הועלו {len(uploaded)} סרטונים")


def cmd_approve(db: Database):
    """מצב 4: הפעלת ממשק אישור ידני"""
    pending = db.get_videos_by_status(VideoStatus.PENDING_APPROVAL)
    print(f"\nיש {len(pending)} סרטונים ממתינים לאישור.")
    run_approval_server(db)


def cmd_run_once(db: Database):
    """מצב 5: הרצה מלאה - יצירה + הפקה + עצירה לאישור"""
    print("\n=== הרצה מלאה ===\n")
    log_action("התחלת הרצה מלאה")

    # יצירת תוכן
    cmd_create(db)

    # הפקת סרטונים
    cmd_produce(db)

    # הצגת סטטוס
    cmd_status(db)

    print("\n" + "=" * 60)
    print("  ההרצה הושלמה!")
    print("  הסרטונים ממתינים לאישור שלך.")
    print("  הרץ 'approve' לפתיחת ממשק האישור.")
    print("=" * 60)

    log_action("סיום הרצה מלאה")


def cmd_daily(db: Database):
    """מצב 6: בדיקה יומית"""
    print("\n=== בדיקה יומית ===\n")
    log_action("בדיקה יומית")

    # בדיקה אם צריך ליצור תוכן חדש
    latest_week = db.get_latest_week_number()
    current_week_videos = db.get_videos_by_week(latest_week) if latest_week else []

    needs_creation = latest_week == 0 or all(
        v.status in [VideoStatus.UPLOADED, VideoStatus.SCHEDULED]
        for v in current_week_videos
    )

    if needs_creation:
        print("צריך ליצור תוכן חדש לשבוע הבא.")
        cmd_create(db)

    # בדיקה אם יש תסריטים להפקה
    script_ready = db.get_videos_by_status(VideoStatus.SCRIPT_READY)
    in_production = db.get_videos_by_status(VideoStatus.IN_PRODUCTION)
    if script_ready or in_production:
        print("יש סרטונים להפקה.")
        cmd_produce(db)

    # בדיקה אם יש סרטונים מאושרים להעלאה
    approved = db.get_videos_by_status(VideoStatus.APPROVED)
    if approved:
        print("יש סרטונים מאושרים להעלאה.")
        cmd_upload(db)

    # סטטוס
    cmd_status(db)

    log_action("סיום בדיקה יומית")


def cmd_status(db: Database):
    """מצב 7: הצגת סטטוס נוכחי"""
    print("\n=== סטטוס מערכת ===\n")

    videos = db.get_all_videos()

    if not videos:
        print("אין סרטונים במערכת. הרץ 'create' ליצירת תוכן.")
        return

    # סטטיסטיקות
    status_counts = {}
    for v in videos:
        status_counts[v.status] = status_counts.get(v.status, 0) + 1

    print(f"סה\"כ סרטונים: {len(videos)}")
    print(f"{'סטטוס':<20} {'כמות':>5}")
    print("-" * 30)
    for status in VideoStatus.ALL:
        count = status_counts.get(status, 0)
        if count > 0:
            print(f"{status:<20} {count:>5}")

    # שבוע אחרון
    latest_week = db.get_latest_week_number()
    if latest_week:
        print(f"\n--- שבוע {latest_week} ---")
        week_videos = db.get_videos_by_week(latest_week)
        for v in week_videos:
            yt = f" | YT: {v.youtube_url}" if v.youtube_url else ""
            print(f"  [{v.id}] {v.video_type}: {v.title[:50]} | {v.status}{yt}")


def main():
    parser = argparse.ArgumentParser(
        description="מערכת יצירת סרטונים אוטומטית",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
מצבי עבודה:
  create    יצירת תוכן לשבוע הבא (נושא + 3 תסריטים)
  produce   הפקת וידאו (קריינות + וידאו)
  upload    העלאה ליוטיוב (רק מאושרים)
  approve   ממשק אישור ידני (שרת וב)
  run-once  הרצה מלאה: יצירה + הפקה + עצירה לאישור
  daily     בדיקה יומית אוטומטית
  status    הצגת סטטוס נוכחי

דוגמאות:
  python main.py create          # יצירת תוכן שבועי
  python main.py produce         # הפקת סרטונים
  python main.py approve         # פתיחת ממשק אישור
  python main.py upload          # העלאה ליוטיוב
  python main.py run-once        # הרצה מלאה
  python main.py daily           # בדיקה יומית
  python main.py status          # סטטוס
        """,
    )
    parser.add_argument(
        "mode",
        choices=["create", "produce", "upload", "approve", "run-once", "daily", "status"],
        help="מצב עבודה",
    )

    args = parser.parse_args()

    # אתחול
    ensure_directories()
    db = Database()

    print(f"מערכת סרטונים אוטומטית | {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"מצב: {args.mode}")

    commands = {
        "create": cmd_create,
        "produce": cmd_produce,
        "upload": cmd_upload,
        "approve": cmd_approve,
        "run-once": cmd_run_once,
        "daily": cmd_daily,
        "status": cmd_status,
    }

    try:
        commands[args.mode](db)
    except KeyboardInterrupt:
        print("\nנעצר על ידי המשתמש.")
        log_action("עצירה ידנית", f"מצב: {args.mode}")
    except Exception as e:
        logger.error(f"שגיאה קריטית: {e}", exc_info=True)
        log_action("שגיאה קריטית", success=False, error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
