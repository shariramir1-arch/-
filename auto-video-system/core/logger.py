"""
מודול ז: יומן פעילות ושגיאות
כל פעולה נרשמת ביומן + קובץ לוג
"""
import logging
from datetime import datetime
from pathlib import Path
from config.settings import LOGS_DIR, ensure_directories


def setup_logging():
    """מגדיר את מערכת הלוגים"""
    ensure_directories()

    log_file = LOGS_DIR / f"activity_{datetime.now().strftime('%Y_%m_%d')}.log"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
    return logging.getLogger("auto-video")


logger = setup_logging()


def log_action(action: str, details: str = "", video_id: int = None, success: bool = True, error: str = ""):
    """רושם פעולה ביומן"""
    prefix = f"[Video #{video_id}] " if video_id else ""
    message = f"{prefix}{action}"
    if details:
        message += f" | {details}"

    if success:
        logger.info(message)
    else:
        logger.error(f"{message} | ERROR: {error}")

    return {
        "timestamp": datetime.now().isoformat(),
        "video_id": video_id,
        "action": action,
        "details": details,
        "success": success,
        "error_message": error,
    }
