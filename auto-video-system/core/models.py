"""
מודלים - מבני נתונים למערכת הסרטונים
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Video:
    """מייצג סרטון במערכת"""
    id: Optional[int] = None
    created_at: str = ""
    week_number: int = 0
    week_date: str = ""
    weekly_topic: str = ""
    video_type: str = ""          # ארוך / בינוני / קצר
    target_audience: str = ""
    business_goal: str = ""
    script: str = ""
    title: str = ""
    description: str = ""
    tags: str = ""
    status: str = "רעיון"
    youtube_url: str = ""
    error_message: str = ""
    updated_at: str = ""
    narration_path: str = ""
    video_path: str = ""
    thumbnail_path: str = ""
    topic_index: int = -1          # אינדקס הנושא ברשימת הנושאים
    scheduled_date: str = ""       # תאריך תזמון ליוטיוב

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()


@dataclass
class ActivityLog:
    """רשומת יומן פעילות"""
    id: Optional[int] = None
    timestamp: str = ""
    video_id: Optional[int] = None
    action: str = ""
    details: str = ""
    success: bool = True
    error_message: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class WeeklyPlan:
    """תכנית שבועית"""
    week_number: int = 0
    week_date: str = ""
    topic_index: int = -1
    topic_name: str = ""
    videos: list = field(default_factory=list)
