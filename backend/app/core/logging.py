"""
Structured logging configuration using structlog.
"""

import logging
import sys
from typing import Any

import structlog

from app.config import settings


def setup_logging() -> None:
    """Configure structured logging for the application."""
    
    # Determine log level
    log_level = logging.DEBUG if settings.APP_DEBUG else logging.INFO
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    
    # Shared processors
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.ExtraAdder(),
    ]
    
    # Configure structlog
    if settings.is_production:
        # JSON format for production
        structlog.configure(
            processors=shared_processors + [
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        # Pretty console output for development
        structlog.configure(
            processors=shared_processors + [
                structlog.dev.ConsoleRenderer(colors=True),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Get a logger instance for the given name.
    
    Args:
        name: The logger name (usually __name__)
        
    Returns:
        A configured structlog logger
    """
    return structlog.get_logger(name)


def log_with_context(logger: Any, level: str, event: str, **kwargs) -> None:
    """
    Log with additional context.
    
    Args:
        logger: The logger instance
        level: Log level (info, warning, error, etc.)
        event: The event name
        **kwargs: Additional context
    """
    log_method = getattr(logger, level, logger.info)
    
    # Filter out sensitive data
    safe_kwargs = {
        k: v for k, v in kwargs.items()
        if k not in ("password", "token", "api_key", "secret")
    }
    
    log_method(event, **safe_kwargs)
