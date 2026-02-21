"""
מנגנון ניסיון חוזר אוטומטי
עד 3 ניסיונות עם השהיה בין ניסיונות
"""
import time
import functools
from core.logger import log_action
from config.settings import MAX_RETRIES, RETRY_DELAY_SECONDS


def with_retry(action_name: str = "", video_id: int = None):
    """
    דקורטור שמבצע ניסיון חוזר אוטומטי.
    עד MAX_RETRIES ניסיונות עם RETRY_DELAY_SECONDS השהיה.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            name = action_name or func.__name__
            last_error = None

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    result = func(*args, **kwargs)
                    if attempt > 1:
                        log_action(
                            name,
                            f"הצליח בניסיון {attempt}",
                            video_id=video_id,
                        )
                    return result
                except Exception as e:
                    last_error = e
                    log_action(
                        name,
                        f"ניסיון {attempt}/{MAX_RETRIES} נכשל",
                        video_id=video_id,
                        success=False,
                        error=str(e),
                    )
                    if attempt < MAX_RETRIES:
                        delay = RETRY_DELAY_SECONDS * attempt
                        log_action(name, f"ממתין {delay} שניות לפני ניסיון חוזר")
                        time.sleep(delay)

            # כל הניסיונות נכשלו
            log_action(
                name,
                f"כל {MAX_RETRIES} הניסיונות נכשלו",
                video_id=video_id,
                success=False,
                error=str(last_error),
            )
            raise last_error

        return wrapper
    return decorator


def retry_operation(func, action_name: str = "", video_id: int = None, *args, **kwargs):
    """
    גרסה פונקציונלית (לא דקורטור) של ניסיון חוזר.
    שימושי כשצריך ליצור retry דינמית.
    """
    name = action_name or func.__name__
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = func(*args, **kwargs)
            if attempt > 1:
                log_action(name, f"הצליח בניסיון {attempt}", video_id=video_id)
            return result
        except Exception as e:
            last_error = e
            log_action(
                name,
                f"ניסיון {attempt}/{MAX_RETRIES} נכשל",
                video_id=video_id,
                success=False,
                error=str(e),
            )
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY_SECONDS * attempt
                time.sleep(delay)

    raise last_error
