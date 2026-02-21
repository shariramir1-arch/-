"""
מודול ו: העלאה ותזמון ליוטיוב
מעלה סרטון ליוטיוב עם כותרת, תיאור, תגיות ותזמון
"""
import json
from pathlib import Path
from datetime import datetime

from config.settings import (
    VideoStatus, YOUTUBE_CLIENT_SECRETS_FILE, YOUTUBE_TOKEN_FILE,
    YOUTUBE_SCOPES, YOUTUBE_DEFAULT_PRIVACY,
)
from core.database import Database
from core.models import Video
from core.logger import log_action
from core.retry import retry_operation


class YouTubeUploader:
    """העלאה ותזמון סרטונים ליוטיוב"""

    def __init__(self, db: Database = None):
        self.db = db or Database()
        self._youtube = None

    def _get_authenticated_service(self):
        """מאמת מול YouTube API ומחזיר שירות"""
        if self._youtube:
            return self._youtube

        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = None

        # טעינת טוקן קיים
        if YOUTUBE_TOKEN_FILE.exists():
            creds = Credentials.from_authorized_user_file(
                str(YOUTUBE_TOKEN_FILE), YOUTUBE_SCOPES
            )

        # רענון או יצירת טוקן חדש
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not YOUTUBE_CLIENT_SECRETS_FILE.exists():
                    raise FileNotFoundError(
                        f"קובץ client_secrets.json לא נמצא ב: {YOUTUBE_CLIENT_SECRETS_FILE}\n"
                        "הורד אותו מ-Google Cloud Console ושמור בתיקיית config/"
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    str(YOUTUBE_CLIENT_SECRETS_FILE), YOUTUBE_SCOPES
                )
                creds = flow.run_local_server(port=0)

            # שמירת טוקן
            YOUTUBE_TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            YOUTUBE_TOKEN_FILE.write_text(creds.to_json())

        self._youtube = build("youtube", "v3", credentials=creds)
        return self._youtube

    def upload_video(self, video: Video) -> str:
        """
        מעלה סרטון ליוטיוב.
        מחזיר את ה-URL של הסרטון.
        """
        from googleapiclient.http import MediaFileUpload

        if not video.video_path or not Path(video.video_path).exists():
            raise FileNotFoundError(f"קובץ וידאו לא נמצא: {video.video_path}")

        youtube = self._get_authenticated_service()

        # הכנת מטא-דאטה
        tags = [t.strip() for t in video.tags.split(",") if t.strip()]

        body = {
            "snippet": {
                "title": video.title[:100],  # YouTube מגביל ל-100 תווים
                "description": video.description[:5000],
                "tags": tags[:30],  # YouTube מגביל ל-500 תווים סה"כ
                "categoryId": "28",  # Science & Technology
                "defaultLanguage": "he",
                "defaultAudioLanguage": "he",
            },
            "status": {
                "privacyStatus": YOUTUBE_DEFAULT_PRIVACY,
                "selfDeclaredMadeForKids": False,
            },
        }

        # אם יש תאריך תזמון
        if video.scheduled_date:
            body["status"]["privacyStatus"] = "private"
            body["status"]["publishAt"] = video.scheduled_date

        log_action(
            "העלאה ליוטיוב",
            f"כותרת: {video.title}",
            video_id=video.id,
        )

        # העלאה
        media = MediaFileUpload(
            video.video_path,
            mimetype="video/mp4",
            resumable=True,
            chunksize=1024 * 1024 * 10,  # 10MB chunks
        )

        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                log_action(
                    "התקדמות העלאה",
                    f"{int(status.progress() * 100)}%",
                    video_id=video.id,
                )

        youtube_id = response["id"]
        youtube_url = f"https://www.youtube.com/watch?v={youtube_id}"

        # העלאת תמונת תצוגה
        if video.thumbnail_path and Path(video.thumbnail_path).exists():
            try:
                youtube.thumbnails().set(
                    videoId=youtube_id,
                    media_body=MediaFileUpload(video.thumbnail_path),
                ).execute()
                log_action("תמונת תצוגה הועלתה", video_id=video.id)
            except Exception as e:
                log_action(
                    "שגיאה בהעלאת תמונת תצוגה",
                    video_id=video.id,
                    success=False,
                    error=str(e),
                )

        log_action(
            "סרטון הועלה בהצלחה",
            f"URL: {youtube_url}",
            video_id=video.id,
        )

        return youtube_url

    def upload_approved_videos(self) -> list[Video]:
        """מעלה את כל הסרטונים שאושרו"""
        approved = self.db.get_videos_by_status(VideoStatus.APPROVED)
        uploaded = []

        for video in approved:
            try:
                youtube_url = retry_operation(
                    self.upload_video,
                    action_name="העלאה ליוטיוב",
                    video_id=video.id,
                    video=video,
                )

                self.db.update_video_field(video.id, "youtube_url", youtube_url)

                if video.scheduled_date:
                    self.db.update_video_status(video.id, VideoStatus.SCHEDULED)
                    video.status = VideoStatus.SCHEDULED
                else:
                    self.db.update_video_status(video.id, VideoStatus.UPLOADED)
                    video.status = VideoStatus.UPLOADED

                video.youtube_url = youtube_url
                uploaded.append(video)

            except Exception as e:
                self.db.update_video_status(video.id, VideoStatus.ERROR, str(e))
                log_action(
                    "שגיאה בהעלאה ליוטיוב",
                    video_id=video.id,
                    success=False,
                    error=str(e),
                )

        return uploaded

    def check_upload_status(self, video: Video) -> dict:
        """בודק סטטוס של סרטון ביוטיוב"""
        if not video.youtube_url:
            return {"status": "not_uploaded"}

        try:
            youtube = self._get_authenticated_service()
            youtube_id = video.youtube_url.split("v=")[-1]

            response = youtube.videos().list(
                part="status,statistics",
                id=youtube_id,
            ).execute()

            if response["items"]:
                item = response["items"][0]
                return {
                    "status": item["status"]["uploadStatus"],
                    "privacy": item["status"]["privacyStatus"],
                    "views": item["statistics"].get("viewCount", 0),
                    "likes": item["statistics"].get("likeCount", 0),
                    "comments": item["statistics"].get("commentCount", 0),
                }
            return {"status": "not_found"}

        except Exception as e:
            return {"status": "error", "error": str(e)}
