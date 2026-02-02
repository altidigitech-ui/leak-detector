"""
Scraping service using Playwright.
Captures HTML content and screenshots of landing pages.
"""

import asyncio
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

from app.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger

logger = get_logger(__name__)

# Constants
VIEWPORT_WIDTH = 1280
VIEWPORT_HEIGHT = 800
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/121.0.0.0 Safari/537.36"
)


class ScrapingError(AppError):
    """Base error for scraping failures."""
    def __init__(self, message: str, code: str = "SCRAPING_ERROR"):
        super().__init__(code=code, message=message, status_code=400)


class PageNotFoundError(ScrapingError):
    """Page returned 404."""
    def __init__(self):
        super().__init__(message="Page not found (404)", code="PAGE_NOT_FOUND")


class PageTimeoutError(ScrapingError):
    """Page took too long to load."""
    def __init__(self):
        super().__init__(
            message=f"Page took too long to load (>{settings.PLAYWRIGHT_TIMEOUT // 1000}s)",
            code="PAGE_TIMEOUT"
        )


class PageBlockedError(ScrapingError):
    """Access to page was blocked."""
    def __init__(self):
        super().__init__(message="Access denied (403)", code="PAGE_BLOCKED")


@dataclass
class ScrapedPage:
    """Result of a page scrape."""
    url: str
    final_url: str
    title: str
    meta_description: Optional[str]
    html: str
    text_content: str
    screenshot: bytes
    load_time_ms: int
    word_count: int
    image_count: int
    link_count: int
    has_form: bool


def _extract_domain(url: str) -> str:
    """Extract domain from URL for logging."""
    parsed = urlparse(url)
    return parsed.netloc


async def scrape_page(url: str) -> ScrapedPage:
    """
    Scrape a landing page and capture its content.
    
    Args:
        url: The URL to scrape (must be valid HTTP/HTTPS)
        
    Returns:
        ScrapedPage with all extracted data
        
    Raises:
        PageNotFoundError: If page returns 404
        PageTimeoutError: If page takes too long to load
        PageBlockedError: If access is denied
        ScrapingError: For other scraping failures
    """
    domain = _extract_domain(url)
    logger.info("scraping_started", url_domain=domain)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        try:
            context = await browser.new_context(
                viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
                user_agent=USER_AGENT,
            )
            page = await context.new_page()
            
            # Track load time
            start_time = asyncio.get_event_loop().time()
            
            try:
                response = await page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=settings.PLAYWRIGHT_TIMEOUT,
                )
            except PlaywrightTimeout:
                logger.warning("scraping_timeout", url_domain=domain)
                raise PageTimeoutError()
            
            load_time_ms = int((asyncio.get_event_loop().time() - start_time) * 1000)
            
            # Check response status
            if response is None:
                raise ScrapingError("No response received from page")
            
            status = response.status
            if status == 404:
                raise PageNotFoundError()
            elif status == 403:
                raise PageBlockedError()
            elif status >= 400:
                raise ScrapingError(f"Page returned error status {status}")
            
            # Extract data
            final_url = page.url
            title = await page.title() or ""
            
            # Meta description
            meta_description = await page.evaluate("""
                () => {
                    const meta = document.querySelector('meta[name="description"]');
                    return meta ? meta.getAttribute('content') : null;
                }
            """)
            
            # HTML content
            html = await page.content()
            
            # Text content (visible text only)
            text_content = await page.evaluate("""
                () => {
                    return document.body ? document.body.innerText : '';
                }
            """)
            
            # Statistics
            stats = await page.evaluate("""
                () => {
                    const text = document.body ? document.body.innerText : '';
                    const words = text.split(/\\s+/).filter(w => w.length > 0);
                    const images = document.querySelectorAll('img');
                    const links = document.querySelectorAll('a');
                    const forms = document.querySelectorAll('form');
                    
                    return {
                        wordCount: words.length,
                        imageCount: images.length,
                        linkCount: links.length,
                        hasForm: forms.length > 0
                    };
                }
            """)
            
            # Screenshot
            screenshot = await page.screenshot(
                full_page=True,
                type="png",
            )
            
            logger.info(
                "scraping_completed",
                url_domain=domain,
                load_time_ms=load_time_ms,
                word_count=stats["wordCount"],
            )
            
            return ScrapedPage(
                url=url,
                final_url=final_url,
                title=title,
                meta_description=meta_description,
                html=html,
                text_content=text_content,
                screenshot=screenshot,
                load_time_ms=load_time_ms,
                word_count=stats["wordCount"],
                image_count=stats["imageCount"],
                link_count=stats["linkCount"],
                has_form=stats["hasForm"],
            )
            
        except (PageNotFoundError, PageTimeoutError, PageBlockedError):
            raise
        except Exception as e:
            logger.error("scraping_error", url_domain=domain, error=str(e))
            raise ScrapingError(f"Failed to scrape page: {str(e)}")
        finally:
            await browser.close()


def summarize_html(html: str, max_length: int = 5000) -> str:
    """
    Create a summarized version of HTML for the LLM prompt.
    Removes scripts, styles, and truncates if needed.
    """
    import re
    
    # Remove script and style tags
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove comments
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    
    # Remove excessive whitespace
    html = re.sub(r'\s+', ' ', html)
    
    # Truncate if needed
    if len(html) > max_length:
        html = html[:max_length] + "... [truncated]"
    
    return html
