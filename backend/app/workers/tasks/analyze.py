"""
Analysis task - Main Celery task for analyzing landing pages.
"""

import asyncio
from typing import Any, Dict

from celery import current_task

from app.workers.celery import celery_app
from app.services.supabase import get_supabase_service
from app.services.scraper import scrape_page, ScrapingError
from app.services.analyzer import analyze_page
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    soft_time_limit=60,
    time_limit=90,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def analyze_page_task(self, analysis_id: str) -> Dict[str, Any]:
    """
    Main task for analyzing a landing page.
    
    Steps:
    1. Fetch analysis record from DB
    2. Update status to 'processing'
    3. Scrape the page (Playwright)
    4. Upload screenshot to storage
    5. Analyze with Claude API
    6. Create report in DB
    7. Update analysis status to 'completed'
    
    Args:
        analysis_id: UUID of the analysis record
        
    Returns:
        Dict with report_id and score
    """
    logger.info("task_started", analysis_id=analysis_id, task_id=self.request.id)
    
    # Run async code in sync context
    return asyncio.run(_analyze_page_async(self, analysis_id))


async def _analyze_page_async(task, analysis_id: str) -> Dict[str, Any]:
    """Async implementation of the analysis task."""
    
    supabase = get_supabase_service()
    
    try:
        # 1. Fetch analysis record
        analysis = await supabase.get_analysis_by_id(analysis_id)
        if not analysis:
            logger.error("analysis_not_found", analysis_id=analysis_id)
            return {"error": "Analysis not found"}
        
        url = analysis["url"]
        logger.info("processing_url", analysis_id=analysis_id, url=url)
        
        # 2. Update status to processing
        await supabase.update_analysis_status(analysis_id, "processing")
        
        # 3. Scrape the page
        try:
            scraped = await scrape_page(url)
        except ScrapingError as e:
            logger.warning("scraping_failed", analysis_id=analysis_id, error=str(e))
            await supabase.update_analysis_status(
                analysis_id,
                status="failed",
                error_code=e.code,
                error_message=e.message,
            )
            return {"error": e.message, "code": e.code}
        
        # 4. Upload screenshot
        screenshot_url = None
        try:
            screenshot_url = await supabase.upload_screenshot(
                analysis_id,
                scraped.screenshot,
            )
            logger.info("screenshot_uploaded", analysis_id=analysis_id)
        except Exception as e:
            logger.warning("screenshot_upload_failed", error=str(e))
            # Continue without screenshot
        
        # 5. Analyze with Claude
        try:
            result = await analyze_page(scraped)
        except Exception as e:
            logger.error("analysis_failed", analysis_id=analysis_id, error=str(e))
            await supabase.update_analysis_status(
                analysis_id,
                status="failed",
                error_code="ANALYSIS_FAILED",
                error_message=str(e),
            )
            raise  # Retry
        
        # 6. Create report
        report = await supabase.create_report(
            analysis_id=analysis_id,
            score=result["score"],
            summary=result["summary"],
            categories=result["categories"],
            screenshot_url=screenshot_url,
            page_metadata={
                "title": scraped.title,
                "load_time_ms": scraped.load_time_ms,
                "word_count": scraped.word_count,
                "image_count": scraped.image_count,
            },
        )
        
        # 7. Update analysis status to completed
        await supabase.update_analysis_status(analysis_id, "completed")
        
        logger.info(
            "task_completed",
            analysis_id=analysis_id,
            report_id=report["id"],
            score=result["score"],
        )
        
        return {
            "report_id": report["id"],
            "score": result["score"],
        }
        
    except Exception as e:
        logger.error(
            "task_error",
            analysis_id=analysis_id,
            error=str(e),
            retry=task.request.retries,
        )
        
        # Update status to failed if max retries reached
        if task.request.retries >= task.max_retries:
            await supabase.update_analysis_status(
                analysis_id,
                status="failed",
                error_code="ANALYSIS_FAILED",
                error_message=f"Task failed after {task.max_retries} retries: {str(e)}",
            )
        
        raise


# Alias for cleaner imports
analyze_page = analyze_page_task
