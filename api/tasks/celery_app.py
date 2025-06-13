"""
Celery application configuration for ThinkDocs.
Handles background tasks like document processing and embedding generation.
"""

import os
import logging
from celery import Celery
from kombu import Queue

logger = logging.getLogger(__name__)

# PRODUCTION FIX: Robust configuration loading with fallbacks
def get_celery_config():
    """
    Production-grade configuration loading with comprehensive error handling.
    Prevents Celery worker startup failures due to configuration issues.
    """
    try:
        from api.config import settings
        return {
            'broker_url': settings.redis.redis_url,
            'result_backend': settings.redis.redis_url,
            'debug': getattr(settings, 'debug', False)
        }
    except Exception as e:
        logger.warning(f"Failed to load full settings, using environment fallbacks: {e}")

        # FALLBACK: Direct environment variable access
        redis_url = os.getenv("REDIS__REDIS_URL", "redis://redis:6379/0")
        debug_mode = os.getenv("DEBUG", "true").lower() == "true"

        return {
            'broker_url': redis_url,
            'result_backend': redis_url,
            'debug': debug_mode
        }

# Load configuration safely
config = get_celery_config()

# Create Celery instance with robust configuration
celery_app = Celery(
    "thinkdocs",
    broker=config['broker_url'],
    backend=config['result_backend'],
    include=["api.tasks.document_tasks"]
)

# PRODUCTION CONFIGURATION: Comprehensive Celery settings
celery_app.conf.update(
    # Task routing - Production queue organization
    task_routes={
        "api.tasks.document_tasks.*": {"queue": "documents"},
        "api.tasks.embedding_tasks.*": {"queue": "embeddings"},
    },

    # Queue configuration - Production-ready queues
    task_default_queue="default",
    task_queues=(
        Queue("default", durable=True),
        Queue("documents", durable=True),
        Queue("embeddings", durable=True),
    ),

    # Task execution - Production reliability settings
    task_always_eager=config['debug'],  # Only eager in debug mode
    task_eager_propagates=True,
    task_ignore_result=False,
    result_expires=3600,  # 1 hour result retention

    # PRODUCTION RELIABILITY: Advanced task configuration
    task_acks_late=True,  # Acknowledge tasks only after completion
    task_reject_on_worker_lost=True,  # Reject tasks when worker dies
    task_track_started=True,  # Track task start events

    # Worker configuration - Production performance
    worker_prefetch_multiplier=1,  # One task at a time for reliability
    worker_max_tasks_per_child=1000,  # Restart workers periodically
    worker_disable_rate_limits=False,  # Enable rate limiting

    # PRODUCTION RETRY POLICY: Intelligent retry handling
    task_default_retry_delay=60,  # Wait 60s before retry
    task_max_retries=3,  # Maximum 3 retries
    task_soft_time_limit=300,  # 5 minute soft timeout
    task_time_limit=360,  # 6 minute hard timeout

    # Serialization - Production security
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # PRODUCTION MONITORING: Comprehensive observability
    worker_send_task_events=True,
    task_send_sent_event=True,
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] [CELERY] %(message)s",

    # PRODUCTION ERROR HANDLING: Robust error management
    task_annotations={
        '*': {
            'rate_limit': '10/s',  # 10 tasks per second max
            'time_limit': 360,     # 6 minute timeout
            'soft_time_limit': 300, # 5 minute soft timeout
        },
        'api.tasks.document_tasks.process_document': {
            'rate_limit': '5/s',   # Document processing: 5/second
            'time_limit': 600,     # 10 minute timeout for large docs
            'soft_time_limit': 540, # 9 minute soft timeout
            'autoretry_for': (Exception,),
            'retry_kwargs': {'max_retries': 3, 'countdown': 60},
        }
    }
)

logger.info(f"Celery configured with broker: {config['broker_url']}")
logger.info(f"Debug mode: {config['debug']}")

# Auto-discover tasks
celery_app.autodiscover_tasks()
