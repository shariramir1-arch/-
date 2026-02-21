"""
מודול ה: ממשק אישור ידני
שרת Flask עם ממשק לצפייה ואישור סרטונים
"""
from pathlib import Path
from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify
from datetime import datetime

from config.settings import (
    VideoStatus, APPROVAL_SERVER_HOST, APPROVAL_SERVER_PORT,
    BASE_DIR,
)
from core.database import Database
from core.logger import log_action


def create_app(db: Database = None) -> Flask:
    """יוצר את אפליקציית Flask"""
    app = Flask(
        __name__,
        template_folder=str(BASE_DIR / "templates"),
        static_folder=str(BASE_DIR / "static"),
    )
    app.secret_key = "auto-video-approval-secret-key"

    if db is None:
        db = Database()

    # === דף ראשי - דשבורד ===
    @app.route("/")
    def dashboard():
        videos = db.get_all_videos()
        pending = [v for v in videos if v.status == VideoStatus.PENDING_APPROVAL]
        stats = {
            "total": len(videos),
            "pending": len(pending),
            "approved": len([v for v in videos if v.status == VideoStatus.APPROVED]),
            "uploaded": len([v for v in videos if v.status == VideoStatus.UPLOADED]),
            "errors": len([v for v in videos if v.status == VideoStatus.ERROR]),
        }
        return render_template("dashboard.html", videos=videos, pending=pending, stats=stats)

    # === דף סרטון בודד ===
    @app.route("/video/<int:video_id>")
    def video_detail(video_id):
        video = db.get_video(video_id)
        if not video:
            flash("סרטון לא נמצא", "error")
            return redirect(url_for("dashboard"))

        activity = db.get_activity_log(video_id=video_id, limit=20)
        return render_template("video_detail.html", video=video, activity=activity)

    # === צפייה בקובץ וידאו ===
    @app.route("/video/<int:video_id>/stream")
    def stream_video(video_id):
        video = db.get_video(video_id)
        if not video or not video.video_path:
            return "קובץ וידאו לא נמצא", 404

        video_path = Path(video.video_path)
        if not video_path.exists():
            return "קובץ וידאו לא נמצא בדיסק", 404

        return send_file(str(video_path), mimetype="video/mp4")

    # === אישור סרטון ===
    @app.route("/video/<int:video_id>/approve", methods=["POST"])
    def approve_video(video_id):
        video = db.get_video(video_id)
        if not video:
            flash("סרטון לא נמצא", "error")
            return redirect(url_for("dashboard"))

        if video.status != VideoStatus.PENDING_APPROVAL:
            flash(f"לא ניתן לאשר סרטון בסטטוס: {video.status}", "error")
            return redirect(url_for("video_detail", video_id=video_id))

        # תאריך תזמון (אופציונלי)
        scheduled_date = request.form.get("scheduled_date", "")
        if scheduled_date:
            db.update_video_field(video_id, "scheduled_date", scheduled_date)

        success = db.update_video_status(video_id, VideoStatus.APPROVED)
        if success:
            log_action("אישור ידני", "סרטון אושר להעלאה", video_id=video_id)
            flash("הסרטון אושר להעלאה!", "success")
        else:
            flash("שגיאה באישור הסרטון", "error")

        return redirect(url_for("video_detail", video_id=video_id))

    # === החזרה לעריכה ===
    @app.route("/video/<int:video_id>/reject", methods=["POST"])
    def reject_video(video_id):
        video = db.get_video(video_id)
        if not video:
            flash("סרטון לא נמצא", "error")
            return redirect(url_for("dashboard"))

        reason = request.form.get("reason", "לא צוין")
        success = db.update_video_status(video_id, VideoStatus.SCRIPT_READY)
        if success:
            log_action("החזרה לעריכה", f"סיבה: {reason}", video_id=video_id)
            flash("הסרטון הוחזר לעריכה", "info")
        else:
            flash("שגיאה בהחזרה לעריכה", "error")

        return redirect(url_for("video_detail", video_id=video_id))

    # === עצירה/השהיה - העבר לשגיאה ===
    @app.route("/video/<int:video_id>/pause", methods=["POST"])
    def pause_video(video_id):
        video = db.get_video(video_id)
        if not video:
            flash("סרטון לא נמצא", "error")
            return redirect(url_for("dashboard"))

        reason = request.form.get("reason", "הושהה ידנית")
        success = db.update_video_status(video_id, VideoStatus.ERROR, f"הושהה: {reason}")
        if success:
            log_action("השהיית סרטון", f"סיבה: {reason}", video_id=video_id)
            flash("הסרטון הושהה", "warning")
        else:
            flash("שגיאה בהשהיית הסרטון", "error")

        return redirect(url_for("video_detail", video_id=video_id))

    # === יומן פעילות ===
    @app.route("/logs")
    def activity_logs():
        logs = db.get_activity_log(limit=200)
        return render_template("logs.html", logs=logs)

    # === API - סטטוס ===
    @app.route("/api/status")
    def api_status():
        videos = db.get_all_videos()
        return jsonify({
            "total": len(videos),
            "by_status": {
                status: len([v for v in videos if v.status == status])
                for status in VideoStatus.ALL
            },
        })

    return app


def run_approval_server(db: Database = None):
    """מפעיל את שרת האישורים"""
    app = create_app(db)
    log_action("שרת אישורים", f"מופעל על http://{APPROVAL_SERVER_HOST}:{APPROVAL_SERVER_PORT}")
    print(f"\n{'='*60}")
    print(f"  ממשק אישור סרטונים פעיל:")
    print(f"  http://{APPROVAL_SERVER_HOST}:{APPROVAL_SERVER_PORT}")
    print(f"{'='*60}\n")
    app.run(
        host=APPROVAL_SERVER_HOST,
        port=APPROVAL_SERVER_PORT,
        debug=False,
    )
