"""
מודול א: מחולל נושא שבועי
בוחר נושא רחב מתוך רשימה מוגדרת מראש
בונה 3 תתי-נושאים שמתאימים לשלושת סוגי הסרטונים
"""
from datetime import datetime, timedelta

from config.topics import WEEKLY_TOPICS, get_next_topic
from config.settings import VideoStatus, VideoType, ensure_directories
from core.database import Database
from core.models import Video
from core.logger import log_action


class TopicGenerator:
    """מחולל נושאים שבועיים"""

    def __init__(self, db: Database = None):
        self.db = db or Database()

    def generate_weekly_content(self) -> list[Video]:
        """
        יוצר תוכן לשבוע הבא:
        1. בוחר נושא שבועי
        2. יוצר 3 רשומות סרטונים במסד הנתונים
        3. מחזיר רשימת סרטונים שנוצרו
        """
        ensure_directories()

        # קבלת מספר שבוע חדש
        last_week = self.db.get_latest_week_number()
        new_week = last_week + 1
        week_date = datetime.now().strftime("%Y-%m-%d")

        # בחירת נושא שלא נעשה בו שימוש
        used_indices = self.db.get_used_topic_indices()
        topic_index, topic = get_next_topic(used_indices)

        log_action(
            "בחירת נושא שבועי",
            f"שבוע {new_week}: {topic['name']} (אינדקס {topic_index})",
        )

        # שמירת מצב שבועי
        self.db.save_weekly_state(new_week, week_date, topic_index, topic["name"])

        # יצירת 3 סרטונים
        created_videos = []
        for video_type in VideoType.ALL:
            subtopic = topic["subtopics"].get(video_type, "")

            video = Video(
                week_number=new_week,
                week_date=week_date,
                weekly_topic=topic["name"],
                video_type=video_type,
                target_audience=topic["target_audience"],
                business_goal=topic["business_goal"],
                title=subtopic,
                status=VideoStatus.IDEA,
                topic_index=topic_index,
            )

            video_id = self.db.create_video(video)
            video.id = video_id
            created_videos.append(video)

            log_action(
                "יצירת סרטון",
                f"סוג: {video_type}, כותרת: {subtopic}",
                video_id=video_id,
            )

        log_action(
            "סיום יצירת תוכן שבועי",
            f"נוצרו {len(created_videos)} סרטונים לשבוע {new_week}",
        )

        return created_videos

    def get_current_week_videos(self) -> list[Video]:
        """מחזיר את סרטוני השבוע הנוכחי"""
        current_week = self.db.get_latest_week_number()
        if current_week == 0:
            return []
        return self.db.get_videos_by_week(current_week)

    def get_topic_info(self, topic_index: int) -> dict:
        """מחזיר מידע על נושא לפי אינדקס"""
        if 0 <= topic_index < len(WEEKLY_TOPICS):
            return WEEKLY_TOPICS[topic_index]
        return {}
